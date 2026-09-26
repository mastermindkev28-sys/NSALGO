import { describe, expect, it } from "vitest";
import { atr, ema, macdSeries, pctReturn, rsi, sma, smaSeries, vwap, efficiencyRatio } from "@/services/atlas/indicators";
import type { Bar } from "@/types/market";

const bar = (c: number, i: number, v = 100): Bar => ({ time: i, open: c, high: c + 1, low: c - 1, close: c, volume: v });

describe("indicators", () => {
  it("computes simple moving averages", () => {
    expect(sma([1, 2, 3, 4, 5], 5)).toBe(3);
    expect(sma([1, 2], 5)).toBeNull();
    expect(smaSeries([1, 2, 3, 4], 2)).toEqual([null, 1.5, 2.5, 3.5]);
  });

  it("ema converges toward a constant series", () => {
    expect(ema(new Array(50).fill(10), 9)).toBeCloseTo(10, 6);
  });

  it("RSI is 100 for a strictly rising series and ~0 for falling", () => {
    const up = Array.from({ length: 40 }, (_, i) => 100 + i);
    const down = Array.from({ length: 40 }, (_, i) => 100 - i);
    expect(rsi(up)).toBe(100);
    expect(rsi(down)).toBeLessThan(1);
  });

  it("MACD histogram is positive in an accelerating uptrend", () => {
    const xs = Array.from({ length: 80 }, (_, i) => 100 + i * i * 0.02);
    const last = macdSeries(xs).at(-1)!;
    expect(last.macd).not.toBeNull();
    expect(last.hist!).toBeGreaterThan(0);
  });

  it("ATR of constant-range bars equals the range", () => {
    const bars = Array.from({ length: 30 }, (_, i) => bar(100, i));
    expect(atr(bars, 14)).toBeCloseTo(2, 6);
  });

  it("VWAP weights by volume", () => {
    expect(vwap([bar(10, 0, 100), bar(20, 1, 300)])).toBeCloseTo(17.5, 6);
  });

  it("returns and efficiency ratio", () => {
    expect(pctReturn([100, 110], 1)).toBeCloseTo(10, 6);
    expect(efficiencyRatio([1, 2, 3, 4, 5, 6], 5)).toBeCloseTo(1, 6);
    expect(efficiencyRatio([1, 2, 1, 2, 1, 2], 5)).toBeCloseTo(0.2, 6);
  });
});
