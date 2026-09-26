import { describe, expect, it } from "vitest";
import { DEFAULT_ATLAS_CONFIG } from "@/config/atlas";
import { computeFeatures } from "@/services/atlas/features";
import { evaluateFactor, inferDirection, type FactorContext } from "@/services/atlas/factors";
import { scoreSetup } from "@/services/atlas/scoring";
import { buildLevels } from "@/services/atlas/setup-builder";
import type { Bar } from "@/types/market";

function trend(n: number, slope: number): Bar[] {
  return Array.from({ length: n }, (_, i) => {
    const c = 100 + i * slope + Math.sin(i / 3);
    return { time: i * 86400, open: c - 0.3, high: c + 1, low: c - 1, close: c, volume: 1_000_000 + (i % 5) * 50_000 };
  });
}

const baseCtx = (daily: Bar[]): FactorContext => {
  const f = computeFeatures({ daily, benchmark: trend(260, 0.05) })!;
  return { mode: "swing", direction: inferDirection(f).direction, f, regime: null, sector: null, breadth: null, flow: null, chain: null, news: null, earningsInDays: undefined, macroEventsSoon: undefined, catalysts: [] };
};

describe("atlas scoring", () => {
  it("infers long for a clean uptrend and short for a downtrend", () => {
    expect(baseCtx(trend(260, 0.4)).direction).toBe("long");
    expect(baseCtx(trend(260, -0.3).map((b) => ({ ...b, close: b.close + 200, open: b.open + 200, high: b.high + 200, low: b.low + 200 }))).direction).toBe("short");
  });

  it("never invents a value for missing inputs", () => {
    const ctx = baseCtx(trend(260, 0.4));
    expect(evaluateFactor("optionsFlow", ctx).score).toBeNull();
    expect(evaluateFactor("newsSentiment", ctx).signal).toBe("unavailable");
    expect(evaluateFactor("marketRegime", ctx).score).toBeNull();
  });

  it("re-normalises weights over available factors and reports coverage", () => {
    const s = scoreSetup(baseCtx(trend(260, 0.4)), DEFAULT_ATLAS_CONFIG);
    const w = s.components.reduce((a, c) => a + c.weight, 0);
    expect(w).toBeCloseTo(1, 2);
    expect(s.coverage).toBeGreaterThan(0);
    expect(s.coverage).toBeLessThan(1);
    expect(s.components.filter((c) => c.score === null).every((c) => c.weight === 0)).toBe(true);
    expect(s.value).toBeGreaterThanOrEqual(0);
    expect(s.value).toBeLessThanOrEqual(100);
  });

  it("thin coverage pulls the score toward neutral", () => {
    const ctx = baseCtx(trend(260, 0.6));
    const full = scoreSetup(ctx, DEFAULT_ATLAS_CONFIG).value;
    const onlyTrend = { ...DEFAULT_ATLAS_CONFIG, weights: { ...DEFAULT_ATLAS_CONFIG.weights, swing: { ...DEFAULT_ATLAS_CONFIG.weights.swing, optionsFlow: 500 } } };
    const thin = scoreSetup(ctx, onlyTrend);
    expect(thin.coverage).toBeLessThan(0.3);
    expect(Math.abs(thin.value - 50)).toBeLessThanOrEqual(Math.abs(full - 50) + 1);
  });

  it("builds a risk framework with invalidation on the correct side", () => {
    const f = computeFeatures({ daily: trend(260, 0.4) })!;
    const long = buildLevels(f, "long", "swing");
    expect(long.invalidation).toBeLessThan(long.entry.low);
    expect(long.target.low).toBeGreaterThan(long.entry.high);
    const short = buildLevels(f, "short", "day");
    expect(short.invalidation).toBeGreaterThan(short.entry.high);
    expect(short.target.high).toBeLessThan(short.entry.low);
    expect(long.riskReward).toBeGreaterThan(1);
  });
});
