import { describe, expect, it } from "vitest";
import { scan, symbolIntelligence, getMarketContext, backfillSimulatedHistory } from "@/services/atlas/engine";
import { db } from "@/db";

describe("atlas engine (mock mode)", () => {
  it("builds a market context with a regime and reasoning", async () => {
    const ctx = await getMarketContext();
    expect(ctx.regime.signals.length).toBeGreaterThan(4);
    expect(["risk-on", "risk-off", "mixed"]).toContain(ctx.regime.risk);
    expect(ctx.dataMode).toBe("mock");
  });

  it("produces ranked, thresholded setups with transparent components", async () => {
    const r = await scan("swing");
    expect(r.evaluated).toBeGreaterThan(20);
    for (const s of r.setups) {
      expect(s.score.value).toBeGreaterThanOrEqual(55);
      expect(s.score.components.length).toBe(16);
      expect(s.explanation.whyItAppeared.length).toBeGreaterThan(20);
      expect(s.explanation.inputsDigest).toBeTruthy();
      if (s.direction === "long") expect(s.invalidation).toBeLessThan(s.entry.low);
      else expect(s.invalidation).toBeGreaterThan(s.entry.high);
    }
    const sorted = [...r.setups].sort((a, b) => b.score.value - a.score.value);
    expect(r.setups.map((s) => s.id)).toEqual(sorted.map((s) => s.id));
  }, 60_000);

  it("returns day and swing analysis for a symbol", async () => {
    const r = await symbolIntelligence("NVDA");
    expect(r.day?.setup.symbol).toBe("NVDA");
    expect(r.swing?.setup.mode).toBe("swing");
  }, 60_000);

  it("backfills simulated history including closed outcomes", async () => {
    const before = await db().atlas.countSetups();
    const n = await backfillSimulatedHistory(20);
    if (before === 0) expect(n).toBeGreaterThan(0);
    const closed = await db().atlas.listSetups({ status: "closed" });
    expect(Array.isArray(closed)).toBe(true);
  }, 120_000);
});
