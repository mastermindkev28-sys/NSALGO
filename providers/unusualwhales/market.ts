import "server-only";
/**
 * Unusual Whales market data and news: quotes from stock-state, candles from
 * ohlc, sector ETFs, and movers from the stock screener. The public API has no
 * index quotes (SPX, VIX, yields) and no ticker search, so index symbols are
 * omitted and search runs over the NSALGO universe. Headlines carry no
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

/** Index-style symbols in the universe that stock-state does not serve. */
const unsupported = (symbol: string) => {
  const cls = lookupSymbol(symbol)?.assetClass;
  return cls !== undefined && cls !== "equity" && cls !== "etf";
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
        return { sym, s: await this.c.get<UwStockState>(`/api/stock/${encodeURIComponent(sym)}/stock-state`) };
      } catch (e) {
        firstError ??= e;
        return null;
      }
    });
    const quotes: Quote[] = [];
    for (const r of rows) {
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
    if (local && unsupported(sym)) return ok({ symbol: local.symbol, name: local.name, exchange: local.exchange, assetClass: local.assetClass }, this.c.meta());
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

  async getBreadth(): Promise<DataResult<BreadthSnapshot>> {
    return fail("UNSUPPORTED", `Market breadth is not available from ${LABEL}.`);
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
