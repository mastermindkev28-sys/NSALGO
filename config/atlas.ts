import type { AtlasConfig, FactorKey, FactorWeights } from "@/types/atlas";

/**
 * Default ATLAS configuration. Admins override weights and thresholds from
 * Admin → Atlas Configuration; overrides are versioned in atlas_config.
 * The engine never hardcodes weights — it always reads the active config.
 */
export const FACTOR_LABELS: Record<FactorKey, { label: string; description: string }> = {
  trend: { label: "Trend", description: "Price relative to 20/50/200-day averages and the slope of the 50-day." },
  momentum: { label: "Momentum", description: "RSI zone, MACD histogram direction and 20-session rate of change." },
  volume: { label: "Volume", description: "Relative volume versus the 20-day average and up/down volume balance." },
  relativeStrength: { label: "Relative Strength", description: "Performance versus SPY over 20 and 60 sessions." },
  volatility: { label: "Volatility", description: "ATR regime: expansion from contraction scores higher than disorderly spikes." },
  optionsFlow: { label: "Options Flow", description: "Net directional premium in classified options prints, where the provider supplies side." },
  openInterest: { label: "Open Interest", description: "Call/put open-interest balance in near-term expirations." },
  liquidity: { label: "Liquidity", description: "Average dollar volume and at-the-money options bid/ask width." },
  technicalStructure: { label: "Technical Structure", description: "Breakouts, proximity to 52-week extremes and higher-low structure." },
  catalysts: { label: "Catalysts", description: "Identifiable catalysts: news flow, sector moves, technical triggers." },
  newsSentiment: { label: "News Sentiment", description: "Provider-supplied sentiment on recent symbol-tagged articles." },
  marketRegime: { label: "Market Regime", description: "Alignment of the setup direction with the prevailing market regime." },
  sectorStrength: { label: "Sector Strength", description: "Sector ETF performance relative to the S&P 500." },
  marketBreadth: { label: "Market Breadth", description: "Advance/decline participation aligned with the setup direction." },
  economicCalendar: { label: "Economic Calendar", description: "Penalises exposure into high-importance macro releases." },
  earningsCalendar: { label: "Earnings Calendar", description: "Penalises binary earnings risk inside the holding horizon." },
};

const DAY: FactorWeights = {
  trend: 10,
  momentum: 14,
  volume: 12,
  relativeStrength: 8,
  volatility: 7,
  optionsFlow: 9,
  openInterest: 3,
  liquidity: 8,
  technicalStructure: 8,
  catalysts: 5,
  newsSentiment: 4,
  marketRegime: 6,
  sectorStrength: 3,
  marketBreadth: 3,
  economicCalendar: 3,
  earningsCalendar: 2,
};

const SWING: FactorWeights = {
  trend: 15,
  momentum: 10,
  volume: 8,
  relativeStrength: 12,
  volatility: 6,
  optionsFlow: 5,
  openInterest: 3,
  liquidity: 5,
  technicalStructure: 12,
  catalysts: 4,
  newsSentiment: 3,
  marketRegime: 6,
  sectorStrength: 5,
  marketBreadth: 3,
  economicCalendar: 1,
  earningsCalendar: 5,
};

export const DEFAULT_UNIVERSE = [
  "NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA", "AMD", "AVGO", "NFLX", "CRM", "ORCL", "PLTR", "MU",
  "INTC", "JPM", "GS", "BAC", "V", "COIN", "UNH", "LLY", "XOM", "CVX", "CAT", "BA", "WMT", "COST", "HD", "DIS",
  "UBER", "SHOP", "SMCI", "ARM", "SPY", "QQQ", "IWM",
];

export const DEFAULT_ATLAS_CONFIG: AtlasConfig = {
  version: "2026.09-default",
  weights: { day: DAY, swing: SWING },
  thresholds: {
    minScore: 55,
    minCoverage: 0.6,
    maxSetupsPerRun: 12,
    minOptionOpenInterest: 250,
    maxOptionSpreadPct: 12,
  },
  universe: DEFAULT_UNIVERSE,
  featuredTickers: ["NVDA", "AAPL", "TSLA", "AMD", "META", "MSFT"],
  updatedAt: "2026-09-01T00:00:00.000Z",
  updatedBy: null,
};

export function gradeFor(score: number): "A" | "B" | "C" | "D" {
  if (score >= 80) return "A";
  if (score >= 67) return "B";
  if (score >= 52) return "C";
  return "D";
}

export const SCORE_DISCLAIMER =
  "The ATLAS score ranks how strongly current data aligns with a setup's criteria. It is an analytical ranking, not a prediction or a probability of profit.";
