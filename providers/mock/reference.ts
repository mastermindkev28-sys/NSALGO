/**
 * ─── MOCK DATA — SIMULATED ───────────────────────────────────────────────────
 * Anchor parameters for the deterministic market simulator. These are NOT
 * market prices. They seed a random walk so the UI can be developed and
 * demonstrated without licensed data. Every value derived from them is
 * labelled "Simulated" throughout the application.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface SimParams {
  anchor: number; // anchor level at SIM_EPOCH
  vol: number; // annualised volatility
  drift: number; // annualised drift
  avgVolume: number;
  marketCap?: number;
  beta?: number;
  decimals?: number;
  unit?: "usd" | "pct" | "index" | "fx" | "pts";
  ivBase?: number;
}

export const SIM_EPOCH = "2026-09-01";

export const SIM_PARAMS: Record<string, SimParams> = {
  SPY: { anchor: 640, vol: 0.15, drift: 0.08, avgVolume: 62_000_000, beta: 1, ivBase: 0.15 },
  QQQ: { anchor: 560, vol: 0.19, drift: 0.1, avgVolume: 41_000_000, beta: 1.15, ivBase: 0.19 },
  IWM: { anchor: 238, vol: 0.21, drift: 0.05, avgVolume: 30_000_000, beta: 1.2, ivBase: 0.22 },
  DIA: { anchor: 470, vol: 0.14, drift: 0.06, avgVolume: 3_400_000, beta: 0.9, ivBase: 0.14 },
  SPX: { anchor: 6400, vol: 0.15, drift: 0.08, avgVolume: 0, unit: "index", beta: 1 },
  NDX: { anchor: 23000, vol: 0.19, drift: 0.1, avgVolume: 0, unit: "index", beta: 1.15 },
  COMP: { anchor: 21000, vol: 0.19, drift: 0.1, avgVolume: 0, unit: "index", beta: 1.15 },
  DJI: { anchor: 47000, vol: 0.14, drift: 0.06, avgVolume: 0, unit: "index", beta: 0.9 },
  RUT: { anchor: 2380, vol: 0.21, drift: 0.05, avgVolume: 0, unit: "index", beta: 1.2 },
  VIX: { anchor: 16, vol: 0.9, drift: 0, avgVolume: 0, unit: "index", beta: -4 },
  ES: { anchor: 6420, vol: 0.15, drift: 0.08, avgVolume: 1_600_000, unit: "pts", beta: 1 },
  NQ: { anchor: 23100, vol: 0.19, drift: 0.1, avgVolume: 600_000, unit: "pts", beta: 1.15 },
  YM: { anchor: 47100, vol: 0.14, drift: 0.06, avgVolume: 150_000, unit: "pts", beta: 0.9 },
  RTY: { anchor: 2390, vol: 0.21, drift: 0.05, avgVolume: 140_000, unit: "pts", beta: 1.2 },
  US2Y: { anchor: 3.6, vol: 0.18, drift: 0, avgVolume: 0, unit: "pct", decimals: 3 },
  US10Y: { anchor: 4.15, vol: 0.14, drift: 0, avgVolume: 0, unit: "pct", decimals: 3 },
  US30Y: { anchor: 4.7, vol: 0.12, drift: 0, avgVolume: 0, unit: "pct", decimals: 3 },
  GC: { anchor: 3500, vol: 0.16, drift: 0.06, avgVolume: 180_000 },
  SI: { anchor: 40, vol: 0.28, drift: 0.04, avgVolume: 70_000 },
  CL: { anchor: 64, vol: 0.32, drift: 0, avgVolume: 320_000 },
  NG: { anchor: 3.4, vol: 0.55, drift: 0, avgVolume: 150_000, decimals: 3 },
  HG: { anchor: 4.7, vol: 0.24, drift: 0.02, avgVolume: 60_000, decimals: 4 },
  DXY: { anchor: 98.5, vol: 0.07, drift: 0, avgVolume: 0, unit: "fx", decimals: 2, beta: -0.2 },
  EURUSD: { anchor: 1.16, vol: 0.07, drift: 0, avgVolume: 0, unit: "fx", decimals: 4 },
  USDJPY: { anchor: 148, vol: 0.09, drift: 0, avgVolume: 0, unit: "fx", decimals: 2 },
  GBPUSD: { anchor: 1.34, vol: 0.08, drift: 0, avgVolume: 0, unit: "fx", decimals: 4 },
  BTCUSD: { anchor: 110_000, vol: 0.5, drift: 0.2, avgVolume: 38_000, beta: 1.5 },
  ETHUSD: { anchor: 4200, vol: 0.65, drift: 0.15, avgVolume: 420_000, beta: 1.7 },
  SOLUSD: { anchor: 210, vol: 0.8, drift: 0.15, avgVolume: 2_600_000, beta: 1.9 },
  XLK: { anchor: 270, vol: 0.21, drift: 0.12, avgVolume: 7_000_000, beta: 1.2 },
  XLC: { anchor: 112, vol: 0.18, drift: 0.09, avgVolume: 5_000_000, beta: 1 },
  XLY: { anchor: 235, vol: 0.2, drift: 0.06, avgVolume: 4_200_000, beta: 1.15 },
  XLF: { anchor: 53, vol: 0.16, drift: 0.07, avgVolume: 38_000_000, beta: 1 },
  XLV: { anchor: 140, vol: 0.14, drift: 0.03, avgVolume: 9_000_000, beta: 0.7 },
  XLI: { anchor: 150, vol: 0.16, drift: 0.07, avgVolume: 9_500_000, beta: 1 },
  XLE: { anchor: 88, vol: 0.24, drift: 0.02, avgVolume: 16_000_000, beta: 0.8 },
  XLP: { anchor: 80, vol: 0.12, drift: 0.02, avgVolume: 10_000_000, beta: 0.55 },
  XLU: { anchor: 84, vol: 0.15, drift: 0.04, avgVolume: 12_000_000, beta: 0.5 },
  XLB: { anchor: 90, vol: 0.18, drift: 0.03, avgVolume: 6_000_000, beta: 0.95 },
  XLRE: { anchor: 42, vol: 0.18, drift: 0.02, avgVolume: 6_500_000, beta: 0.85 },
  SMH: { anchor: 300, vol: 0.32, drift: 0.14, avgVolume: 7_500_000, beta: 1.6, ivBase: 0.34 },
  NVDA: { anchor: 182, vol: 0.46, drift: 0.2, avgVolume: 185_000_000, marketCap: 4.4e12, beta: 1.8, ivBase: 0.44 },
  AAPL: { anchor: 245, vol: 0.26, drift: 0.07, avgVolume: 52_000_000, marketCap: 3.6e12, beta: 1.05, ivBase: 0.25 },
  MSFT: { anchor: 505, vol: 0.24, drift: 0.1, avgVolume: 21_000_000, marketCap: 3.75e12, beta: 1.0, ivBase: 0.23 },
  AMZN: { anchor: 228, vol: 0.31, drift: 0.1, avgVolume: 40_000_000, marketCap: 2.4e12, beta: 1.2, ivBase: 0.3 },
  GOOGL: { anchor: 245, vol: 0.29, drift: 0.1, avgVolume: 32_000_000, marketCap: 2.95e12, beta: 1.05, ivBase: 0.28 },
  META: { anchor: 760, vol: 0.34, drift: 0.12, avgVolume: 12_000_000, marketCap: 1.9e12, beta: 1.25, ivBase: 0.33 },
  TSLA: { anchor: 420, vol: 0.62, drift: 0.05, avgVolume: 95_000_000, marketCap: 1.35e12, beta: 2.0, ivBase: 0.58 },
  AMD: { anchor: 165, vol: 0.52, drift: 0.12, avgVolume: 48_000_000, marketCap: 2.7e11, beta: 1.9, ivBase: 0.5 },
  AVGO: { anchor: 340, vol: 0.44, drift: 0.16, avgVolume: 22_000_000, marketCap: 1.6e12, beta: 1.6, ivBase: 0.42 },
  NFLX: { anchor: 1220, vol: 0.34, drift: 0.1, avgVolume: 3_800_000, marketCap: 5.2e11, beta: 1.2, ivBase: 0.32 },
  CRM: { anchor: 250, vol: 0.32, drift: 0.04, avgVolume: 7_000_000, marketCap: 2.4e11, beta: 1.15, ivBase: 0.31 },
  ORCL: { anchor: 290, vol: 0.4, drift: 0.14, avgVolume: 14_000_000, marketCap: 8.1e11, beta: 1.3, ivBase: 0.38 },
  PLTR: { anchor: 180, vol: 0.66, drift: 0.2, avgVolume: 70_000_000, marketCap: 4.2e11, beta: 2.2, ivBase: 0.62 },
  MU: { anchor: 150, vol: 0.5, drift: 0.12, avgVolume: 26_000_000, marketCap: 1.7e11, beta: 1.7, ivBase: 0.48 },
  INTC: { anchor: 28, vol: 0.5, drift: 0, avgVolume: 90_000_000, marketCap: 1.2e11, beta: 1.3, ivBase: 0.5 },
  JPM: { anchor: 305, vol: 0.22, drift: 0.08, avgVolume: 9_000_000, marketCap: 8.4e11, beta: 1.05, ivBase: 0.21 },
  GS: { anchor: 780, vol: 0.27, drift: 0.09, avgVolume: 2_300_000, marketCap: 2.4e11, beta: 1.3, ivBase: 0.26 },
  BAC: { anchor: 50, vol: 0.25, drift: 0.06, avgVolume: 38_000_000, marketCap: 3.8e11, beta: 1.2, ivBase: 0.24 },
  V: { anchor: 345, vol: 0.19, drift: 0.07, avgVolume: 6_500_000, marketCap: 6.7e11, beta: 0.9, ivBase: 0.19 },
  COIN: { anchor: 330, vol: 0.72, drift: 0.1, avgVolume: 11_000_000, marketCap: 8.4e10, beta: 2.5, ivBase: 0.68 },
  UNH: { anchor: 320, vol: 0.36, drift: -0.02, avgVolume: 9_000_000, marketCap: 2.9e11, beta: 0.7, ivBase: 0.34 },
  LLY: { anchor: 800, vol: 0.32, drift: 0.08, avgVolume: 3_900_000, marketCap: 7.2e11, beta: 0.6, ivBase: 0.31 },
  XOM: { anchor: 114, vol: 0.22, drift: 0.02, avgVolume: 15_000_000, marketCap: 4.9e11, beta: 0.8, ivBase: 0.22 },
  CVX: { anchor: 158, vol: 0.23, drift: 0.02, avgVolume: 8_000_000, marketCap: 2.8e11, beta: 0.85, ivBase: 0.23 },
  CAT: { anchor: 460, vol: 0.28, drift: 0.08, avgVolume: 2_800_000, marketCap: 2.2e11, beta: 1.1, ivBase: 0.27 },
  BA: { anchor: 225, vol: 0.34, drift: 0.04, avgVolume: 8_500_000, marketCap: 1.7e11, beta: 1.4, ivBase: 0.33 },
  WMT: { anchor: 102, vol: 0.19, drift: 0.07, avgVolume: 17_000_000, marketCap: 8.2e11, beta: 0.55, ivBase: 0.19 },
  COST: { anchor: 950, vol: 0.2, drift: 0.07, avgVolume: 2_100_000, marketCap: 4.2e11, beta: 0.75, ivBase: 0.2 },
  HD: { anchor: 405, vol: 0.22, drift: 0.04, avgVolume: 3_600_000, marketCap: 4.0e11, beta: 1.0, ivBase: 0.22 },
  DIS: { anchor: 118, vol: 0.26, drift: 0.03, avgVolume: 9_000_000, marketCap: 2.1e11, beta: 1.1, ivBase: 0.26 },
  UBER: { anchor: 96, vol: 0.4, drift: 0.1, avgVolume: 19_000_000, marketCap: 2.0e11, beta: 1.4, ivBase: 0.39 },
  SHOP: { anchor: 150, vol: 0.52, drift: 0.12, avgVolume: 9_000_000, marketCap: 1.9e11, beta: 1.8, ivBase: 0.5 },
  SMCI: { anchor: 45, vol: 0.85, drift: 0.05, avgVolume: 28_000_000, marketCap: 2.7e10, beta: 2.4, ivBase: 0.8 },
  ARM: { anchor: 150, vol: 0.62, drift: 0.12, avgVolume: 6_000_000, marketCap: 1.6e11, beta: 2.1, ivBase: 0.6 },
};

/** Market factor weight for simulated cross-asset correlation. */
export const MARKET_FACTOR_SYMBOL = "__MKT__";
