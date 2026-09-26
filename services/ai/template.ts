/**
 * Deterministic narrative generator. Used when no AI provider is configured,
 * when the provider fails, or when an AI response fails validation. It only
 * restates values present in the digest.
 */
import type { AIProvider, MarketDigest, MarketNarrative, SetupDigest, SetupNarrative } from "./types";

const f2 = (n: number) => n.toFixed(2);

export function templateSetupNarrative(d: SetupDigest): SetupNarrative {
  const supportive = d.factors.filter((x) => x.score !== null && x.score >= 60).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const adverse = d.factors.filter((x) => x.score !== null && x.score <= 40);
  const lead = supportive
    .slice(0, 3)
    .map((x) => x.evidence[0])
    .filter(Boolean);
  const dirWord = d.direction === "long" ? "bullish" : "bearish";
  const why =
    lead.length > 0
      ? `${d.symbol} ranked ${d.atlasScore}/100 for a ${dirWord} ${d.mode === "day" ? "intraday" : "swing"} setup. ${lead.join(" ")}`
      : `${d.symbol} ranked ${d.atlasScore}/100 for a ${dirWord} ${d.mode === "day" ? "intraday" : "swing"} setup on broad but modest factor alignment.`;
  const riskParts = [
    `Primary invalidation occurs ${d.direction === "long" ? "below" : "above"} ${f2(d.invalidation)}.`,
    ...adverse.slice(0, 2).map((x) => `${x.factor}: ${x.evidence[0] ?? "adverse reading"}`),
  ];
  if (d.coverage < 0.8) riskParts.push(`Only ${Math.round(d.coverage * 100)}% of configured factor weight had data; treat the ranking with extra caution.`);
  const catalystSummary = d.catalysts.length ? d.catalysts.join(" · ") : "No specific catalyst identified; the setup is primarily technical.";
  const thesis =
    `${d.direction === "long" ? "Constructive" : "Defensive"} framework: entry zone ${f2(d.entry.low)}–${f2(d.entry.high)}, ` +
    `target zone ${f2(d.target.low)}–${f2(d.target.high)}, invalidation ${f2(d.invalidation)}` +
    (d.riskReward !== null ? ` (≈${d.riskReward}:1 reward-to-risk at zone midpoints).` : ".") +
    ` Market regime: ${d.regime}.`;
  return { whyItAppeared: why, risks: riskParts.join(" "), catalystSummary, thesis };
}

export function templateMarketNarrative(d: MarketDigest): MarketNarrative {
  const spx = d.indices.find((i) => i.symbol === "SPY" || i.symbol === "SPX");
  const move = spx?.changePercent;
  const headline =
    move === null || move === undefined
      ? `Market regime: ${d.regime.label}`
      : `${d.regime.label} tape — S&P 500 ${move >= 0 ? "+" : ""}${move.toFixed(2)}%`;
  const lead = d.leaders
    .slice(0, 3)
    .map((l) => l.symbol)
    .join(", ");
  const lag = d.laggards
    .slice(0, 3)
    .map((l) => l.symbol)
    .join(", ");
  return {
    headline,
    summary: `${d.regime.summary}${lead ? ` Leadership: ${lead}.` : ""}${lag ? ` Laggards: ${lag}.` : ""}`,
    watch: d.upcomingEvents.slice(0, 3),
  };
}

export class TemplateAIProvider implements AIProvider {
  readonly id = "template";
  readonly model = "deterministic-template";
  async explainSetup(d: SetupDigest) {
    return templateSetupNarrative(d);
  }
  async summarizeMarket(d: MarketDigest) {
    return templateMarketNarrative(d);
  }
  async healthCheck() {
    return { ok: true, message: "Deterministic template generator (no external AI configured)" };
  }
}
