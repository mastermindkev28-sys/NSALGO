import { describe, expect, it } from "vitest";
import { MockMarketDataProvider } from "@/providers/mock/market";
import { MockNewsProvider } from "@/providers/mock/news";
import { MockOptionsDataProvider } from "@/providers/mock/options";
import { MockCongressProvider, MockInsiderProvider } from "@/providers/mock/disclosures";
import { unavailableProvider } from "@/providers/unavailable";
import { classifyHeadline } from "@/lib/news-classify";

describe("mock providers", () => {
  it("label every result as simulated and stay deterministic", async () => {
    const m = new MockMarketDataProvider();
    const a = await m.getHistory("NVDA", "1Y", "1d");
    const b = await m.getHistory("NVDA", "1Y", "1d");
    expect(a.ok && a.meta.mode).toBe("mock");
    expect(a.ok && b.ok && a.data.slice(0, -1)).toEqual(b.ok && b.data.slice(0, -1));
    const q = await m.getQuotes(["SPY", "NOPE"]);
    expect(q.ok && q.data.map((x) => x.symbol)).toEqual(["SPY"]);
  });

  it("builds consistent option chains", async () => {
    const o = new MockOptionsDataProvider();
    const c = await o.getChain("AAPL");
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    for (const k of c.data.calls) {
      if (k.bid !== null && k.ask !== null) expect(k.ask).toBeGreaterThanOrEqual(k.bid);
      expect(k.delta).toBeGreaterThanOrEqual(0);
    }
    for (const k of c.data.puts) expect(k.delta).toBeLessThanOrEqual(0);
  });

  it("never attributes simulated news or disclosures to real publishers or people", async () => {
    const n = await new MockNewsProvider().list({ limit: 50 });
    expect(n.ok && n.data.every((a) => a.publisher === "NSALGO Simulated Wire" && a.url === "")).toBe(true);
    const c = await new MockCongressProvider().list({ limit: 50 });
    expect(c.ok && c.data.every((r) => r.member.endsWith("(simulated)"))).toBe(true);
    const i = await new MockInsiderProvider().list({ limit: 50 });
    expect(i.ok && i.data.every((r) => r.person.endsWith("(simulated)"))).toBe(true);
  });

  it("unconfigured production providers fail explicitly instead of falling back", async () => {
    const p = unavailableProvider("Market data", "MARKET_DATA_API_KEY");
    const r = await p.getQuotes(["SPY"]);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error.code).toBe("PROVIDER_NOT_CONFIGURED");
    expect((await p.healthCheck()).ok).toBe(false);
  });

  it("classifies headlines", () => {
    expect(classifyHeadline("Fed signals rate cut after CPI cools")).toEqual(expect.arrayContaining(["fed", "economy"]));
    expect(classifyHeadline("Company opens new store")).toEqual(["markets"]);
  });
});
