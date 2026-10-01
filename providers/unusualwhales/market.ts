import "server-only";
/**
 * Unusual Whales market data and news: quotes from stock-state (crypto from
 * the crypto pair state), candles from ohlc, sector ETFs, and movers and
 * breadth from the stock screener. Index, futures and yield data need a higher
 * API tier and there is no ticker search, so those symbols are omitted and
 * search runs over the NSALGO universe. Headlines carry no
 * article link or summary; those fields stay empty.
 */
import { createHash } from "node:crypto";
import { UNIVERSE, lookupSymbol, SECTOR_ETFS } from "@/config/universe";
import { HttpError } from "@/lib/http";
import { marketStatusLabel, nextSessionChange, nyTimeToUnix, sessionState } from "@/lib/market-time";
import { classifyHeadline } from "@/lib/news-classify";
import { fail, ok, type DataResult } from "@/types/data";
import type {
  AssetClass,
  Bar,
  BreadthSnapshot,
  HistoryInterval,
  HistoryRange,
  MarketSessionState,
  MarketStatus,
  MoverKind,
  MoverRow,
  Quote,
  SectorPerformance,
  SymbolInfo,
} from "@/types/market";
import type { NewsArticle, NewsFilter, Sentiment } from "@/types/news";
import type { MarketDataProvider, NewsProvider } from "../types";
import type { UnusualWhalesClient } from "./index";

const LABEL = "Unusual Whales";

function errorResult<T>(err: unknown, what: string): DataResult<T> {
  if (err instanceof HttpError) {
    if (err.status === 401 || err.status === 403) return fail("PROVIDER_NOT_CONFIGURED", "Unusual Whales rejected the API key or plan entitlement.");
    if (err.status === 404 || err.status === 422) return fail("NOT_FOUND", `${what} not found at Unusual Whales.`);
    if (err.status === 429) return fail("RATE_LIMITED", "Unusual Whales rate limit reached.");
  }
  return fail("PROVIDER_UNAVAILABLE", `${what} temporarily unavailable.`);
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

const pct = (last: number | null, prev: number | null) => (last !== null && prev ? ((last - prev) / prev) * 100 : null);

function sessionOf(marketTime: string | undefined): MarketSessionState {
  switch (marketTime) {
    case "premarket":
    case "pr":
      return "pre";
    case "regular":
    case "r":
      return "open";
    case "postmarket":
    case "po":
      return "post";
    default:
      return "closed";
  }
}

/** BTCUSD → BTC-USD, the pair format of the crypto endpoints. */
const cryptoPair = (symbol: string) => (lookupSymbol(symbol)?.assetClass === "crypto" ? `${symbol.slice(0, -3)}-${symbol.slice(-3)}` : null);

/** Index, rate, future and FX symbols: CBOE index data and futures need a higher API tier. */
const unsupported = (symbol: string) => {
  const cls = lookupSymbol(symbol)?.assetClass;
  return cls !== undefined && cls !== "equity" && cls !== "etf" && cls !== "crypto";
};

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const worker = async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

interface UwStockState {
  close: string;
  high?: string;
  low?: string;
  open?: string;
  volume?: number;
  total_volume?: number;
  market_time?: string;
  tape_time?: string;
  prev_close?: string;
}

interface UwCryptoState {
  timestamp?: string;
  close_24h?: string;
  high_24h?: string;
  low_24h?: string;
  open_24h?: string;
  volume_24h?: string;
}

interface UwCandle {
  open: string;
  high: string;
  low: string;
  close: string;
  volume: number;
  market_time: string;
  date?: string;
  start_time?: string;
}

interface UwScreenerRow {
  ticker: string;
  full_name?: string | null;
  close?: string;
  prev_close?: string;
  open?: string;
  high?: string;
  low?: string;
  stock_volume?: number;
  avg30_volume?: string;
  relative_volume?: string;
  issue_type?: string;
  date?: string;
}

interface UwBreadthRow {
  ticker: string;
  issue_type?: string;
  close?: string;
  prev_close?: string;
  sma_50?: number | string | null;
  sma_200?: number | string | null;
  week_52_high?: string;
  week_52_low?: string;
}

interface UwSectorEtf {
  ticker: string;
  last?: string;
  prev_close?: string;
}

interface UwInfo {
  symbol: string;
  full_name?: string;
  short_name?: string;
  sector?: string;
  issue_type?: string;
  marketcap?: string;
}

export class UnusualWhalesMarketDataProvider implements MarketDataProvider {
  readonly id = "unusualwhales";
  readonly label = LABEL;
  readonly isMock = false;
  constructor(private c: UnusualWhalesClient) {}

  healthCheck() {
    return this.c.health();
  }

  async getQuotes(symbols: string[]): Promise<DataResult<Quote[]>> {
    const wanted = [...new Set(symbols.map((s) => s.toUpperCase()))].filter((s) => !unsupported(s));
    if (!wanted.length) return ok([], this.c.meta());
    let firstError: unknown;
    const rows = await mapLimit(wanted, 5, async (sym) => {
      try {
        const pair = cryptoPair(sym);
        if (pair) return { sym, crypto: await this.c.get<UwCryptoState>(`/api/crypto/${pair}/state`) };
        return { sym, s: await this.c.get<UwStockState>(`/api/stock/${encodeURIComponent(sym)}/stock-state`) };
      } catch (e) {
        firstError ??= e;
        return null;
      }
    });
    const quotes: Quote[] = [];
    for (const r of rows) {
      if (r?.crypto) {
        // Crypto trades around the clock; change is measured over the trailing 24 hours.
        const last = num(r.crypto.close_24h);
        const open = num(r.crypto.open_24h);
        quotes.push({
          symbol: r.sym,
          name: lookupSymbol(r.sym)?.name ?? r.sym,
          assetClass: "crypto",
          last,
          change: last !== null && open !== null ? last - open : null,
          changePercent: pct(last, open),
          open,
          high: num(r.crypto.high_24h),
          low: num(r.crypto.low_24h),
          prevClose: open,
          volume: num(r.crypto.volume_24h),
          avgVolume: null,
          timestamp: r.crypto.timestamp ?? null,
          marketState: "open",
          unit: "usd",
        });
        continue;
      }
      if (!r?.s) continue;
      const info = lookupSymbol(r.sym);
      const last = num(r.s.close);
      const prev = num(r.s.prev_close);
      const state = sessionOf(r.s.market_time);
      // Outside regular hours stock-state's open/high/low describe the extended session.
      const regular = state === "open";
      quotes.push({
        symbol: r.sym,
        name: info?.name ?? r.sym,
        assetClass: info?.assetClass ?? "equity",
        last,
        change: last !== null && prev !== null ? last - prev : null,
        changePercent: pct(last, prev),
        open: regular ? num(r.s.open) : null,
        high: regular ? num(r.s.high) : null,
        low: regular ? num(r.s.low) : null,
        prevClose: prev,
        volume: num(r.s.total_volume ?? r.s.volume),
        avgVolume: null,
        timestamp: r.s.tape_time ?? null,
        marketState: state,
        unit: "usd",
      });
    }
    if (!quotes.length && firstError) return errorResult(firstError, "Quotes");
    return ok(quotes, this.c.meta());
  }

  async getHistory(symbol: string, range: HistoryRange, interval: HistoryInterval): Promise<DataResult<Bar[]>> {
    const sym = symbol.toUpperCase();
    if (unsupported(sym)) return fail("UNSUPPORTED", `${sym} history is not available from ${LABEL}.`);
    const daily = interval === "1d" || interval === "1w";
    const pair = cryptoPair(sym);
    if (pair) return this.cryptoHistory(pair, range, interval);
    try {
      const rows = await this.c.get<UwCandle[]>(`/api/stock/${encodeURIComponent(sym)}/ohlc/${interval}`, { timeframe: range, limit: 2500 });
      const bars: Bar[] = [];
      for (const r of rows ?? []) {
        if (r.market_time !== "r") continue;
        const time = daily ? (r.date ? nyTimeToUnix(r.date, 0) : NaN) : r.start_time ? Math.floor(Date.parse(r.start_time) / 1000) : NaN;
        const [o, h, l, c] = [num(r.open), num(r.high), num(r.low), num(r.close)];
        if (!Number.isFinite(time) || o === null || h === null || l === null || c === null) continue;
        bars.push({ time, open: o, high: h, low: l, close: c, volume: r.volume ?? 0 });
      }
      bars.sort((a, b) => a.time - b.time);
      return ok(bars, this.c.meta());
    } catch (e) {
      return errorResult(e, "Price history");
    }
  }

  private async cryptoHistory(pair: string, range: HistoryRange, interval: HistoryInterval): Promise<DataResult<Bar[]>> {
    const now = new Date();
    const from =
      range === "YTD"
        ? Date.UTC(now.getUTCFullYear(), 0, 1) / 1000
        : now.getTime() / 1000 - ({ "1D": 1, "5D": 5, "1M": 31, "3M": 92, "6M": 183, "1Y": 366, "5Y": 1827 } as Record<string, number>)[range]! * 86_400;
    try {
      const rows = await this.c.get<{ open: string; high: string; low: string; close: string; volume?: string; start_time: string }[]>(
        `/api/crypto/${pair}/ohlc/${interval}`,
        { limit: 500 },
      );
      const bars: Bar[] = [];
      for (const r of rows ?? []) {
        const [o, h, l, c] = [num(r.open), num(r.high), num(r.low), num(r.close)];
        const time = Math.floor(Date.parse(r.start_time) / 1000);
        if (!Number.isFinite(time) || time < from || o === null || h === null || l === null || c === null) continue;
        bars.push({ time, open: o, high: h, low: l, close: c, volume: num(r.volume) ?? 0 });
      }
      bars.sort((a, b) => a.time - b.time);
      return ok(bars, this.c.meta());
    } catch (e) {
      return errorResult(e, "Price history");
    }
  }

  async search(query: string, limit = 10): Promise<DataResult<SymbolInfo[]>> {
    const q = query.trim().toUpperCase();
    if (!q) return ok([], this.c.meta());
    const score = (u: (typeof UNIVERSE)[number]) =>
      u.symbol === q ? 0 : u.symbol.startsWith(q) ? 1 : u.name.toUpperCase().includes(q) || u.aliases?.some((a) => a.toUpperCase().includes(q)) ? 2 : 9;
    const hits = UNIVERSE.map((u) => ({ u, s: score(u) }))
      .filter((x) => x.s < 9)
      .sort((a, b) => a.s - b.s)
      .slice(0, limit)
      .map(({ u }) => ({ symbol: u.symbol, name: u.name, exchange: u.exchange, assetClass: u.assetClass, sector: u.sector, industry: u.industry }));
    return ok(hits, this.c.meta());
  }

  async getSymbol(symbol: string): Promise<DataResult<SymbolInfo>> {
    const sym = symbol.toUpperCase();
    const local = lookupSymbol(sym);
    if (local && (unsupported(sym) || cryptoPair(sym))) return ok({ symbol: local.symbol, name: local.name, exchange: local.exchange, assetClass: local.assetClass }, this.c.meta());
    try {
      const r = await this.c.get<UwInfo>(`/api/stock/${encodeURIComponent(sym)}/info`);
      if (!r?.symbol) return local ? ok(local, this.c.meta()) : fail("NOT_FOUND", "Unknown symbol");
      const assetClass: AssetClass = local?.assetClass ?? (r.issue_type === "ETF" ? "etf" : "equity");
      return ok(
        {
          symbol: r.symbol,
          name: local?.name ?? r.full_name ?? r.short_name ?? r.symbol,
          exchange: local?.exchange ?? "",
          assetClass,
          sector: local?.sector ?? r.sector,
          industry: local?.industry,
          marketCap: num(r.marketcap) ?? undefined,
        },
        this.c.meta(),
      );
    } catch (e) {
      return local ? ok({ symbol: local.symbol, name: local.name, exchange: local.exchange, assetClass: local.assetClass }, this.c.meta()) : errorResult(e, "Symbol");
    }
  }

  async getMarketStatus(): Promise<DataResult<MarketStatus>> {
    // Computed from the NYSE calendar; the public API has no market-status route.
    const state = sessionState();
    return ok({ state, label: marketStatusLabel(state), nextChange: nextSessionChange(), exchange: "NYSE / NASDAQ" }, this.c.meta());
  }

  async getMovers(kind: MoverKind, limit = 10): Promise<DataResult<MoverRow[]>> {
    const order = kind === "active" ? "stock_volume" : kind === "unusual-volume" ? "relative_volume" : "perc_change";
    try {
      const rows = await this.c.get<UwScreenerRow[]>("/api/screener/stocks", {
        order,
        order_direction: kind === "losers" ? "asc" : "desc",
        min_marketcap: 2_000_000_000,
        limit: Math.min(limit * 3, 100),
      });
      const movers = (rows ?? [])
        .filter((r) => r.issue_type === undefined || r.issue_type === "Common Stock")
        .map((r): MoverRow => {
          const info = lookupSymbol(r.ticker);
          const last = num(r.close);
          const prev = num(r.prev_close);
          return {
            symbol: r.ticker,
            name: info?.name ?? r.full_name ?? r.ticker,
            assetClass: "equity",
            last,
            change: last !== null && prev !== null ? last - prev : null,
            changePercent: pct(last, prev),
            open: num(r.open),
            high: num(r.high),
            low: num(r.low),
            prevClose: prev,
            volume: num(r.stock_volume),
            avgVolume: num(r.avg30_volume),
            timestamp: null,
            marketState: sessionState(),
            unit: "usd",
            relativeVolume: num(r.relative_volume),
          };
        })
        .slice(0, limit);
      return ok(movers, this.c.meta());
    } catch (e) {
      return errorResult(e, "Movers");
    }
  }

  async getSectors(): Promise<DataResult<SectorPerformance[]>> {
    try {
      const rows = await this.c.get<UwSectorEtf[]>("/api/market/sector-etfs");
      const change = (t: string) => {
        const r = rows?.find((x) => x.ticker === t);
        return r ? pct(num(r.last), num(r.prev_close)) : null;
      };
      const spy = change("SPY");
      return ok(
        SECTOR_ETFS.map(({ sector, etf }) => {
          const cp = change(etf);
          return { sector, etf, changePercent: cp, relativeStrength: cp !== null && spy !== null ? cp - spy : null };
        }),
        this.c.meta(),
      );
    } catch (e) {
      return errorResult(e, "Sector performance");
    }
  }

  private breadthCache: { at: number; data: BreadthSnapshot } | undefined;

  /**
   * Breadth over the ~500 largest US common stocks (an S&P 500 proxy), from
   * the stock screener: close, previous close, 50/200-day SMAs and the 52-week
   * range per stock. Cached for five minutes.
   */
  async getBreadth(): Promise<DataResult<BreadthSnapshot>> {
    if (this.breadthCache && Date.now() - this.breadthCache.at < 5 * 60_000) return ok(this.breadthCache.data, this.c.meta());
    try {
      // The screener ignores `page`, so one call of its 500-row maximum is the whole sample.
      const rows = await this.c.get<UwBreadthRow[]>("/api/screener/stocks", { order: "marketcap", order_direction: "desc", limit: 500 });
      const seen = new Set<string>();
      let adv = 0, dec = 0, unch = 0, highs = 0, lows = 0, above50 = 0, has50 = 0, above200 = 0, has200 = 0;
      for (const r of rows ?? []) {
        if (!r || seen.has(r.ticker) || (r.issue_type && r.issue_type !== "Common Stock")) continue;
        seen.add(r.ticker);
        const c = num(r.close);
        const prev = num(r.prev_close);
        if (c === null) continue;
        if (prev !== null) {
          if (c > prev) adv++;
          else if (c < prev) dec++;
          else unch++;
        }
        const hi = num(r.week_52_high);
        const lo = num(r.week_52_low);
        if (hi !== null && c >= hi) highs++;
        if (lo !== null && c <= lo) lows++;
        const s50 = num(r.sma_50);
        const s200 = num(r.sma_200);
        if (s50 !== null) {
          has50++;
          if (c > s50) above50++;
        }
        if (s200 !== null) {
          has200++;
          if (c > s200) above200++;
        }
      }
      if (!seen.size) return fail("PROVIDER_UNAVAILABLE", "Breadth temporarily unavailable.");
      const data: BreadthSnapshot = {
        advancers: adv,
        decliners: dec,
        unchanged: unch,
        newHighs: highs,
        newLows: lows,
        pctAbove50d: has50 ? Math.round((above50 / has50) * 100) : null,
        pctAbove200d: has200 ? Math.round((above200 / has200) * 100) : null,
        universe: `${seen.size} largest US stocks by market cap`,
      };
      this.breadthCache = { at: Date.now(), data };
      return ok(data, this.c.meta());
    } catch (e) {
      return errorResult(e, "Breadth");
    }
  }
}

interface UwHeadline {
  headline: string;
  source?: string;
  created_at: string;
  tickers?: string[];
  sentiment?: string;
  is_major?: boolean;
}

function sentimentOf(s: string | undefined): Sentiment | null {
  if (s === "positive" || s === "bullish") return "positive";
  if (s === "negative" || s === "bearish") return "negative";
  if (s === "neutral") return "neutral";
  return null;
}

export class UnusualWhalesNewsProvider implements NewsProvider {
  readonly id = "unusualwhales";
  readonly label = LABEL;
  readonly isMock = false;
  constructor(private c: UnusualWhalesClient) {}

  healthCheck() {
    return this.c.health();
  }

  private map(h: UwHeadline): NewsArticle {
    const cats = classifyHeadline(h.headline);
    const fresh = Date.now() - Date.parse(h.created_at) < 30 * 60_000;
    return {
      id: createHash("sha1").update(`${h.created_at}|${h.headline}`).digest("hex").slice(0, 20),
      headline: h.headline,
      summary: null,
      source: LABEL,
      publisher: h.source || "Unknown publisher",
      url: "",
      imageUrl: null,
      tickers: h.tickers ?? [],
      categories: cats,
      publishedAt: h.created_at,
      fetchedAt: new Date().toISOString(),
      impact: null,
      sentiment: sentimentOf(h.sentiment),
      isBreaking: fresh && (h.is_major === true || cats.some((c) => c === "fed" || c === "economy")),
    };
  }

  async list(f: NewsFilter): Promise<DataResult<NewsArticle[]>> {
    try {
      const rows = await this.c.get<UwHeadline[]>("/api/news/headlines", {
        ticker: f.ticker?.toUpperCase(),
        search_term: f.q,
        limit: 100,
      });
      let items = (rows ?? []).map((h) => this.map(h));
      if (f.before) items = items.filter((a) => a.publishedAt < f.before!);
      if (f.category) items = items.filter((a) => a.categories.includes(f.category!) || (f.category === "breaking" && a.isBreaking));
      items = items.slice(0, Math.min(f.limit ?? 50, 100));
      return ok(items, this.c.meta());
    } catch (e) {
      return errorResult(e, "News");
    }
  }

  async get(id: string): Promise<DataResult<NewsArticle>> {
    const res = await this.list({ limit: 100 });
    if (!res.ok) return res;
    const a = res.data.find((x) => x.id === id);
    return a ? ok(a, res.meta) : fail("NOT_FOUND", "Article not found in the current feed window.");
  }
}
