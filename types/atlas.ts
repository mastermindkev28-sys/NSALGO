import type { OptionRight } from "./options";

export type AtlasMode = "day" | "swing";
export type Direction = "long" | "short";

export const FACTOR_KEYS = [
  "trend",
  "momentum",
  "volume",
  "relativeStrength",
  "volatility",
  "optionsFlow",
  "openInterest",
  "liquidity",
  "technicalStructure",
  "catalysts",
  "newsSentiment",
  "marketRegime",
  "sectorStrength",
  "marketBreadth",
  "economicCalendar",
  "earningsCalendar",
] as const;

export type FactorKey = (typeof FACTOR_KEYS)[number];

export type FactorWeights = Record<FactorKey, number>;

/**
 * One factor's contribution. `score` is null when the inputs it needs are
 * unavailable — the engine re-normalises weights over what it could measure
 * and reports coverage, rather than inventing a value.
 */
export interface FactorResult {
  key: FactorKey;
  label: string;
  score: number | null; // 0–100, direction-adjusted
  weight: number; // effective weight after normalisation (0–1)
  signal: "supportive" | "neutral" | "adverse" | "unavailable";
  evidence: string[];
  inputs: Record<string, number | string | boolean | null>;
}

export interface AtlasScore {
  value: number; // 0–100 ranking
  grade: "A" | "B" | "C" | "D";
  coverage: number; // 0–1 share of configured weight that had data
  components: FactorResult[];
  configVersion: string;
  computedAt: string;
}

export type RegimeLabel = "risk-on" | "risk-off" | "mixed";
export type VolRegime = "high-volatility" | "normal-volatility" | "low-volatility";
export type TrendRegime = "trend" | "range";

export interface RegimeSignal {
  label: string;
  value: string;
  reading: "positive" | "negative" | "neutral" | "unavailable";
}

export interface MarketRegime {
  risk: RegimeLabel;
  volatility: VolRegime;
  structure: TrendRegime;
  riskEnvironment: "constructive" | "cautious" | "defensive";
  score: number | null; // -100 … +100
  signals: RegimeSignal[];
  summary: string;
  computedAt: string;
  coverage: number;
}

export type SetupStatus = "generated" | "active" | "triggered" | "invalidated" | "target-reached" | "expired";

export type TradeType =
  | "stock"
  | "long-call"
  | "long-put"
  | "call-debit-spread"
  | "put-debit-spread"
  | "put-credit-spread"
  | "call-credit-spread";

export interface OptionLeg {
  contract: string;
  right: OptionRight;
  action: "buy" | "sell";
  strike: number;
  expiration: string;
  dte: number;
  delta: number | null;
  iv: number | null;
  openInterest: number | null;
  volume: number | null;
  bid: number | null;
  ask: number | null;
}

export interface OptionsPlan {
  legs: OptionLeg[];
  ivRank: number | null;
  spreadPct: number | null;
  estimatedDebit: number | null; // per contract, USD
  estimatedCredit: number | null;
  maxRisk: number | null; // per contract, USD
  maxReward: number | null; // per contract, USD; null = uncapped
  liquidityNote: string;
}

export type CatalystKind =
  | "earnings"
  | "economic-event"
  | "news"
  | "sector-move"
  | "technical-breakout"
  | "options-activity";

export interface Catalyst {
  kind: CatalystKind;
  label: string;
  date: string | null;
  reference: string | null; // article id / event id / url
}

export interface SetupExplanation {
  whyItAppeared: string;
  risks: string;
  catalystSummary: string;
  thesis: string;
  generatedBy: string; // provider + model, or "template"
  /** Structured inputs supplied to the explanation generator, retained verbatim. */
  inputsDigest: Record<string, unknown>;
  generatedAt: string;
}

export interface AtlasSetup {
  id: string;
  symbol: string;
  name: string;
  assetClass: "equity" | "etf";
  sector: string | null;
  mode: AtlasMode;
  direction: Direction;
  tradeType: TradeType;
  score: AtlasScore;
  trend: "up" | "down" | "sideways";
  momentum: "strong" | "moderate" | "weak";
  volumeState: "elevated" | "normal" | "light";
  volatilityState: "expanding" | "stable" | "contracting";
  marketAlignment: "aligned" | "neutral" | "counter";
  price: number;
  entry: { low: number; high: number };
  target: { low: number; high: number };
  invalidation: number;
  riskReward: number | null;
  holdingHorizon: string;
  options: OptionsPlan | null;
  catalysts: Catalyst[];
  confirmations: { label: string; met: boolean; detail: string }[];
  explanation: SetupExplanation;
  status: SetupStatus;
  statusHistory: { status: SetupStatus; at: string; price: number | null }[];
  generatedAt: string;
  expiresAt: string;
  dataMode: "mock" | "live" | "delayed";
}

export interface AtlasSetupOutcome {
  setupId: string;
  symbol: string;
  mode: AtlasMode;
  direction: Direction;
  score: number;
  generatedAt: string;
  entryMid: number;
  targetMid: number;
  invalidation: number;
  status: SetupStatus;
  closedAt: string | null;
  returnPct: number | null;
}

export interface AtlasConfig {
  version: string;
  weights: Record<AtlasMode, FactorWeights>;
  thresholds: {
    minScore: number;
    minCoverage: number;
    maxSetupsPerRun: number;
    minOptionOpenInterest: number;
    maxOptionSpreadPct: number;
  };
  universe: string[];
  featuredTickers: string[];
  updatedAt: string;
  updatedBy: string | null;
}
