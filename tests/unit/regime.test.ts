import { describe, expect, it } from "vitest";
import { computeRegime } from "@/services/atlas/regime";
import type { Bar } from "@/types/market";

const series = (n: number, slope: number): Bar[] => Array.from({ length: n }, (_, i) => ({ time: i, open: 100 + i * slope, high: 101 + i * slope, low: 99 + i * slope, close: 100 + i * slope, volume: 1 }));

describe("market regime", () => {
  it("classifies a broad uptrend with low volatility as risk-on and explains why", () => {
    const r = computeRegime({
      spy: series(260, 0.5),
      qqq: series(260, 0.7),
      iwm: series(260, 0.6),
      vix: { last: 13, changePercent: -4, fiveDayChange: -8 },
      breadth: { advancers: 380, decliners: 110, unchanged: 13, newHighs: 40, newLows: 3, pctAbove50d: 70, pctAbove200d: 75, universe: "test" },
      sectors: Array.from({ length: 11 }, (_, i) => ({ sector: `S${i}`, etf: `E${i}`, changePercent: i < 9 ? 0.8 : -0.2, relativeStrength: 0 })),
      tenYearChange: -4,
    });
    expect(r.risk).toBe("risk-on");
    expect(r.volatility).toBe("low-volatility");
    expect(r.signals.every((s) => s.reading !== "unavailable")).toBe(true);
    expect(r.summary).toMatch(/Risk-On/);
  });

  it("reports unavailable inputs instead of assuming values", () => {
    const r = computeRegime({ spy: null, qqq: null, iwm: null, vix: null, breadth: null, sectors: null, tenYearChange: null });
    expect(r.score).toBeNull();
    expect(r.coverage).toBe(0);
    expect(r.signals.filter((s) => s.reading === "unavailable").length).toBeGreaterThan(4);
  });
});
