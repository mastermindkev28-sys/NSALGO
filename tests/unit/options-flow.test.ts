import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyIntent, classifySentiment, classifySide, groupOrders } from "@/providers/polygon/flow";
import { PolygonOptionsProvider } from "@/providers/polygon";

const MS = 1_000_000;
const T0 = 1_790_000_000_000 * MS;

describe("options flow classification", () => {
  it("groups multi-exchange legs into a sweep and same-exchange legs into a split", () => {
    const orders = groupOrders([
      { price: 2.0, size: 100, exchange: 1, ts: T0 },
      { price: 2.02, size: 50, exchange: 5, ts: T0 + 3 * MS },
      { price: 3.0, size: 40, exchange: 7, ts: T0 + 5_000 * MS },
      { price: 3.0, size: 60, exchange: 7, ts: T0 + 5_010 * MS },
      { price: 1.0, size: 300, exchange: 2, ts: T0 + 60_000 * MS },
      { price: 1.0, size: 10, exchange: 2, ts: T0 + 120_000 * MS },
    ]);
    expect(orders.map((o) => o.execution)).toEqual(["sweep", "split", "block", "single"]);
    const sweep = orders[0]!;
    expect(sweep.contracts).toBe(150);
    expect(sweep.premium).toBe(Math.round((2.0 * 100 + 2.02 * 50) * 100));
    expect(sweep.price).toBeCloseTo(2.0067, 3);
    expect(sweep.exchanges).toBe(2);
  });

  it("classifies side against the NBBO and leaves it unknown without a quote", () => {
    expect(classifySide(2.1, 2.0, 2.1)).toBe("ask");
    expect(classifySide(2.0, 2.0, 2.1)).toBe("bid");
    expect(classifySide(2.05, 2.0, 2.1)).toBe("mid");
    expect(classifySide(2.05, null, 2.1)).toBeNull();
    expect(classifySide(2.05, 2.2, 2.1)).toBeNull();
  });

  it("derives sentiment and opening intent", () => {
    expect(classifySentiment("call", "ask")).toBe("bullish");
    expect(classifySentiment("put", "ask")).toBe("bearish");
    expect(classifySentiment("call", "bid")).toBe("bearish");
    expect(classifySentiment("put", "bid")).toBe("bullish");
    expect(classifySentiment("call", "mid")).toBe("neutral");
    expect(classifySentiment("call", null)).toBeNull();
    expect(classifyIntent(500, 200)).toBe("opening");
    expect(classifyIntent(100, 200)).toBeNull();
    expect(classifyIntent(100, null)).toBeNull();
  });
});

describe("PolygonOptionsProvider.getFlow", () => {
  afterEach(() => vi.unstubAllGlobals());

  const contract = {
    details: { ticker: "O:NVDA261016C00190000", contract_type: "call", strike_price: 190, expiration_date: "2026-10-16" },
    day: { volume: 4000, vwap: 3.1 },
    open_interest: 1000,
    implied_volatility: 0.45,
    underlying_asset: { price: 185 },
  };

  function stubPolygon(opts: { tradesStatus?: number; quotesStatus?: number } = {}) {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        const url = new URL(input);
        calls.push(url.pathname);
        const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
        if (url.pathname.startsWith("/v3/snapshot/options/")) return json(200, { results: [contract] });
        if (url.pathname.startsWith("/v3/trades/")) {
          if (opts.tradesStatus) return json(opts.tradesStatus, {});
          return json(200, {
            results: [
              { price: 3.2, size: 1500, exchange: 4, sip_timestamp: T0 },
              { price: 3.21, size: 500, exchange: 9, sip_timestamp: T0 + 2 * MS },
              { price: 3.0, size: 5, exchange: 4, sip_timestamp: T0 + 90_000 * MS },
            ],
          });
        }
        if (url.pathname.startsWith("/v3/quotes/")) {
          if (opts.quotesStatus) return json(opts.quotesStatus, {});
          return json(200, { results: [{ bid_price: 3.1, ask_price: 3.2 }] });
        }
        return json(404, {});
      }),
    );
    return calls;
  }

  it("builds classified prints from trades and quotes", async () => {
    stubPolygon();
    const r = await new PolygonOptionsProvider("key", 0).getFlow({ symbol: "NVDA", minPremium: 50_000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.meta.mode).toBe("live");
    expect(r.data).toHaveLength(1); // the 5-lot print is below the premium floor
    const p = r.data[0]!;
    expect(p).toMatchObject({
      underlying: "NVDA",
      right: "call",
      strike: 190,
      contracts: 2000,
      execution: "sweep",
      side: "ask",
      sentiment: "bullish",
      intent: "opening",
      openInterest: 1000,
      spot: 185,
    });
    expect(p.premium).toBe(Math.round((3.2 * 1500 + 3.21 * 500) * 100));
  });

  it("keeps side unknown when the plan lacks quotes", async () => {
    stubPolygon({ quotesStatus: 403 });
    const r = await new PolygonOptionsProvider("key", 15).getFlow({ symbol: "NVDA" });
    expect(r.ok && r.data[0]).toMatchObject({ side: null, sentiment: null, execution: "sweep" });
    expect(r.ok && r.meta.mode).toBe("delayed");
  });

  it("reports a missing trades entitlement as not configured", async () => {
    stubPolygon({ tradesStatus: 403 });
    const r = await new PolygonOptionsProvider("key", 0).getFlow({ symbol: "NVDA" });
    expect(!r.ok && r.error.code).toBe("PROVIDER_NOT_CONFIGURED");
  });

  it("applies sentiment and execution filters", async () => {
    stubPolygon();
    const bearish = await new PolygonOptionsProvider("key", 0).getFlow({ symbol: "NVDA", sentiment: "bearish" });
    expect(bearish.ok && bearish.data).toEqual([]);
    const sweeps = await new PolygonOptionsProvider("key", 0).getFlow({ symbol: "NVDA", execution: "sweep" });
    expect(sweeps.ok && sweeps.data).toHaveLength(1);
  });
});
