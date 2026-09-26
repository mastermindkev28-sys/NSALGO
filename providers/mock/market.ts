/** ─── MOCK DATA — SIMULATED ─── MarketDataProvider backed by the simulator. */
import { EQUITY_UNIVERSE, SECTOR_ETFS, UNIVERSE, lookupSymbol } from "@/config/universe";
import { marketStatusLabel, nextSessionChange, sessionState, tradingDaysBack } from "@/lib/market-time";
import { fail, ok, type DataResult } from "@/types/data";
import type {
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
import { healthy, mockMeta } from "../meta";
import type { MarketDataProvider } from "../types";
import { SIM_PARAMS } from "./reference";
import { dailySeries, intradayBars, nowSessionInfo, simParams, simQuote } from "./simulator";

function round(n: number, decimals: number) {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

export function mockQuote(symbol: string, now = new Date()): Quote | null {
  const sym = symbol.toUpperCase();
  const info = lookupSymbol(sym);
  const p = simParams(sym);
  const q = simQuote(sym, now);
  if (!info || !p || !q) return null;
  const dp = p.decimals ?? (q.last < 10 ? 3 : 2);
  const last = round(q.last, dp);
  const prev = round(q.prevClose, dp);
  const change = round(last - prev, dp);
  return {
    symbol: sym,
    name: info.name,
    assetClass: info.assetClass,
    last,
    change,
    changePercent: prev ? round((change / prev) * 100, 2) : null,
    open: round(q.open, dp),
    high: round(q.high, dp),
    low: round(q.low, dp),
    prevClose: prev,
    volume: p.avgVolume ? q.volume : null,
    avgVolume: p.avgVolume ? q.avgVolume : null,
    timestamp: q.timestamp,
    marketState: sessionState(now),
    unit: p.unit ?? "usd",
  };
}

const RANGE_DAYS: Record<HistoryRange, number> = {
  "1D": 1,
  "5D": 5,
  "1M": 22,
  "3M": 64,
  "6M": 127,
  YTD: 0,
  "1Y": 252,
  "5Y": 1260,
};

const INTERVAL_MIN: Partial<Record<HistoryInterval, number>> = { "1m": 1, "5m": 5, "15m": 15, "1h": 60 };

export class MockMarketDataProvider implements MarketDataProvider {
  readonly id = "mock";
  readonly label = "NSALGO Simulator";
  readonly isMock = true;

  async healthCheck() {
    return healthy("Simulator operational (mock data)");
  }

  async getQuotes(symbols: string[]): Promise<DataResult<Quote[]>> {
    const now = new Date();
    const quotes = symbols.map((s) => mockQuote(s, now)).filter((q): q is Quote => q !== null);
    return ok(quotes, mockMeta(quotes[0]?.timestamp ?? undefined));
  }

  async getHistory(symbol: string, range: HistoryRange, interval: HistoryInterval): Promise<DataResult<Bar[]>> {
    const sym = symbol.toUpperCase();
    if (!simParams(sym)) return fail("NOT_FOUND", `No simulated history for ${sym}`);
    const { session, elapsed } = nowSessionInfo();
    const series = dailySeries(sym, session);
    const intradayMinutes = INTERVAL_MIN[interval];

    if (intradayMinutes) {
      const days = range === "1D" ? 1 : range === "5D" ? 5 : Math.min(RANGE_DAYS[range] || 5, 10);
      const dates = tradingDaysBack(session, days);
      const bars: Bar[] = [];
      for (const date of dates) {
        const day = series.find((d) => d.date === date);
        if (!day) continue;
        bars.push(...intradayBars(sym, day, intradayMinutes, date === session ? elapsed : 390));
      }
      return ok(bars, mockMeta());
    }

    let points = series;
    if (range === "YTD") {
      const year = session.slice(0, 4);
      points = series.filter((d) => d.date >= `${year}-01-01`);
    } else {
      points = series.slice(-RANGE_DAYS[range]);
    }
    // The in-progress session's daily bar reflects only elapsed trading.
    const q = simQuote(sym);
    let bars: Bar[] = points.map((d) => ({
      time: Date.parse(`${d.date}T00:00:00Z`) / 1000,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
    }));
    const lastBar = bars[bars.length - 1];
    if (q && lastBar && q.elapsed < 390) {
      bars[bars.length - 1] = { ...lastBar, close: q.last, high: q.high, low: q.low, volume: q.volume };
    }
    if (interval === "1w") bars = toWeekly(bars);
    return ok(bars, mockMeta());
  }

  async search(query: string, limit = 10): Promise<DataResult<SymbolInfo[]>> {
    return ok(searchUniverse(query, limit), mockMeta());
  }

  async getSymbol(symbol: string): Promise<DataResult<SymbolInfo>> {
    const u = lookupSymbol(symbol);
    if (!u) return fail("NOT_FOUND", `Unknown symbol ${symbol}`);
    return ok(
      { symbol: u.symbol, name: u.name, exchange: u.exchange, assetClass: u.assetClass, sector: u.sector, industry: u.industry, marketCap: SIM_PARAMS[u.symbol]?.marketCap },
      mockMeta(),
    );
  }

  async getMarketStatus(): Promise<DataResult<MarketStatus>> {
    const state = sessionState();
    return ok({ state, label: marketStatusLabel(state), nextChange: nextSessionChange(), exchange: "NYSE / NASDAQ" }, mockMeta());
  }

  async getMovers(kind: MoverKind, limit = 10): Promise<DataResult<MoverRow[]>> {
    const now = new Date();
    const rows: MoverRow[] = EQUITY_UNIVERSE.map((s) => mockQuote(s, now))
      .filter((q): q is Quote => q !== null)
      .map((q) => {
        const { elapsed } = nowSessionInfo(now);
        const frac = Math.max(0.05, elapsed / 390);
        const rv = q.volume && q.avgVolume ? q.volume / (q.avgVolume * frac) : null;
        return { ...q, relativeVolume: rv ? Math.round(rv * 100) / 100 : null };
      });
    const sorted = [...rows].sort((a, b) => {
      switch (kind) {
        case "gainers":
          return (b.changePercent ?? 0) - (a.changePercent ?? 0);
        case "losers":
          return (a.changePercent ?? 0) - (b.changePercent ?? 0);
        case "active":
          return (b.volume ?? 0) * (b.last ?? 0) - (a.volume ?? 0) * (a.last ?? 0);
        case "unusual-volume":
          return (b.relativeVolume ?? 0) - (a.relativeVolume ?? 0);
      }
    });
    return ok(sorted.slice(0, limit), mockMeta());
  }

  async getSectors(): Promise<DataResult<SectorPerformance[]>> {
    const now = new Date();
    const spy = mockQuote("SPY", now)?.changePercent ?? 0;
    const rows = SECTOR_ETFS.map(({ sector, etf }) => {
      const q = mockQuote(etf, now);
      const cp = q?.changePercent ?? null;
      return { sector, etf, changePercent: cp, relativeStrength: cp === null ? null : Math.round((cp - spy) * 100) / 100 };
    });
    return ok(rows, mockMeta());
  }

  async getBreadth(): Promise<DataResult<BreadthSnapshot>> {
    const spy = mockQuote("SPY")?.changePercent ?? 0;
    const tilt = 1 / (1 + Math.exp(-spy * 2.2));
    const advancers = Math.round(503 * (0.08 + 0.84 * tilt));
    const unchanged = 9;
    const decliners = 503 - advancers - unchanged;
    const series = dailySeries("SPY", nowSessionInfo().session);
    const last = series[series.length - 1]?.close ?? 0;
    const ma50 = avg(series.slice(-50).map((d) => d.close));
    const ma200 = avg(series.slice(-200).map((d) => d.close));
    const pct50 = clamp(50 + ((last - ma50) / ma50) * 900, 8, 92);
    const pct200 = clamp(55 + ((last - ma200) / ma200) * 500, 10, 90);
    return ok(
      {
        advancers,
        decliners,
        unchanged,
        newHighs: Math.round(Math.max(0, spy) * 18 + 12),
        newLows: Math.round(Math.max(0, -spy) * 18 + 6),
        pctAbove50d: Math.round(pct50),
        pctAbove200d: Math.round(pct200),
        universe: "S&P 500 (simulated)",
      },
      mockMeta(),
    );
  }
}

export function searchUniverse(query: string, limit = 10): SymbolInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored = UNIVERSE.map((u) => {
    const sym = u.symbol.toLowerCase();
    const name = u.name.toLowerCase();
    let score = 0;
    if (sym === q) score = 100;
    else if (sym.startsWith(q)) score = 80 - sym.length;
    else if (u.aliases?.some((a) => a === q)) score = 75;
    else if (name.startsWith(q)) score = 60;
    else if (u.aliases?.some((a) => a.startsWith(q))) score = 55;
    else if (name.includes(q)) score = 40;
    return { u, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return scored.map(({ u }) => ({ symbol: u.symbol, name: u.name, exchange: u.exchange, assetClass: u.assetClass, sector: u.sector }));
}

function toWeekly(bars: Bar[]): Bar[] {
  const out: Bar[] = [];
  let cur: Bar | null = null;
  let curWeek = -1;
  for (const b of bars) {
    const d = new Date(b.time * 1000);
    const week = Math.floor((d.getTime() / 86_400_000 + 3) / 7);
    if (!cur || week !== curWeek) {
      if (cur) out.push(cur);
      cur = { ...b };
      curWeek = week;
    } else {
      cur.high = Math.max(cur.high, b.high);
      cur.low = Math.min(cur.low, b.low);
      cur.close = b.close;
      cur.volume += b.volume;
    }
  }
  if (cur) out.push(cur);
  return out;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
