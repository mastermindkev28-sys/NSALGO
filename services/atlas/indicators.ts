/** Pure technical-indicator functions. No I/O — unit tested in tests/unit/indicators.test.ts. */
import type { Bar } from "@/types/market";

export function sma(values: number[], period: number): number | null {
  if (values.length < period || period <= 0) return null;
  let s = 0;
  for (let i = values.length - period; i < values.length; i++) s += values[i]!;
  return s / period;
}

export function smaSeries(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let s = 0;
  for (let i = 0; i < values.length; i++) {
    s += values[i]!;
    if (i >= period) s -= values[i - period]!;
    out.push(i >= period - 1 ? s / period : null);
  }
  return out;
}

export function emaSeries(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    if (prev === null) {
      prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    } else {
      prev = values[i]! * k + prev * (1 - k);
    }
    out.push(prev);
  }
  return out;
}

export function ema(values: number[], period: number): number | null {
  const s = emaSeries(values, period);
  return s[s.length - 1] ?? null;
}

/** Wilder RSI. */
export function rsiSeries(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length <= period) return out;
  const value = (g: number, l: number) => (l === 0 ? 100 : 100 - 100 / (1 + g / l));
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i]! - values[i - 1]!;
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgG = gain / period;
  let avgL = loss / period;
  out[period] = value(avgG, avgL);
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i]! - values[i - 1]!;
    avgG = (avgG * (period - 1) + Math.max(0, d)) / period;
    avgL = (avgL * (period - 1) + Math.max(0, -d)) / period;
    out[i] = value(avgG, avgL);
  }
  return out;
}

export function rsi(values: number[], period = 14): number | null {
  const s = rsiSeries(values, period);
  return s[s.length - 1] ?? null;
}

export interface MacdPoint {
  macd: number | null;
  signal: number | null;
  hist: number | null;
}

export function macdSeries(values: number[], fast = 12, slow = 26, signalPeriod = 9): MacdPoint[] {
  const f = emaSeries(values, fast);
  const s = emaSeries(values, slow);
  const line = values.map((_, i) => (f[i] !== null && s[i] !== null ? f[i]! - s[i]! : null));
  const firstIdx = line.findIndex((v) => v !== null);
  const compact = line.filter((v): v is number => v !== null);
  const sig = emaSeries(compact, signalPeriod);
  return line.map((m, i) => {
    if (m === null || firstIdx < 0) return { macd: null, signal: null, hist: null };
    const sv = sig[i - firstIdx] ?? null;
    return { macd: m, signal: sv, hist: sv === null ? null : m - sv };
  });
}

export function trueRanges(bars: Bar[]): number[] {
  return bars.map((b, i) => {
    const prev = i > 0 ? bars[i - 1]!.close : b.open;
    return Math.max(b.high - b.low, Math.abs(b.high - prev), Math.abs(b.low - prev));
  });
}

/** Wilder ATR. */
export function atr(bars: Bar[], period = 14): number | null {
  if (bars.length < period + 1) return null;
  const tr = trueRanges(bars);
  let a = tr.slice(1, period + 1).reduce((x, y) => x + y, 0) / period;
  for (let i = period + 1; i < tr.length; i++) a = (a * (period - 1) + tr[i]!) / period;
  return a;
}

export function vwap(bars: Bar[]): number | null {
  let pv = 0;
  let v = 0;
  for (const b of bars) {
    const typical = (b.high + b.low + b.close) / 3;
    pv += typical * b.volume;
    v += b.volume;
  }
  return v > 0 ? pv / v : null;
}

export function vwapSeries(bars: Bar[]): number[] {
  let pv = 0;
  let v = 0;
  return bars.map((b) => {
    pv += ((b.high + b.low + b.close) / 3) * b.volume;
    v += b.volume;
    return v > 0 ? pv / v : b.close;
  });
}

export function pctReturn(values: number[], lookback: number): number | null {
  if (values.length <= lookback) return null;
  const a = values[values.length - 1 - lookback]!;
  const b = values[values.length - 1]!;
  return a ? ((b - a) / a) * 100 : null;
}

export function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, b) => a + (b - m) ** 2, 0) / (values.length - 1));
}

/** Annualised realised volatility from daily closes (percent). */
export function realizedVol(closes: number[], lookback = 20): number | null {
  if (closes.length <= lookback) return null;
  const rets: number[] = [];
  for (let i = closes.length - lookback; i < closes.length; i++) rets.push(Math.log(closes[i]! / closes[i - 1]!));
  return stdev(rets) * Math.sqrt(252) * 100;
}

/** Slope of a linear regression over the last n values, as % of mean per bar. */
export function slopePct(values: number[], n: number): number | null {
  if (values.length < n) return null;
  const ys = values.slice(-n);
  const xm = (n - 1) / 2;
  const ym = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  ys.forEach((y, x) => {
    num += (x - xm) * (y - ym);
    den += (x - xm) ** 2;
  });
  return den && ym ? (num / den / ym) * 100 : null;
}

/** Kaufman efficiency ratio — 1 = perfectly trending, 0 = pure noise. */
export function efficiencyRatio(values: number[], n: number): number | null {
  if (values.length <= n) return null;
  const change = Math.abs(values[values.length - 1]! - values[values.length - 1 - n]!);
  let path = 0;
  for (let i = values.length - n; i < values.length; i++) path += Math.abs(values[i]! - values[i - 1]!);
  return path ? change / path : null;
}

export function percentileRank(values: number[], x: number): number {
  if (!values.length) return 50;
  return (values.filter((v) => v <= x).length / values.length) * 100;
}

export const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/** Maps x linearly from [a,b] to [0,100] (clamped). */
export function scale(x: number, a: number, b: number): number {
  if (a === b) return 50;
  return clamp(((x - a) / (b - a)) * 100);
}
