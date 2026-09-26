import { describe, expect, it } from "vitest";
import { evaluateLifecycle, outcomeReturn } from "@/services/atlas/lifecycle";
import type { AtlasSetup } from "@/types/atlas";

const gen = "2026-09-01T14:00:00.000Z";
const base: Pick<AtlasSetup, "direction" | "entry" | "target" | "invalidation" | "status" | "statusHistory" | "generatedAt" | "expiresAt"> = {
  direction: "long",
  entry: { low: 99, high: 101 },
  target: { low: 110, high: 115 },
  invalidation: 95,
  status: "generated",
  statusHistory: [{ status: "generated", at: gen, price: 100 }],
  generatedAt: gen,
  expiresAt: "2026-09-20T20:00:00.000Z",
};
const t = (h: number) => Date.parse(gen) / 1000 + h * 3600;
const b = (h: number, low: number, high: number) => ({ time: t(h), open: low, high, low, close: high, volume: 1 });

describe("setup lifecycle", () => {
  it("activates, triggers and reaches target", () => {
    const r = evaluateLifecycle(base, [b(1, 100, 102), b(30, 108, 111)], new Date("2026-09-05"));
    expect(r.status).toBe("target-reached");
    expect(r.statusHistory.map((h) => h.status)).toEqual(["generated", "active", "triggered", "target-reached"]);
  });

  it("records invalidation — losing setups are kept", () => {
    const r = evaluateLifecycle(base, [b(1, 100, 101), b(5, 94, 99)], new Date("2026-09-05"));
    expect(r.status).toBe("invalidated");
    expect(outcomeReturn({ ...base, ...r })).toBeLessThan(0);
  });

  it("is conservative when stop and target occur in the same bar", () => {
    const r = evaluateLifecycle(base, [b(1, 100, 101), b(2, 94, 112)], new Date("2026-09-05"));
    expect(r.status).toBe("invalidated");
  });

  it("expires untriggered setups after their horizon", () => {
    const r = evaluateLifecycle(base, [b(1, 103, 104)], new Date("2026-09-30"));
    expect(r.status).toBe("expired");
  });

  it("never reopens a terminal setup", () => {
    const closed = { ...base, status: "invalidated" as const, statusHistory: [...base.statusHistory, { status: "invalidated" as const, at: gen, price: 95 }] };
    expect(evaluateLifecycle(closed, [b(1, 120, 130)]).status).toBe("invalidated");
  });
});
