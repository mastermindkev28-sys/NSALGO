/**
 * Factor modules. Each factor is a small pure function that scores one
 * dimension 0–100 *for the setup's direction* and records the evidence and
 * inputs it used. A factor returns score=null when its inputs are unavailable;
 * it never substitutes a default.
 */
import { FACTOR_LABELS } from "@/config/atlas";
import type { AtlasMode, Catalyst, Direction, FactorKey, FactorResult, MarketRegime } from "@/types/atlas";
import type { BreadthSnapshot, SectorPerformance } from "@/types/market";
import type { Features } from "./features";
import { clamp, scale } from "./indicators";

export interface FlowSummary {
  bullishPremium: number;
  bearishPremium: number;
  classified: number;
  total: number;
}

export interface ChainSummary {
  callOi: number | null;
  putOi: number | null;
  atmSpreadPct: number | null;
  ivRank: number | null;
  atmIv: number | null;
}

export interface NewsSummary {
  count: number;
  positive: number;
  negative: number;
  withSentiment: number;
}

export interface FactorContext {
  mode: AtlasMode;
  direction: Direction;
  f: Features;
  regime: MarketRegime | null;
  sector: SectorPerformance | null;
  breadth: BreadthSnapshot | null;
  flow: FlowSummary | null;
  chain: ChainSummary | null;
  news: NewsSummary | null;
  /** days until next earnings; null = none in window; undefined = calendar unavailable */
  earningsInDays: number | null | undefined;
  /** high-importance macro releases within the next session; undefined = unavailable */
  macroEventsSoon: number | undefined;
  catalysts: Catalyst[];
}

type Raw = { score: number | null; evidence: string[]; inputs: FactorResult["inputs"] };
const none = (reason: string): Raw => ({ score: null, evidence: [reason], inputs: {} });

const r1 = (n: number | null | undefined, d = 1) => (n === null || n === undefined ? null : Math.round(n * 10 ** d) / 10 ** d);
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

/** Flip a long-oriented score for short setups. */
const orient = (score: number, dir: Direction) => (dir === "long" ? score : 100 - score);

const FACTORS: Record<FactorKey, (c: FactorContext) => Raw> = {
  trend({ f, direction }): Raw {
    if (f.sma50 === null) return none("Insufficient history for trend averages.");
    let s = 50;
    const ev: string[] = [];
    if (f.sma20 !== null) {
      s += f.price > f.sma20 ? 12 : -12;
      ev.push(`Price ${f.price > f.sma20 ? "above" : "below"} 20-day average (${f.sma20.toFixed(2)}).`);
    }
    s += f.price > f.sma50 ? 12 : -12;
    ev.push(`Price ${f.price > f.sma50 ? "above" : "below"} 50-day average (${f.sma50.toFixed(2)}).`);
    if (f.sma200 !== null) {
      s += f.price > f.sma200 ? 10 : -10;
      if (f.sma50 > f.sma200) s += 6;
      else s -= 6;
    }
    if (f.slope50 !== null) {
      s += clamp(f.slope50 * 60, -12, 12);
      ev.push(`50-day slope ${f.slope50 >= 0 ? "rising" : "falling"} (${fmtPct(f.slope50 * 50)} over 50 sessions).`);
    }
    return { score: orient(clamp(s), direction), evidence: ev, inputs: { price: r1(f.price, 2), sma20: r1(f.sma20, 2), sma50: r1(f.sma50, 2), sma200: r1(f.sma200, 2), slope50: r1(f.slope50, 3) } };
  },

  momentum({ f, direction }): Raw {
    if (f.rsi14 === null) return none("RSI unavailable.");
    const ev: string[] = [];
    // Long sweet spot 55–70; short mirror 30–45. Overextension is penalised.
    const rsiL = f.rsi14;
    let s = rsiL >= 55 && rsiL <= 70 ? 78 : rsiL > 70 && rsiL <= 78 ? 64 : rsiL > 78 ? 45 : rsiL >= 45 ? 50 : rsiL >= 30 ? 30 : 38;
    ev.push(`RSI(14) at ${rsiL.toFixed(1)}.`);
    if (f.macdHist !== null) {
      const rising = f.macdHistPrev !== null && f.macdHist > f.macdHistPrev;
      s += f.macdHist > 0 ? 8 : -8;
      s += rising ? 5 : -5;
      ev.push(`MACD histogram ${f.macdHist > 0 ? "positive" : "negative"} and ${rising ? "expanding" : "contracting"}.`);
    }
    if (f.ret20 !== null) {
      s += clamp(f.ret20 * 1.2, -12, 12);
      ev.push(`20-session rate of change ${fmtPct(f.ret20)}.`);
    }
    const score = direction === "long" ? clamp(s) : clamp(100 - s + (rsiL > 78 ? -10 : 0));
    return { score, evidence: ev, inputs: { rsi14: r1(f.rsi14), macdHist: r1(f.macdHist, 3), ret20: r1(f.ret20, 2) } };
  },

  volume({ f, direction }): Raw {
    if (f.rvol === null) return none("Volume data unavailable.");
    const ev = [`Relative volume ${f.rvol.toFixed(2)}× the 20-day average.`];
    let s = scale(f.rvol, 0.6, 2.5);
    if (f.upDownVolRatio !== null) {
      const acc = direction === "long" ? f.upDownVolRatio : 1 / Math.max(0.01, f.upDownVolRatio);
      s = s * 0.65 + scale(acc, 0.6, 1.8) * 0.35;
      ev.push(`Up/down volume balance ${f.upDownVolRatio.toFixed(2)} over 20 sessions.`);
    }
    return { score: clamp(s), evidence: ev, inputs: { rvol: f.rvol, upDownVolRatio: r1(f.upDownVolRatio, 2) } };
  },

  relativeStrength({ f, direction }): Raw {
    if (f.rs20 === null) return none("Benchmark comparison unavailable.");
    const rs = f.rs20 * 0.6 + (f.rs60 ?? f.rs20) * 0.4;
    const ev = [`${fmtPct(f.rs20)} vs SPY over 20 sessions${f.rs60 !== null ? `, ${fmtPct(f.rs60)} over 60` : ""}.`];
    return { score: orient(scale(rs, -8, 8), direction), evidence: ev, inputs: { rs20: r1(f.rs20, 2), rs60: r1(f.rs60, 2) } };
  },

  volatility({ f, mode }): Raw {
    if (f.atrPct === null || f.atrPctile === null) return none("Volatility history unavailable.");
    // Moderate, expanding volatility suits day trades; contraction-then-expansion suits swings.
    const p = f.atrPctile;
    const s = mode === "day" ? (p >= 40 && p <= 85 ? 75 : p > 85 ? 45 : 50) : p <= 35 ? 72 : p <= 70 ? 60 : 42;
    const state = p > 70 ? "expanded" : p < 30 ? "contracted" : "mid-range";
    return {
      score: s,
      evidence: [`ATR ${f.atrPct.toFixed(2)}% of price — ${state} (${p.toFixed(0)}th percentile of 6 months).`],
      inputs: { atrPct: r1(f.atrPct, 2), atrPercentile: r1(p, 0) },
    };
  },

  optionsFlow({ flow, direction }): Raw {
    if (!flow || flow.classified === 0) return none("Classified options flow unavailable for this symbol.");
    const net = flow.bullishPremium - flow.bearishPremium;
    const gross = flow.bullishPremium + flow.bearishPremium || 1;
    const bias = net / gross; // -1 … +1
    return {
      score: orient(scale(bias, -0.8, 0.8), direction),
      evidence: [`${flow.classified} classified prints; net ${bias >= 0 ? "bullish" : "bearish"} premium ${Math.abs(bias * 100).toFixed(0)}% of directional total.`],
      inputs: { bullishPremium: Math.round(flow.bullishPremium), bearishPremium: Math.round(flow.bearishPremium), classifiedPrints: flow.classified },
    };
  },

  openInterest({ chain, direction }): Raw {
    if (!chain || chain.callOi === null || chain.putOi === null || chain.callOi + chain.putOi === 0) {
      return none("Open interest unavailable.");
    }
    const ratio = chain.putOi / Math.max(1, chain.callOi);
    return {
      score: orient(scale(-Math.log(ratio), -0.7, 0.7), direction),
      evidence: [`Front-month put/call open-interest ratio ${ratio.toFixed(2)}.`],
      inputs: { callOi: chain.callOi, putOi: chain.putOi, putCallOiRatio: r1(ratio, 2) },
    };
  },

  liquidity({ f, chain }): Raw {
    if (f.avgDollarVolume === null) return none("Liquidity data unavailable.");
    let s = scale(Math.log10(f.avgDollarVolume), 7.5, 10);
    const ev = [`Average daily dollar volume ≈ $${(f.avgDollarVolume / 1e6).toFixed(0)}M.`];
    if (chain?.atmSpreadPct != null) {
      s = s * 0.6 + scale(-chain.atmSpreadPct, -12, -1) * 0.4;
      ev.push(`At-the-money options bid/ask width ${chain.atmSpreadPct.toFixed(1)}% of mid.`);
    }
    return { score: clamp(s), evidence: ev, inputs: { avgDollarVolumeM: r1(f.avgDollarVolume / 1e6, 0), atmSpreadPct: r1(chain?.atmSpreadPct ?? null, 1) } };
  },

  technicalStructure({ f, direction }): Raw {
    if (f.high20 === null || f.pctFromHigh52 === null) return none("Insufficient structure history.");
    let s = 50;
    const ev: string[] = [];
    if (direction === "long") {
      if (f.breakout20) {
        s += 22;
        ev.push(`Closed above the 20-session high (${f.high20.toFixed(2)}).`);
      }
      if (f.pctFromHigh52 > -5) {
        s += 12;
        ev.push(`Within ${Math.abs(f.pctFromHigh52).toFixed(1)}% of the 52-week high.`);
      } else if (f.pctFromHigh52 < -25) s -= 10;
      if (f.higherLows) {
        s += 10;
        ev.push("Higher-low structure over the last 30 sessions.");
      }
      if (f.aboveVwap === true) s += 5;
    } else {
      if (f.breakdown20) {
        s += 22;
        ev.push(`Closed below the 20-session low (${f.low20?.toFixed(2)}).`);
      }
      if (f.pctFromHigh52 < -20) {
        s += 10;
        ev.push(`${Math.abs(f.pctFromHigh52).toFixed(1)}% below the 52-week high.`);
      }
      if (f.higherLows === false) s += 8;
      if (f.aboveVwap === false) s += 5;
    }
    if (!ev.length) ev.push("No decisive structural trigger.");
    return {
      score: clamp(s),
      evidence: ev,
      inputs: { high20: r1(f.high20, 2), low20: r1(f.low20, 2), pctFromHigh52: r1(f.pctFromHigh52, 1), breakout20: f.breakout20, breakdown20: f.breakdown20 },
    };
  },

  catalysts({ catalysts }): Raw {
    const directional = catalysts.filter((c) => c.kind !== "economic-event" && c.kind !== "earnings");
    return {
      score: clamp(45 + directional.length * 14),
      evidence: directional.length ? directional.map((c) => c.label) : ["No symbol-specific catalyst identified."],
      inputs: { catalystCount: directional.length },
    };
  },

  newsSentiment({ news, direction }): Raw {
    if (!news || news.withSentiment === 0) return { ...none("No sentiment-tagged coverage available."), inputs: { articles: news?.count ?? 0 } };
    const bias = (news.positive - news.negative) / news.withSentiment;
    return {
      score: orient(scale(bias, -1, 1), direction),
      evidence: [`${news.count} recent articles; ${news.positive} positive, ${news.negative} negative (provider sentiment).`],
      inputs: { articles: news.count, positive: news.positive, negative: news.negative },
    };
  },

  marketRegime({ regime, direction }): Raw {
    if (!regime || regime.score === null) return none("Market regime unavailable.");
    const s = scale(regime.score, -60, 60);
    return {
      score: orient(s, direction),
      evidence: [`Market regime ${regime.risk} (${regime.score >= 0 ? "+" : ""}${regime.score}).`],
      inputs: { regime: regime.risk, regimeScore: regime.score },
    };
  },

  sectorStrength({ sector, direction }): Raw {
    if (!sector || sector.relativeStrength === null) return none("Sector data unavailable.");
    return {
      score: orient(scale(sector.relativeStrength, -1.5, 1.5), direction),
      evidence: [`${sector.sector} (${sector.etf}) ${sector.relativeStrength >= 0 ? "outperforming" : "underperforming"} the S&P 500 by ${Math.abs(sector.relativeStrength).toFixed(2)} pts today.`],
      inputs: { sector: sector.sector, sectorRs: r1(sector.relativeStrength, 2) },
    };
  },

  marketBreadth({ breadth, direction }): Raw {
    if (!breadth || breadth.advancers === null || breadth.decliners === null) return none("Breadth unavailable.");
    const ratio = breadth.advancers / Math.max(1, breadth.decliners);
    return {
      score: orient(scale(Math.log(ratio), -1, 1), direction),
      evidence: [`Advance/decline ratio ${ratio.toFixed(2)} (${breadth.universe}).`],
      inputs: { advancers: breadth.advancers, decliners: breadth.decliners },
    };
  },

  economicCalendar({ macroEventsSoon, mode }): Raw {
    if (macroEventsSoon === undefined) return none("Economic calendar unavailable.");
    const s = macroEventsSoon === 0 ? 70 : mode === "day" ? 35 : 55;
    return {
      score: s,
      evidence: [macroEventsSoon === 0 ? "No high-importance macro release in the next session." : `${macroEventsSoon} high-importance macro release(s) within the next session — event risk.`],
      inputs: { highImportanceEventsNextSession: macroEventsSoon },
    };
  },

  earningsCalendar({ earningsInDays, mode }): Raw {
    if (earningsInDays === undefined) return none("Earnings calendar unavailable.");
    const horizon = mode === "day" ? 1 : 12;
    if (earningsInDays === null || earningsInDays > horizon) {
      return { score: 70, evidence: ["No scheduled earnings inside the holding horizon."], inputs: { earningsInDays: null } };
    }
    return {
      score: 25,
      evidence: [`Earnings scheduled in ${earningsInDays} day(s) — binary event risk inside the horizon.`],
      inputs: { earningsInDays },
    };
  },
};

export function evaluateFactor(key: FactorKey, ctx: FactorContext): Omit<FactorResult, "weight"> {
  const raw = FACTORS[key](ctx);
  const score = raw.score === null ? null : Math.round(raw.score);
  const signal: FactorResult["signal"] = score === null ? "unavailable" : score >= 60 ? "supportive" : score <= 40 ? "adverse" : "neutral";
  return { key, label: FACTOR_LABELS[key].label, score, signal, evidence: raw.evidence, inputs: raw.inputs };
}

/** Initial direction from trend + momentum features — the setup is then scored for that direction. */
export function inferDirection(f: Features): { direction: Direction; conviction: number } {
  let s = 0;
  if (f.sma20 !== null) s += f.price > f.sma20 ? 1 : -1;
  if (f.sma50 !== null) s += f.price > f.sma50 ? 1 : -1;
  if (f.macdHist !== null) s += f.macdHist > 0 ? 1 : -1;
  if (f.rs20 !== null) s += f.rs20 > 0 ? 1 : -1;
  if (f.ret5 !== null) s += f.ret5 > 0 ? 0.5 : -0.5;
  return { direction: s >= 0 ? "long" : "short", conviction: Math.abs(s) / 4.5 };
}
