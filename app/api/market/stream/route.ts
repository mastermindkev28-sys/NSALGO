import { z } from "zod";
import { env } from "@/config/env";
import { route } from "@/lib/api";
import { getStreamQuotes } from "@/services/market";
import type { Quote } from "@/types/market";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Each connection ends before the platform limit; EventSource reconnects on its own. */
const CONNECTION_MS = 50_000;

const Query = z.object({
  symbols: z
    .string()
    .min(1)
    .max(600)
    .transform((s) => s.split(",").map((x) => x.trim().toUpperCase()).filter(Boolean))
    .pipe(z.array(z.string().regex(/^[A-Z0-9.^:-]{1,12}$/)).min(1).max(60)),
});

const signature = (q: Quote) => `${q.last}|${q.change}|${q.volume}|${q.timestamp}|${q.marketState}`;

/**
 * GET /api/market/stream?symbols=SPY,QQQ — Server-Sent Events.
 *   event: quotes  → { data: Quote[], meta }  (first message has every symbol, then only changes)
 *   event: error   → { code, message }        (provider failure; the client keeps its last values)
 * Provider keys stay server-side; the browser only talks to this route.
 */
export const GET = route({ query: Query }, async ({ req, query }) => {
  const interval = env().QUOTE_STREAM_INTERVAL_MS;
  const encoder = new TextEncoder();
  let closed = false;
  req.signal.addEventListener("abort", () => {
    closed = true;
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (chunk: string) => {
        if (!closed) controller.enqueue(encoder.encode(chunk));
      };
      const send = (event: string, data: unknown) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      write("retry: 2000\n\n");
      const last = new Map<string, string>();
      const endAt = Date.now() + CONNECTION_MS;
      try {
        while (!closed && Date.now() < endAt) {
          const r = await getStreamQuotes(query.symbols, Math.max(250, interval - 250));
          if (!r.ok) {
            send("error", r.error);
          } else {
            const changed = r.data.filter((q) => last.get(q.symbol) !== signature(q));
            for (const q of changed) last.set(q.symbol, signature(q));
            if (changed.length) send("quotes", { data: changed, meta: r.meta });
            else write(": keepalive\n\n");
          }
          await new Promise((res) => setTimeout(res, interval));
        }
      } finally {
        if (!closed) {
          closed = true;
          controller.close();
        }
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
