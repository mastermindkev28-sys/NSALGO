/**
 * Scoring model. Combines factor scores with the active configuration's
 * weights. Unavailable factors are excluded and the remaining weights are
 * re-normalised; `coverage` records how much of the configured weight was
 * actually measured so thin evidence is never presented as a strong score.
 */
import { gradeFor } from "@/config/atlas";
import { FACTOR_KEYS, type AtlasConfig, type AtlasScore, type FactorResult } from "@/types/atlas";
import { evaluateFactor, type FactorContext } from "./factors";

export function scoreSetup(ctx: FactorContext, config: AtlasConfig): AtlasScore {
  const weights = config.weights[ctx.mode];
  const totalWeight = FACTOR_KEYS.reduce((a, k) => a + Math.max(0, weights[k] ?? 0), 0) || 1;
  const evaluated = FACTOR_KEYS.map((k) => ({ ...evaluateFactor(k, ctx), rawWeight: Math.max(0, weights[k] ?? 0) }));
  const measuredWeight = evaluated.filter((e) => e.score !== null).reduce((a, e) => a + e.rawWeight, 0);

  let value = 0;
  const components: FactorResult[] = evaluated.map((e) => {
    const weight = e.score !== null && measuredWeight > 0 ? e.rawWeight / measuredWeight : 0;
    if (e.score !== null) value += e.score * weight;
    return { key: e.key, label: e.label, score: e.score, weight: Math.round(weight * 1000) / 1000, signal: e.signal, evidence: e.evidence, inputs: e.inputs };
  });

  const coverage = measuredWeight / totalWeight;
  // Thin coverage pulls the ranking toward neutral rather than overstating it.
  const shrunk = 50 + (value - 50) * Math.min(1, 0.5 + coverage / 2);
  const final = Math.round(Math.max(0, Math.min(100, shrunk)));
  return {
    value: final,
    grade: gradeFor(final),
    coverage: Math.round(coverage * 100) / 100,
    components: components.sort((a, b) => b.weight - a.weight),
    configVersion: config.version,
    computedAt: new Date().toISOString(),
  };
}
