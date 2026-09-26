/**
 * Feature engineering — turns normalised bars into the measurable quantities
 * the factor modules score. Pure and deterministic.
 */
import type { Bar } from "@/types/market";
import {
  atr,
  efficiencyRatio,
  ema,
  macdSeries,
  pctReturn,
  percentileRank,
  realizedVol,
  rsi,
  sma,
  slopePct,
  vwap,
} from "./indicators";

export interface Features {
  price: number;
  prevClose: number | null;
  changePct: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema9: number | null;
  ema21: number | null;
  slope50: number | null; // % per bar
  rsi14: number | null;
  macdHist: number | null;
  macdHistPrev: number | null;
  ret5: number | null;
  ret20: number | null;
  ret60: number | null;
  rs20: number | null; // excess return vs benchmark, pct points
  rs60: number | null;
  atr14: number | null;
  atrPct: number | null;
  atrPctile: number | null; // ATR% percentile vs past 120 sessions
  realizedVol20: number | null;
  rvol: number | null; // today's volume vs 20d avg, time-of-day adjusted
  upDownVolRatio: number | null; // 20d up-day volume / down-day volume
  avgDollarVolume: number | null;
  high20: number | null;
  low20: number | null;
  high52: number | null;
  low52: number | null;
  pctFromHigh52: number | null;
  breakout20: boolean;
  breakdown20: boolean;
  higherLows: boolean | null;
  efficiency20: number | null;
  vwap: number | null;
  aboveVwap: boolean | null;
  gapPct: number | null;
  bars: number;
}

export interface FeatureInput {
  daily: Bar[]; // oldest → newest; last bar may be the in-progress session
  intraday?: Bar[]; // current session bars (for VWAP)
  benchmark?: Bar[]; // SPY daily
  sessionFraction?: number; // 0–1 of the regular session elapsed
}

export function computeFeatures({ daily, intraday, benchmark, sessionFraction = 1 }: FeatureInput): Features | null {
  if (daily.length < 30) return null;
  const closes = daily.map((b) => b.close);
  const last = daily[daily.length - 1]!;
  const prev = daily[daily.length - 2];
  const price = last.close;

  const macd = macdSeries(closes);
  const histNow = macd[macd.length - 1]?.hist ?? null;
  const histPrev = macd[macd.length - 2]?.hist ?? null;

  const atrNow = atr(daily, 14);
  const atrPctSeries: number[] = [];
  for (let i = Math.max(30, daily.length - 120); i < daily.length; i++) {
    const a = atr(daily.slice(Math.max(0, i - 40), i + 1), 14);
    const c = daily[i]!.close;
    if (a && c) atrPctSeries.push((a / c) * 100);
  }
  const atrPct = atrNow ? (atrNow / price) * 100 : null;

  const vols = daily.slice(-21, -1).map((b) => b.volume);
  const avgVol = vols.length ? vols.reduce((a, b) => a + b, 0) / vols.length : 0;
  const frac = Math.max(0.05, Math.min(1, sessionFraction));
  const rvol = avgVol > 0 ? last.volume / (avgVol * frac) : null;

  let upVol = 0;
  let downVol = 0;
  daily.slice(-20).forEach((b, i, arr) => {
    const p = i > 0 ? arr[i - 1]!.close : b.open;
    if (b.close >= p) upVol += b.volume;
    else downVol += b.volume;
  });

  const window20 = daily.slice(-21, -1);
  const high20 = window20.length ? Math.max(...window20.map((b) => b.high)) : null;
  const low20 = window20.length ? Math.min(...window20.map((b) => b.low)) : null;
  const yr = daily.slice(-252);
  const high52 = Math.max(...yr.map((b) => b.high));
  const low52 = Math.min(...yr.map((b) => b.low));

  // Higher lows: the lowest low of each of the last three 10-bar windows is rising.
  let higherLows: boolean | null = null;
  if (daily.length >= 30) {
    const w = [daily.slice(-30, -20), daily.slice(-20, -10), daily.slice(-10)].map((s) => Math.min(...s.map((b) => b.low)));
    higherLows = w[0]! < w[1]! && w[1]! < w[2]!;
  }

  let rs20: number | null = null;
  let rs60: number | null = null;
  if (benchmark && benchmark.length > 61) {
    const bc = benchmark.map((b) => b.close);
    const r20 = pctReturn(closes, 20);
    const b20 = pctReturn(bc, 20);
    const r60 = pctReturn(closes, 60);
    const b60 = pctReturn(bc, 60);
    rs20 = r20 !== null && b20 !== null ? r20 - b20 : null;
    rs60 = r60 !== null && b60 !== null ? r60 - b60 : null;
  }

  const vw = intraday && intraday.length ? vwap(intraday) : null;
  const avgDollar = avgVol * (sma(closes, 20) ?? price);

  return {
    price,
    prevClose: prev?.close ?? null,
    changePct: prev ? ((price - prev.close) / prev.close) * 100 : null,
    sma20: sma(closes, 20),
    sma50: sma(closes, 50),
    sma200: sma(closes, 200),
    ema9: ema(closes, 9),
    ema21: ema(closes, 21),
    slope50: slopePct(closes, 50),
    rsi14: rsi(closes, 14),
    macdHist: histNow,
    macdHistPrev: histPrev,
    ret5: pctReturn(closes, 5),
    ret20: pctReturn(closes, 20),
    ret60: pctReturn(closes, 60),
    rs20,
    rs60,
    atr14: atrNow,
    atrPct,
    atrPctile: atrPct !== null && atrPctSeries.length > 20 ? percentileRank(atrPctSeries, atrPct) : null,
    realizedVol20: realizedVol(closes, 20),
    rvol: rvol !== null ? Math.round(rvol * 100) / 100 : null,
    upDownVolRatio: downVol > 0 ? upVol / downVol : null,
    avgDollarVolume: avgDollar || null,
    high20,
    low20,
    high52,
    low52,
    pctFromHigh52: high52 ? ((price - high52) / high52) * 100 : null,
    breakout20: high20 !== null && price > high20,
    breakdown20: low20 !== null && price < low20,
    higherLows,
    efficiency20: efficiencyRatio(closes, 20),
    vwap: vw,
    aboveVwap: vw !== null ? price >= vw : null,
    gapPct: prev ? ((last.open - prev.close) / prev.close) * 100 : null,
    bars: daily.length,
  };
}
