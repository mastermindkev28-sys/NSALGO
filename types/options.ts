export type OptionRight = "call" | "put";

export interface OptionContract {
  contract: string; // OCC symbol, e.g. O:NVDA261016C00190000
  underlying: string;
  right: OptionRight;
  strike: number;
  expiration: string; // YYYY-MM-DD
  dte: number;
  bid: number | null;
  ask: number | null;
  last: number | null;
  mark: number | null;
  volume: number | null;
  openInterest: number | null;
  impliedVolatility: number | null; // decimal, 0.42 = 42%
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
}

export interface OptionChain {
  underlying: string;
  underlyingPrice: number | null;
  expirations: string[];
  expiration: string;
  calls: OptionContract[];
  puts: OptionContract[];
  /** IV rank requires a year of IV history; null when the provider can't supply it. */
  ivRank: number | null;
  atmIv: number | null;
}

/**
 * Trade classifications are only populated when the provider supplies them.
 * `null` means unknown — the UI must say so rather than guess.
 */
export type FlowExecution = "sweep" | "block" | "split" | "single" | null;
export type FlowSide = "ask" | "bid" | "mid" | null;
export type FlowIntent = "opening" | "closing" | null;
export type FlowSentiment = "bullish" | "bearish" | "neutral" | null;

export interface OptionsFlowPrint {
  id: string;
  timestamp: string;
  underlying: string;
  right: OptionRight;
  strike: number;
  expiration: string;
  dte: number;
  premium: number;
  contracts: number;
  price: number;
  spot: number | null;
  volume: number | null;
  openInterest: number | null;
  impliedVolatility: number | null;
  execution: FlowExecution;
  side: FlowSide;
  intent: FlowIntent;
  sentiment: FlowSentiment;
  source: string;
}

export interface FlowFilter {
  symbol?: string;
  right?: OptionRight;
  minPremium?: number;
  sentiment?: Exclude<FlowSentiment, null>;
  execution?: Exclude<FlowExecution, null>;
  unusualOnly?: boolean;
  limit?: number;
}

export interface OptionsScanFilter {
  symbols?: string[];
  right?: OptionRight;
  minDte?: number;
  maxDte?: number;
  minDelta?: number;
  maxDelta?: number;
  minIv?: number;
  maxIv?: number;
  minVolume?: number;
  minOpenInterest?: number;
  minVolOi?: number;
  maxSpreadPct?: number;
  minPremium?: number;
  preset?: "most-active" | "unusual" | "high-vol-oi" | "large-premium" | "high-iv" | "low-iv" | "directional";
}

export interface OptionsScanRow extends OptionContract {
  volOi: number | null;
  spreadPct: number | null;
  premiumTraded: number | null;
  underlyingPrice: number | null;
  underlyingTrend: "up" | "down" | "flat" | null;
}
