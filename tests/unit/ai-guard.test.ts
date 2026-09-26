import { describe, expect, it } from "vitest";
import { narrativeIsGrounded } from "@/services/ai/guard";
import { templateSetupNarrative } from "@/services/ai/template";
import type { SetupDigest } from "@/services/ai/types";

const digest: SetupDigest = {
  symbol: "NVDA",
  name: "NVIDIA",
  mode: "swing",
  direction: "long",
  tradeType: "stock",
  atlasScore: 84,
  coverage: 0.94,
  price: 182.5,
  entry: { low: 181.2, high: 183.8 },
  target: { low: 195.4, high: 201.1 },
  invalidation: 172.9,
  riskReward: 2.1,
  regime: "risk-on",
  factors: [{ factor: "Volume", score: 78, evidence: ["Relative volume 2.1× the 20-day average."] }],
  catalysts: [],
  confirmations: [],
  options: null,
};

describe("AI fabrication guard", () => {
  it("accepts text whose numbers come from the digest", () => {
    expect(narrativeIsGrounded(["NVDA ranked 84 with relative volume at 2.1× average; invalidation below 172.90."], digest).ok).toBe(true);
    expect(narrativeIsGrounded(["Coverage was 94% of configured weight."], digest).ok).toBe(true);
  });

  it("rejects invented numbers", () => {
    const r = narrativeIsGrounded(["Analysts expect NVDA to reach 250 with a 73% probability."], digest);
    expect(r.ok).toBe(false);
    expect(r.unknown).toContain(250);
  });

  it("the deterministic template is always grounded", () => {
    const n = templateSetupNarrative(digest);
    expect(narrativeIsGrounded([n.whyItAppeared, n.risks, n.catalystSummary, n.thesis], digest).ok).toBe(true);
    expect(n.risks).toMatch(/172\.90/);
  });
});
