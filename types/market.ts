export type AssetClass = "equity" | "etf" | "index" | "future" | "fx" | "crypto" | "commodity" | "rate";

export interface SymbolInfo {
  symbol: string;
  name: string;
  exchange: string;
  assetClass: AssetClass;
  sector?: string;
  industry?: string;
  marketCap?: number;
}

export interface Quote {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  last: number | null;
  change: number | null;
  changePercent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  prevClose: number | null;
  volume: number | null;
  avgVolume: number | null;
  /** ISO timestamp of the last trade / print. */
  timestamp: string | null;
  marketState: MarketSessionState;
  /** Unit hint for rendering: yields are percentages, FX has 4 decimals. */
  unit?: "usd" | "pct" | "index" | "fx" | "pts";
}

export type MarketSessionState = "pre" | "open" | "post" | "closed";

export interface MarketStatus {
  state: MarketSessionState;
  label: string;
  nextChange: string | null;
  exchange: string;
}

export interface Bar {
  /** Unix seconds (UTC). */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type HistoryRange = "1D" | "5D" | "1M" | "3M" | "6M" | "YTD" | "1Y" | "5Y";
export type HistoryInterval = "1m" | "5m" | "15m" | "1h" | "1d" | "1w";

export interface MoverRow extends Quote {
  relativeVolume: number | null;
}

export type MoverKind = "gainers" | "losers" | "active" | "unusual-volume";

export interface SectorPerformance {
  sector: string;
  etf: string;
  changePercent: number | null;
  relativeStrength: number | null;
}

export interface BreadthSnapshot {
  advancers: number | null;
  decliners: number | null;
  unchanged: number | null;
  newHighs: number | null;
  newLows: number | null;
  pctAbove50d: number | null;
  pctAbove200d: number | null;
  universe: string;
}
