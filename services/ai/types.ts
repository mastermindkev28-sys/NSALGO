/**
 * AI layer contracts. The AI *explains* signals computed by the Atlas engine —
 * it never produces prices, levels or scores. Every call receives a structured
 * digest and every output is stored alongside that digest.
 */

export interface SetupDigest {
  symbol: string;
  name: string;
  mode: "day" | "swing";
  direction: "long" | "short";
  tradeType: string;
  atlasScore: number;
  coverage: number;
  price: number;
  entry: { low: number; high: number };
  target: { low: number; high: number };
  invalidation: number;
  riskReward: number | null;
  regime: string;
  factors: { factor: string; score: number | null; evidence: string[] }[];
  catalysts: string[];
  confirmations: { label: string; met: boolean }[];
  options: { structure: string; ivRank: number | null; legs: string[] } | null;
}

export interface SetupNarrative {
  whyItAppeared: string;
  risks: string;
  catalystSummary: string;
  thesis: string;
}

export interface MarketDigest {
  regime: { label: string; summary: string; signals: { label: string; value: string }[] };
  indices: { symbol: string; changePercent: number | null }[];
  leaders: { symbol: string; changePercent: number | null }[];
  laggards: { symbol: string; changePercent: number | null }[];
  headlines: string[];
  upcomingEvents: string[];
}

export interface MarketNarrative {
  headline: string;
  summary: string;
  watch: string[];
}

export interface NewsImpactDigest {
  headline: string;
  summary: string | null;
  tickers: { symbol: string; changePercent: number | null }[];
  categories: string[];
}

export interface AIProvider {
  readonly id: string;
  readonly model: string;
  explainSetup(d: SetupDigest): Promise<SetupNarrative | null>;
  summarizeMarket(d: MarketDigest): Promise<MarketNarrative | null>;
  healthCheck(): Promise<{ ok: boolean; message: string }>;
}
