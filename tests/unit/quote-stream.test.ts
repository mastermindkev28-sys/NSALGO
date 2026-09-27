import { describe, expect, it } from "vitest";
import { GET as stream } from "@/app/api/market/stream/route";

const ctx = { params: Promise.resolve({}) };

async function readEvents(res: Response, count: number) {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const events: { event: string; data: unknown }[] = [];
  while (events.length < count) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const event = /^event: (.+)$/m.exec(block)?.[1];
      const data = /^data: (.+)$/m.exec(block)?.[1];
      if (event && data) events.push({ event, data: JSON.parse(data) });
    }
  }
  await reader.cancel();
  return events;
}

describe("GET /api/market/stream", () => {
  it("validates symbols", async () => {
    expect((await stream(new Request("http://x/api/market/stream?symbols=%3Cscript%3E"), ctx)).status).toBe(400);
  });

  it("streams an initial snapshot of every symbol as server-sent events", async () => {
    const ac = new AbortController();
    const res = await stream(new Request("http://x/api/market/stream?symbols=SPY,QQQ", { signal: ac.signal }), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const [first] = await readEvents(res, 1);
    ac.abort();
    expect(first?.event).toBe("quotes");
    const payload = first!.data as { data: { symbol: string }[]; meta: { mode: string } };
    expect(payload.data.map((q) => q.symbol).sort()).toEqual(["QQQ", "SPY"]);
    expect(payload.meta.mode).toBe("mock");
  });
});
