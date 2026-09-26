/**
 * ─── MOCK DATA — SIMULATED ───────────────────────────────────────────────────
 * Deterministic market simulator used when DATA_MODE=mock. It produces
 * internally consistent daily and intraday series (the same inputs always give
 * the same outputs) so server and client renders agree and Atlas can be
 * exercised end-to-end. It is never used when DATA_MODE=production.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { gaussian, seeded } from "@/lib/random";
import {
  CLOSE_MIN,
  OPEN_MIN,
  currentSessionDate,
  isTradingDay,
  nextTradingDay,
  nyParts,
  nyTimeToUnix,
  sessionMinutesElapsed,
} from "@/lib/market-time";
import type { Bar } from "@/types/market";
import { SIM_EPOCH, SIM_PARAMS, type SimParams } from "./reference";

const SIM_START = "2021-01-04";
const SESSION_MINUTES = CLOSE_MIN - OPEN_MIN; // 390

export interface DailyPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function simParams(symbol: string): SimParams | undefined {
  return SIM_PARAMS[symbol.toUpperCase()];
}

function correlation(p: SimParams): number {
  const beta = p.beta ?? 0.3;
  return Math.max(-0.85, Math.min(0.85, beta * 0.55));
}

function meanReversion(symbol: string, p: SimParams): number {
  if (symbol === "VIX") return 0.12;
  if (p.unit === "pct" || p.unit === "fx") return 0.01;
  return 0;
}

const seriesCache = new Map<string, DailyPoint[]>();

/** Full daily series from SIM_START through `through` (inclusive). */
export function dailySeries(symbol: string, through: string): DailyPoint[] {
  const key = `${symbol}|${through}`;
  const hit = seriesCache.get(key);
  if (hit) return hit;
  const p = simParams(symbol);
  if (!p) return [];

  const rho = correlation(p);
  const kappa = meanReversion(symbol, p);
  const dailyVol = p.vol / Math.sqrt(252);
  const dailyDrift = p.drift / 252;

  const raw: { date: string; logClose: number; gap: number; hi: number; lo: number; vol: number }[] = [];
  let x = 0; // log level relative to start
  let d = SIM_START;
  while (d <= through) {
    if (isTradingDay(d)) {
      const m = gaussian(seeded("mkt", d));
      const r1 = seeded(symbol, d);
      const e = gaussian(r1);
      const shock = dailyVol * (rho * m + Math.sqrt(1 - rho * rho) * e);
      const prev = x;
      x = x + dailyDrift + shock - kappa * x;
      const gap = (x - prev) * (0.25 + 0.3 * r1()) + dailyVol * 0.15 * gaussian(r1);
      raw.push({
        date: d,
        logClose: x,
        gap,
        hi: Math.abs(gaussian(r1)) * dailyVol * 0.45,
        lo: Math.abs(gaussian(r1)) * dailyVol * 0.45,
        vol: Math.exp(0.3 * gaussian(r1) + (Math.abs(shock) / dailyVol) * 0.18 - 0.1),
      });
    }
    d = nextTradingDay(d);
  }

  // Normalise so the series passes through the anchor level at SIM_EPOCH.
  const epochPoint = raw.find((r) => r.date >= SIM_EPOCH) ?? raw[raw.length - 1];
  const scale = epochPoint ? p.anchor / Math.exp(epochPoint.logClose) : 1;

  const out: DailyPoint[] = [];
  let prevClose = raw[0] ? Math.exp(raw[0].logClose) * scale : p.anchor;
  for (const r of raw) {
    const close = Math.exp(r.logClose) * scale;
    const open = prevClose * Math.exp(r.gap);
    const high = Math.max(open, close) * Math.exp(r.hi);
    const low = Math.min(open, close) * Math.exp(-r.lo);
    out.push({ date: r.date, open, high, low, close, volume: Math.round(p.avgVolume * r.vol) });
    prevClose = close;
  }
  seriesCache.set(key, out);
  if (seriesCache.size > 400) {
    const first = seriesCache.keys().next().value;
    if (first) seriesCache.delete(first);
  }
  return out;
}

/** Share of daily volume traded by minute m (U-shaped intraday profile). */
function volumeShape(m: number): number {
  const t = m / SESSION_MINUTES;
  return 0.6 + 2.2 * Math.pow(t - 0.5, 2) * 4;
}

const SHAPE_TOTAL = Array.from({ length: SESSION_MINUTES }, (_, m) => volumeShape(m)).reduce((a, b) => a + b, 0);

/**
 * Minute path for a session built as a Brownian bridge from open to close so
 * intraday and daily data always reconcile.
 */
export function intradayPath(symbol: string, day: DailyPoint): number[] {
  const p = simParams(symbol);
  if (!p) return [];
  const rand = seeded(symbol, day.date, "intraday");
  const steps = SESSION_MINUTES;
  const sigma = (p.vol / Math.sqrt(252 * steps)) * 1.1;
  const w: number[] = [0];
  for (let i = 1; i <= steps; i++) w.push((w[i - 1] ?? 0) + sigma * gaussian(rand));
  const target = Math.log(day.close / day.open);
  const wEnd = w[steps] ?? 0;
  return w.map((wi, i) => day.open * Math.exp(wi - (i / steps) * (wEnd - target)));
}

export interface SimQuoteState {
  last: number;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  avgVolume: number;
  sessionDate: string;
  timestamp: string;
  elapsed: number;
}

export function simQuote(symbol: string, now: Date = new Date()): SimQuoteState | null {
  const p = simParams(symbol);
  if (!p) return null;
  const session = currentSessionDate(now);
  const series = dailySeries(symbol, session);
  const today = series[series.length - 1];
  const prev = series[series.length - 2];
  if (!today || !prev) return null;
  const elapsed = sessionMinutesElapsed(session, now);
  const path = intradayPath(symbol, today);
  const upto = Math.max(1, elapsed);
  const slice = path.slice(0, upto + 1);
  let last = slice[slice.length - 1] ?? today.close;
  if (elapsed > 0 && elapsed < SESSION_MINUTES) {
    // sub-minute jitter so polling clients see a live-feeling (but simulated) tape
    const bucket = Math.floor(now.getTime() / 15_000);
    last *= 1 + gaussian(seeded(symbol, bucket)) * (p.vol / Math.sqrt(252 * 390 * 4)) * 0.6;
  }
  const high = Math.max(...slice, last);
  const low = Math.min(...slice, last);
  let volShare = 0;
  for (let m = 0; m < Math.min(elapsed, SESSION_MINUTES); m++) volShare += volumeShape(m);
  const volume = Math.round(today.volume * (volShare / SHAPE_TOTAL));
  const avgVolume = Math.round(series.slice(-31, -1).reduce((a, b) => a + b.volume, 0) / 30);
  const ts =
    elapsed >= SESSION_MINUTES
      ? new Date(nyTimeToUnix(session, CLOSE_MIN) * 1000)
      : new Date(Math.min(now.getTime(), nyTimeToUnix(session, OPEN_MIN + elapsed) * 1000));
  return {
    last,
    prevClose: prev.close,
    open: today.open,
    high: elapsed === 0 ? today.open : high,
    low: elapsed === 0 ? today.open : low,
    volume,
    avgVolume,
    sessionDate: session,
    timestamp: ts.toISOString(),
    elapsed,
  };
}

/** Intraday bars aggregated to `minutes` for one session (only elapsed minutes). */
export function intradayBars(symbol: string, day: DailyPoint, minutes: number, elapsed: number): Bar[] {
  const path = intradayPath(symbol, day);
  const bars: Bar[] = [];
  const limit = Math.min(elapsed, SESSION_MINUTES);
  for (let start = 0; start < limit; start += minutes) {
    const end = Math.min(start + minutes, limit);
    const seg = path.slice(start, end + 1);
    if (seg.length < 2) continue;
    let vol = 0;
    for (let m = start; m < end; m++) vol += volumeShape(m);
    bars.push({
      time: nyTimeToUnix(day.date, OPEN_MIN + start),
      open: seg[0] ?? day.open,
      high: Math.max(...seg),
      low: Math.min(...seg),
      close: seg[seg.length - 1] ?? day.close,
      volume: Math.round(day.volume * (vol / SHAPE_TOTAL)),
    });
  }
  return bars;
}

export function nowSessionInfo(now: Date = new Date()) {
  const session = currentSessionDate(now);
  return { session, elapsed: sessionMinutesElapsed(session, now), ny: nyParts(now) };
}
