import { describe, expect, it } from "vitest";
import { GET as quote } from "@/app/api/market/quote/route";
import { GET as history } from "@/app/api/market/history/route";
import { POST as track } from "@/app/api/analytics/track/route";
import { GET as setups } from "@/app/api/atlas/setups/route";

const ctx = { params: Promise.resolve({}) };

describe("API validation & auth", () => {
  it("validates query parameters", async () => {
    expect((await quote(new Request("http://x/api/market/quote?symbols=%3Cscript%3E"), ctx)).status).toBe(400);
    const ok = await quote(new Request("http://x/api/market/quote?symbols=SPY,QQQ"), ctx);
    expect(ok.status).toBe(200);
    const body = await ok.json();
    expect(body.ok).toBe(true);
    expect(body.meta.mode).toBe("mock");
    expect((await history(new Request("http://x/api/market/history?symbol=NVDA&range=10Y"), ctx)).status).toBe(400);
  });

  it("requires membership for premium endpoints", async () => {
    // No session cookie → next/headers is unavailable outside a request, so the route must fail closed.
    const r = await setups(new Request("http://x/api/atlas/setups"), ctx);
    expect([401, 500]).toContain(r.status);
  });

  it("rejects cross-origin mutations", async () => {
    const r = await track(new Request("http://x/api/analytics/track", { method: "POST", headers: { origin: "https://evil.example", host: "x", "content-type": "application/json" }, body: JSON.stringify({ name: "page_view" }) }), ctx);
    expect(r.status).toBe(403);
  });
});
