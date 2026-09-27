import "server-only";
/**
 * Polygon.io adapters (market data, options chains, news). Polygon is one
 * licensed option; any vendor can be added by implementing providers/types.ts.
 * Data availability depends on your Polygon plan and exchange entitlements —
 * fields the plan doesn't include are returned as null ("Data unavailable").
 */
import { UNIVERSE, lookupSymbol, SECTOR_ETFS } from "@/config/universe";
import { fetchJson, HttpError } from "@/lib/http";
import { marketStatusLabel, nextSessionChange, currentSessionDate, tradingDaysBack, addDays, nyTimeToUnix } from "@/lib/market-time";
import { classifyHeadline } from "@/lib/news-classify";
import { fail, ok, type DataMeta, type DataResult } from "@/types/data";
import type {
  AssetClass,
  Bar,
  BreadthSnapshot,
  HistoryInterval,
  HistoryRange,
  MarketStatus,
  MoverKind,
  MoverRow,
  Quote,
  SectorPerformance,
  SymbolInfo,
} from "@/types/market";
import type { FlowFilter, FlowSide, OptionChain, OptionContract, OptionRight, OptionsFlowPrint } from "@/types/options";
import type { NewsArticle, NewsFilter } from "@/types/news";
import { healthy, meta, unhealthy } from "../meta";
import { classifyIntent, classifySentiment, classifySide, groupOrders, type RawTrade } from "./flow";
import type { MarketDataProvider, NewsProvider, OptionsDataProvider } from "../types";

const BASE = process.env.MARKET_DATA_BASE_URL ?? "https://api.polygon.io";
const LABEL = "Polygon.io";

/** NSALGO symbol → Polygon ticker. `null` = not covered by this adapter. */
const SYMBOL_MAP: Record<string, string | null> = {
  SPX: "I:SPX",
  NDX: "I:NDX",
  COMP: "I:COMP",
  DJI: "I:DJI",
  RUT: "I:RUT",
  VIX: "I:VIX",
  BTCUSD: "X:BTCUSD",
  ETHUSD: "X:ETHUSD",
  SOLUSD: "X:SOLUSD",
  EURUSD: "C:EURUSD",
  USDJPY: "C:USDJPY",
  GBPUSD: "C:GBPUSD",
  // Not provided through this adapter; configure a futures/rates vendor.
  DXY: null,
  ES: null,
  NQ: null,
  YM: null,
  RTY: null,
  US2Y: null,
  US10Y: null,
  US30Y: null,
  GC: null,
  SI: null,
  CL: null,
  NG: null,
  HG: null,
};

export function toPolygon(symbol: string): string | null {
  const s = symbol.toUpperCase();
  return s in SYMBOL_MAP ? (SYMBOL_MAP[s] ?? null) : s;
}

function fromPolygon(ticker: string): string {
  const entry = Object.entries(SYMBOL_MAP).find(([, v]) => v === ticker);
  return entry ? entry[0] : ticker.replace(/^[A-Z]:/, "");
}

class PolygonClient {
  constructor(
    private apiKey: string,
    private delayMinutes: number,
  ) {}
  async get<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${BASE}${path}`);
    for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
    return fetchJson<T>(url.toString(), { headers: { Authorization: `Bearer ${this.apiKey}` }, timeoutMs: 8000, retries: 1 });
  }
  meta(asOf?: string): DataMeta {
    return meta("polygon", LABEL, this.delayMinutes > 0 ? "delayed" : "live", asOf, this.delayMinutes > 0 ? { delayMinutes: this.delayMinutes } : undefined);
  }
}

function errorResult<T>(err: unknown): DataResult<T> {
  if (err instanceof HttpError) {
    if (err.status === 401 || err.status === 403) return fail("PROVIDER_NOT_CONFIGURED", "Market data provider rejected credentials or plan entitlement.");
    if (err.status === 404) return fail("NOT_FOUND", "Not found at provider.");
    if (err.status === 429) return fail("RATE_LIMITED", "Market data provider rate limit reached.");
  }
  return fail("PROVIDER_UNAVAILABLE", "Market data provider temporarily unavailable.");
}

interface UniversalSnapshot {
  results?: {
    ticker: string;
    name?: string;
    type?: string;
    value?: number;
    last_updated?: number;
    market_status?: string;
    session?: {
      change?: number;
      change_percent?: number;
      open?: number;
      high?: number;
      low?: number;
      close?: number;
      previous_close?: number;
      volume?: number;
      price?: number;
    };
    last_trade?: { price?: number; sip_timestamp?: number };
    error?: string;
  }[];
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export class PolygonMarketDataProvider implements MarketDataProvider {
  readonly id = "polygon";
  readonly label = LABEL;
  readonly isMock = false;
  private c: PolygonClient;
  constructor(apiKey: string, delayMinutes: number) {
    this.c = new PolygonClient(apiKey, delayMinutes);
  }

  async healthCheck() {
    const t = Date.now();
    try {
      await this.c.get("/v1/marketstatus/now");
      return healthy("Operational", Date.now() - t);
    } catch (e) {
      return unhealthy((e as Error).message, Date.now() - t);
    }
  }

  async getQuotes(symbols: string[]): Promise<DataResult<Quote[]>> {
    const mapped = symbols.map((s) => ({ s: s.toUpperCase(), p: toPolygon(s) }));
    const tickers = mapped.filter((m) => m.p).map((m) => m.p!) as string[];
    if (!tickers.length) return ok([], this.c.meta());
    try {
      const out: Quote[] = [];
      for (let i = 0; i < tickers.length; i += 250) {
        const res = await this.c.get<UniversalSnapshot>("/v3/snapshot", { "ticker.any_of": tickers.slice(i, i + 250).join(","), limit: 250 });
        for (const r of res.results ?? []) {
          if (r.error) continue;
          const sym = fromPolygon(r.ticker);
          const info = lookupSymbol(sym);
          const s = r.session ?? {};
          const last = num(r.value) ?? num(r.last_trade?.price) ?? num(s.price) ?? num(s.close);
          const ts = r.last_updated ? new Date(r.last_updated / 1e6).toISOString() : null;
          out.push({
            symbol: sym,
            name: info?.name ?? r.name ?? sym,
            assetClass: info?.assetClass ?? mapType(r.type),
            last,
            change: num(s.change),
            changePercent: num(s.change_percent),
            open: num(s.open),
            high: num(s.high),
            low: num(s.low),
            prevClose: num(s.previous_close),
            volume: num(s.volume),
            avgVolume: null,
            timestamp: ts,
            marketState: r.market_status === "open" ? "open" : r.market_status === "early_trading" ? "pre" : r.market_status === "late_trading" ? "post" : "closed",
            unit: info?.assetClass === "index" ? "index" : info?.assetClass === "fx" ? "fx" : "usd",
          });
        }
      }
      return ok(out, this.c.meta(out[0]?.timestamp ?? undefined));
    } catch (e) {
      return errorResult(e);
    }
  }

  async getHistory(symbol: string, range: HistoryRange, interval: HistoryInterval): Promise<DataResult<Bar[]>> {
    const t = toPolygon(symbol);
    if (!t) return fail("UNSUPPORTED", `${symbol} history is not available from ${LABEL}.`);
    const [mult, span] = ({ "1m": [1, "minute"], "5m": [5, "minute"], "15m": [15, "minute"], "1h": [1, "hour"], "1d": [1, "day"], "1w": [1, "week"] } as const)[interval];
    const to = new Date().toISOString().slice(0, 10);
    const session = currentSessionDate();
    const from =
      range === "1D"
        ? session
        : range === "5D"
          ? (tradingDaysBack(session, 5)[0] ?? session)
          : range === "YTD"
            ? `${to.slice(0, 4)}-01-01`
            : addDays(to, -({ "1M": 31, "3M": 92, "6M": 183, "1Y": 366, "5Y": 1827 } as Record<string, number>)[range]!);
    try {
      const res = await this.c.get<{ results?: { t: number; o: number; h: number; l: number; c: number; v: number }[] }>(
        `/v2/aggs/ticker/${encodeURIComponent(t)}/range/${mult}/${span}/${from}/${to}`,
        { adjusted: "true", sort: "asc", limit: 50000 },
      );
      const bars = (res.results ?? []).map((b) => ({ time: Math.floor(b.t / 1000), open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v ?? 0 }));
      return ok(bars, this.c.meta());
    } catch (e) {
      return errorResult(e);
    }
  }

  async search(query: string, limit = 10): Promise<DataResult<SymbolInfo[]>> {
    try {
      const res = await this.c.get<{ results?: { ticker: string; name: string; primary_exchange?: string; type?: string; market?: string }[] }>(
        "/v3/reference/tickers",
        { search: query, active: "true", limit },
      );
      return ok(
        (res.results ?? []).map((r) => ({
          symbol: fromPolygon(r.ticker),
          name: r.name,
          exchange: r.primary_exchange ?? r.market ?? "",
          assetClass: mapType(r.type),
        })),
        this.c.meta(),
      );
    } catch (e) {
      return errorResult(e);
    }
  }

  async getSymbol(symbol: string): Promise<DataResult<SymbolInfo>> {
    const local = lookupSymbol(symbol);
    const t = toPolygon(symbol);
    if (!t) return local ? ok({ symbol: local.symbol, name: local.name, exchange: local.exchange, assetClass: local.assetClass }, this.c.meta()) : fail("NOT_FOUND", "Unknown symbol");
    try {
      const res = await this.c.get<{ results?: { ticker: string; name: string; primary_exchange?: string; market_cap?: number; sic_description?: string; type?: string } }>(
        `/v3/reference/tickers/${encodeURIComponent(t)}`,
      );
      const r = res.results;
      if (!r) return fail("NOT_FOUND", "Unknown symbol");
      return ok(
        {
          symbol: fromPolygon(r.ticker),
          name: r.name,
          exchange: r.primary_exchange ?? "",
          assetClass: local?.assetClass ?? mapType(r.type),
          sector: local?.sector,
          industry: local?.industry ?? r.sic_description,
          marketCap: r.market_cap,
        },
        this.c.meta(),
      );
    } catch (e) {
      return errorResult(e);
    }
  }

  async getMarketStatus(): Promise<DataResult<MarketStatus>> {
    try {
      const r = await this.c.get<{ market?: string; earlyHours?: boolean; afterHours?: boolean; serverTime?: string }>("/v1/marketstatus/now");
      const state = r.market === "open" ? "open" : r.earlyHours ? "pre" : r.afterHours ? "post" : "closed";
      return ok({ state, label: marketStatusLabel(state), nextChange: nextSessionChange(), exchange: "NYSE / NASDAQ" }, this.c.meta(r.serverTime));
    } catch (e) {
      return errorResult(e);
    }
  }

  async getMovers(kind: MoverKind, limit = 10): Promise<DataResult<MoverRow[]>> {
    if (kind === "gainers" || kind === "losers") {
      try {
        const res = await this.c.get<{ tickers?: PolygonStockSnapshot[] }>(`/v2/snapshot/locale/us/markets/stocks/${kind}`);
        return ok((res.tickers ?? []).slice(0, limit).map(stockSnapshotToMover), this.c.meta());
      } catch (e) {
        return errorResult(e);
      }
    }
    // Most active / unusual volume computed over the NSALGO coverage universe.
    const symbols = UNIVERSE.filter((u) => u.assetClass === "equity").map((u) => u.symbol);
    try {
      const res = await this.c.get<{ tickers?: PolygonStockSnapshot[] }>("/v2/snapshot/locale/us/markets/stocks/tickers", { tickers: symbols.join(",") });
      const rows = (res.tickers ?? []).map(stockSnapshotToMover);
      rows.sort((a, b) =>
        kind === "active" ? (b.volume ?? 0) * (b.last ?? 0) - (a.volume ?? 0) * (a.last ?? 0) : (b.relativeVolume ?? 0) - (a.relativeVolume ?? 0),
      );
      return ok(rows.slice(0, limit), this.c.meta());
    } catch (e) {
      return errorResult(e);
    }
  }

  async getSectors(): Promise<DataResult<SectorPerformance[]>> {
    const res = await this.getQuotes(["SPY", ...SECTOR_ETFS.map((s) => s.etf)]);
    if (!res.ok) return res;
    const spy = res.data.find((q) => q.symbol === "SPY")?.changePercent ?? null;
    return ok(
      SECTOR_ETFS.map(({ sector, etf }) => {
        const cp = res.data.find((q) => q.symbol === etf)?.changePercent ?? null;
        return { sector, etf, changePercent: cp, relativeStrength: cp !== null && spy !== null ? cp - spy : null };
      }),
      res.meta,
    );
  }

  async getBreadth(): Promise<DataResult<BreadthSnapshot>> {
    try {
      const date = currentSessionDate();
      const res = await this.c.get<{ results?: { o: number; c: number }[] }>(`/v2/aggs/grouped/locale/us/market/stocks/${date}`, { adjusted: "true" });
      const rows = res.results ?? [];
      let adv = 0;
      let dec = 0;
      let unch = 0;
      for (const r of rows) {
        if (r.c > r.o) adv++;
        else if (r.c < r.o) dec++;
        else unch++;
      }
      return ok(
        { advancers: adv, decliners: dec, unchanged: unch, newHighs: null, newLows: null, pctAbove50d: null, pctAbove200d: null, universe: "US listed stocks (open→close)" },
        this.c.meta(),
      );
    } catch (e) {
      return errorResult(e);
    }
  }
}

interface PolygonStockSnapshot {
  ticker: string;
  todaysChange?: number;
  todaysChangePerc?: number;
  updated?: number;
  day?: { o?: number; h?: number; l?: number; c?: number; v?: number };
  prevDay?: { c?: number; v?: number };
  lastTrade?: { p?: number };
  min?: { c?: number };
}

function stockSnapshotToMover(t: PolygonStockSnapshot): MoverRow {
  const info = lookupSymbol(t.ticker);
  const last = num(t.lastTrade?.p) ?? num(t.min?.c) ?? num(t.day?.c);
  const vol = num(t.day?.v);
  const prevVol = num(t.prevDay?.v);
  return {
    symbol: t.ticker,
    name: info?.name ?? t.ticker,
    assetClass: info?.assetClass ?? "equity",
    last,
    change: num(t.todaysChange),
    changePercent: num(t.todaysChangePerc),
    open: num(t.day?.o),
    high: num(t.day?.h),
    low: num(t.day?.l),
    prevClose: num(t.prevDay?.c),
    volume: vol,
    avgVolume: null,
    timestamp: t.updated ? new Date(t.updated / 1e6).toISOString() : null,
    marketState: "open",
    relativeVolume: vol && prevVol ? Math.round((vol / prevVol) * 100) / 100 : null,
  };
}

function mapType(t?: string): AssetClass {
  switch (t) {
    case "ETF":
    case "ETV":
      return "etf";
    case "indices":
    case "INDEX":
      return "index";
    case "crypto":
      return "crypto";
    case "fx":
      return "fx";
    default:
      return "equity";
  }
}

/* ── Options ─────────────────────────────────────────────────────────────── */

interface PolygonOptionSnapshot {
  details?: { contract_type?: "call" | "put"; strike_price?: number; expiration_date?: string; ticker?: string };
  day?: { volume?: number; close?: number; vwap?: number };
  open_interest?: number;
  implied_volatility?: number;
  greeks?: { delta?: number; gamma?: number; theta?: number; vega?: number };
  last_quote?: { bid?: number; ask?: number; midpoint?: number };
  last_trade?: { price?: number };
  underlying_asset?: { price?: number };
}

export class PolygonOptionsProvider implements OptionsDataProvider {
  readonly id = "polygon";
  readonly label = LABEL;
  readonly isMock = false;
  private c: PolygonClient;
  constructor(
    apiKey: string,
    delayMinutes: number,
    private flowSymbols: string[] = DEFAULT_FLOW_SYMBOLS,
  ) {
    this.c = new PolygonClient(apiKey, delayMinutes);
  }
  async healthCheck() {
    const t = Date.now();
    try {
      await this.c.get("/v3/reference/options/contracts", { underlying_ticker: "SPY", limit: 1 });
      return healthy("Operational", Date.now() - t);
    } catch (e) {
      return unhealthy((e as Error).message, Date.now() - t);
    }
  }

  async getExpirations(symbol: string): Promise<DataResult<string[]>> {
    try {
      const set = new Set<string>();
      let next: string | undefined = undefined;
      let page = 0;
      let res: { results?: { expiration_date: string }[]; next_url?: string } = await this.c.get("/v3/reference/options/contracts", {
        underlying_ticker: symbol.toUpperCase(),
        expired: "false",
        limit: 1000,
        order: "asc",
        sort: "expiration_date",
      });
      for (;;) {
        for (const r of res.results ?? []) set.add(r.expiration_date);
        next = res.next_url;
        if (!next || ++page > 4) break;
        res = await this.c.get(next);
      }
      return ok([...set].sort(), this.c.meta());
    } catch (e) {
      return errorResult(e);
    }
  }

  async getChain(symbol: string, expiration?: string): Promise<DataResult<OptionChain>> {
    const exps = await this.getExpirations(symbol);
    if (!exps.ok) return exps;
    const exp = expiration && exps.data.includes(expiration) ? expiration : exps.data[0];
    if (!exp) return fail("NOT_FOUND", "No listed expirations.");
    try {
      const contracts: OptionContract[] = [];
      let underlyingPrice: number | null = null;
      let res: { results?: PolygonOptionSnapshot[]; next_url?: string } = await this.c.get(`/v3/snapshot/options/${symbol.toUpperCase()}`, {
        expiration_date: exp,
        limit: 250,
      });
      let pages = 0;
      for (;;) {
        for (const r of res.results ?? []) {
          const d = r.details;
          if (!d?.contract_type || d.strike_price === undefined || !d.expiration_date) continue;
          underlyingPrice ??= num(r.underlying_asset?.price);
          const bid = num(r.last_quote?.bid);
          const ask = num(r.last_quote?.ask);
          contracts.push({
            contract: d.ticker ?? "",
            underlying: symbol.toUpperCase(),
            right: d.contract_type,
            strike: d.strike_price,
            expiration: d.expiration_date,
            dte: dteOf(d.expiration_date),
            bid,
            ask,
            last: num(r.last_trade?.price) ?? num(r.day?.close),
            mark: num(r.last_quote?.midpoint) ?? (bid !== null && ask !== null ? (bid + ask) / 2 : null),
            volume: num(r.day?.volume),
            openInterest: num(r.open_interest),
            impliedVolatility: num(r.implied_volatility),
            delta: num(r.greeks?.delta),
            gamma: num(r.greeks?.gamma),
            theta: num(r.greeks?.theta),
            vega: num(r.greeks?.vega),
          });
        }
        if (!res.next_url || ++pages > 6) break;
        res = await this.c.get(res.next_url);
      }
      contracts.sort((a, b) => a.strike - b.strike);
      const calls = contracts.filter((c) => c.right === "call");
      const atm =
        underlyingPrice !== null
          ? calls.reduce<OptionContract | null>((b, c) => (!b || Math.abs(c.strike - underlyingPrice!) < Math.abs(b.strike - underlyingPrice!) ? c : b), null)
          : null;
      return ok(
        {
          underlying: symbol.toUpperCase(),
          underlyingPrice,
          expirations: exps.data,
          expiration: exp,
          calls,
          puts: contracts.filter((c) => c.right === "put"),
          ivRank: null, // requires stored IV history — populated by the ingestion job when available
          atmIv: atm?.impliedVolatility ?? null,
        },
        this.c.meta(),
      );
    } catch (e) {
      return errorResult(e);
    }
  }

  /**
   * Large options prints, built from Polygon trades and NBBO quotes and
   * classified by ./flow.ts. Needs a Polygon options plan that includes trades
   * (and quotes for bid/ask side); without quotes, side and sentiment stay null.
   */
  async getFlow(filter: FlowFilter): Promise<DataResult<OptionsFlowPrint[]>> {
    const minPremium = filter.minPremium ?? 50_000;
    const symbols = filter.symbol ? [filter.symbol.toUpperCase()] : this.flowSymbols;
    const perUnderlying = filter.symbol ? FLOW_CONTRACTS_SINGLE : FLOW_CONTRACTS_EACH;
    const session = currentSessionDate();
    const sessionStartNs = `${nyTimeToUnix(session, 4 * 60)}000000000`; // 04:00 ET, covers the whole day
    try {
      const candidates = (await mapLimit(symbols, 4, (u) => this.flowCandidates(u, session, minPremium, perUnderlying))).flat();
      candidates.sort((a, b) => b.estPremium - a.estPremium);
      const picked = candidates.slice(0, FLOW_MAX_CONTRACTS);

      const orders = (
        await mapLimit(picked, FLOW_CONCURRENCY, async (c) => {
          const res = await this.c.get<{ results?: PolygonTrade[] }>(`/v3/trades/${encodeURIComponent(c.contract)}`, {
            "timestamp.gte": sessionStartNs,
            order: "desc",
            sort: "timestamp",
            limit: 1000,
          });
          const trades: RawTrade[] = [];
          for (const t of res.results ?? []) {
            if (t.correction) continue;
            const price = num(t.price);
            const size = num(t.size);
            const ts = num(t.sip_timestamp) ?? num(t.participant_timestamp);
            if (price === null || size === null || ts === null) continue;
            trades.push({ price, size, exchange: num(t.exchange), ts });
          }
          return groupOrders(trades)
            .filter((o) => o.premium >= minPremium)
            .map((o) => ({ c, o }));
        })
      ).flat();
      orders.sort((a, b) => b.o.ts - a.o.ts);

      // NBBO at each order's first leg. Capped per request; beyond the cap, or
      // without a quotes entitlement, side stays unknown.
      let quotesAllowed = true;
      const prints = await mapLimit(orders, FLOW_CONCURRENCY, async ({ c, o }, i): Promise<OptionsFlowPrint> => {
        let side: FlowSide = null;
        if (quotesAllowed && i < FLOW_MAX_QUOTE_LOOKUPS) {
          try {
            const q = await this.c.get<{ results?: { bid_price?: number; ask_price?: number }[] }>(`/v3/quotes/${encodeURIComponent(c.contract)}`, {
              "timestamp.lte": String(Math.round(o.ts)),
              order: "desc",
              sort: "timestamp",
              limit: 1,
            });
            const nbbo = q.results?.[0];
            side = classifySide(o.price, num(nbbo?.bid_price), num(nbbo?.ask_price));
          } catch (e) {
            if (e instanceof HttpError && (e.status === 401 || e.status === 403)) quotesAllowed = false;
          }
        }
        return {
          id: `${c.contract}:${o.ts}`,
          timestamp: new Date(o.ts / 1e6).toISOString(),
          underlying: c.underlying,
          right: c.right,
          strike: c.strike,
          expiration: c.expiration,
          dte: dteOf(c.expiration),
          premium: o.premium,
          contracts: o.contracts,
          price: o.price,
          spot: c.spot,
          volume: c.volume,
          openInterest: c.openInterest,
          impliedVolatility: c.iv,
          execution: o.execution,
          side,
          intent: classifyIntent(o.contracts, c.openInterest),
          sentiment: classifySentiment(c.right, side),
          source: `${LABEL} trades · NSALGO classification`,
        };
      });

      const out = prints.filter((p) => {
        if (filter.right && p.right !== filter.right) return false;
        if (filter.sentiment && p.sentiment !== filter.sentiment) return false;
        if (filter.execution && p.execution !== filter.execution) return false;
        if (filter.unusualOnly && !(p.volume !== null && p.openInterest !== null && p.volume > p.openInterest)) return false;
        return true;
      });
      return ok(out.slice(0, filter.limit ?? 100), this.c.meta());
    } catch (e) {
      if (e instanceof HttpError && (e.status === 401 || e.status === 403)) {
        return fail("PROVIDER_NOT_CONFIGURED", "Options flow needs a Polygon options plan that includes trade data.");
      }
      return errorResult(e);
    }
  }

  /** The most active contracts for one underlying today, by estimated premium traded. */
  private async flowCandidates(underlying: string, session: string, minPremium: number, take: number): Promise<FlowCandidate[]> {
    const path = `/v3/snapshot/options/${encodeURIComponent(underlying)}`;
    const probe = await this.c.get<{ results?: PolygonOptionSnapshot[] }>(path, { limit: 1 });
    const spot = num(probe.results?.[0]?.underlying_asset?.price);
    const params: Record<string, string | number> = { "expiration_date.lte": addDays(session, FLOW_MAX_DTE), limit: 250 };
    if (spot !== null) {
      params["strike_price.gte"] = Math.floor(spot * (1 - FLOW_STRIKE_BAND));
      params["strike_price.lte"] = Math.ceil(spot * (1 + FLOW_STRIKE_BAND));
    }
    const out: FlowCandidate[] = [];
    let res: { results?: PolygonOptionSnapshot[]; next_url?: string } = await this.c.get(path, params);
    for (let page = 0; ; page++) {
      for (const r of res.results ?? []) {
        const d = r.details;
        const volume = num(r.day?.volume);
        const px = num(r.day?.vwap) ?? num(r.day?.close) ?? num(r.last_trade?.price);
        if (!d?.ticker || !d.contract_type || d.strike_price === undefined || !d.expiration_date || !volume || px === null) continue;
        const estPremium = volume * px * 100;
        if (estPremium < minPremium) continue;
        out.push({
          contract: d.ticker,
          underlying,
          right: d.contract_type,
          strike: d.strike_price,
          expiration: d.expiration_date,
          spot: num(r.underlying_asset?.price) ?? spot,
          volume,
          openInterest: num(r.open_interest),
          iv: num(r.implied_volatility),
          estPremium,
        });
      }
      if (!res.next_url || page >= FLOW_MAX_PAGES) break;
      res = await this.c.get(res.next_url);
    }
    return out.sort((a, b) => b.estPremium - a.estPremium).slice(0, take);
  }
}

interface PolygonTrade {
  price?: number;
  size?: number;
  exchange?: number;
  sip_timestamp?: number;
  participant_timestamp?: number;
  correction?: number;
}

interface FlowCandidate {
  contract: string;
  underlying: string;
  right: OptionRight;
  strike: number;
  expiration: string;
  spot: number | null;
  volume: number;
  openInterest: number | null;
  iv: number | null;
  estPremium: number;
}

/** Liquid underlyings scanned when no symbol is given. Override with OPTIONS_FLOW_SYMBOLS. */
export const DEFAULT_FLOW_SYMBOLS = ["SPY", "QQQ", "IWM", "AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "META", "GOOGL", "AMD", "AVGO", "NFLX", "PLTR", "COIN"];
const FLOW_CONTRACTS_EACH = 5;
const FLOW_CONTRACTS_SINGLE = 30;
const FLOW_MAX_CONTRACTS = 60;
const FLOW_MAX_QUOTE_LOOKUPS = 200;
const FLOW_MAX_DTE = 60;
const FLOW_STRIKE_BAND = 0.15;
const FLOW_MAX_PAGES = 8;
const FLOW_CONCURRENCY = 8;

function dteOf(expiration: string) {
  return Math.max(0, Math.round((Date.parse(`${expiration}T20:00:00Z`) - Date.now()) / 86_400_000));
}

/** Runs `fn` over `items` with at most `limit` in flight, preserving order. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!, i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/* ── News ────────────────────────────────────────────────────────────────── */

interface PolygonNews {
  id: string;
  publisher?: { name?: string };
  title: string;
  published_utc: string;
  article_url: string;
  tickers?: string[];
  image_url?: string;
  description?: string;
  insights?: { ticker: string; sentiment?: "positive" | "negative" | "neutral" }[];
}

export class PolygonNewsProvider implements NewsProvider {
  readonly id = "polygon";
  readonly label = LABEL;
  readonly isMock = false;
  private c: PolygonClient;
  constructor(apiKey: string) {
    this.c = new PolygonClient(apiKey, 0);
  }
  async healthCheck() {
    const t = Date.now();
    try {
      await this.c.get("/v2/reference/news", { limit: 1 });
      return healthy("Operational", Date.now() - t);
    } catch (e) {
      return unhealthy((e as Error).message, Date.now() - t);
    }
  }

  private map(n: PolygonNews): NewsArticle {
    const cats = classifyHeadline(`${n.title} ${n.description ?? ""}`);
    const sentiments = n.insights?.map((i) => i.sentiment).filter(Boolean) ?? [];
    const sentiment = sentiments.length
      ? sentiments.filter((s) => s === "positive").length > sentiments.filter((s) => s === "negative").length
        ? "positive"
        : sentiments.includes("negative")
          ? "negative"
          : "neutral"
      : null;
    const fresh = Date.now() - Date.parse(n.published_utc) < 30 * 60_000;
    return {
      id: n.id,
      headline: n.title,
      // Store only the publisher-provided description (permitted by feed licence); never full text.
      summary: n.description ?? null,
      source: LABEL,
      publisher: n.publisher?.name ?? "Unknown publisher",
      url: n.article_url,
      imageUrl: n.image_url ?? null,
      tickers: n.tickers ?? [],
      categories: cats,
      publishedAt: n.published_utc,
      fetchedAt: new Date().toISOString(),
      impact: null, // not supplied by provider — NSALGO does not guess
      sentiment,
      isBreaking: fresh && cats.some((c) => c === "fed" || c === "economy"),
    };
  }

  async list(f: NewsFilter): Promise<DataResult<NewsArticle[]>> {
    try {
      const res = await this.c.get<{ results?: PolygonNews[] }>("/v2/reference/news", {
        ticker: f.ticker?.toUpperCase(),
        limit: Math.min(f.limit ?? 50, 100),
        order: "desc",
        sort: "published_utc",
        "published_utc.lt": f.before,
      });
      let items = (res.results ?? []).map((n) => this.map(n));
      if (f.category) items = items.filter((a) => a.categories.includes(f.category!) || (f.category === "breaking" && a.isBreaking));
      if (f.q) items = items.filter((a) => a.headline.toLowerCase().includes(f.q!.toLowerCase()));
      return ok(items, this.c.meta(items[0]?.publishedAt));
    } catch (e) {
      return errorResult(e);
    }
  }

  async get(id: string): Promise<DataResult<NewsArticle>> {
    // Polygon has no single-article endpoint; resolve from the recent window.
    const res = await this.list({ limit: 100 });
    if (!res.ok) return res;
    const a = res.data.find((x) => x.id === id);
    return a ? ok(a, res.meta) : fail("NOT_FOUND", "Article not found in the current feed window.");
  }
}
