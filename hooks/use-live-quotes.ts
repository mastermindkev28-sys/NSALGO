"use client";

import { useEffect, useState } from "react";
import type { DataMeta, DataResult } from "@/types/data";
import type { Quote } from "@/types/market";
import { usePoll } from "./use-poll";

/** Consecutive failed connections before giving up on streaming for this page view. */
const MAX_STREAM_FAILURES = 3;

/**
 * Live quotes over Server-Sent Events (/api/market/stream). Starts from
 * server-rendered data, merges each tick into it, disconnects while the tab
 * is hidden, and falls back to polling /api/market/quote if the stream can't
 * be established. A provider error keeps the last good values on screen.
 */
export function useLiveQuotes<T extends DataResult<Quote[]> | null>(
  symbols: string[],
  initial: T,
  fallbackMs = 15_000,
): { data: T | DataResult<Quote[]>; live: boolean } {
  const key = symbols.join(",");
  const [streamed, setStreamed] = useState<T | DataResult<Quote[]>>(initial);
  const [mode, setMode] = useState<"stream" | "poll">(() => (typeof window !== "undefined" && typeof EventSource === "undefined" ? "poll" : "stream"));
  const [live, setLive] = useState(false);
  const polled = usePoll<T | DataResult<Quote[]>>(mode === "poll" && key ? `/api/market/quote?symbols=${key}` : null, fallbackMs, initial);

  useEffect(() => {
    if (!key || mode !== "stream") return;
    let source: EventSource | null = null;
    let failures = 0;

    const onQuotes = (e: MessageEvent<string>) => {
      failures = 0;
      setLive(true);
      const msg = JSON.parse(e.data) as { data: Quote[]; meta: DataMeta };
      setStreamed((prev) => {
        const bySym = new Map(prev?.ok ? prev.data.map((q) => [q.symbol, q]) : []);
        for (const q of msg.data) bySym.set(q.symbol, q);
        return { ok: true, data: [...bySym.values()], meta: msg.meta };
      });
    };
    const connect = () => {
      if (source || document.visibilityState !== "visible") return;
      const s = new EventSource(`/api/market/stream?symbols=${key}`);
      s.addEventListener("quotes", onQuotes as EventListener);
      s.onopen = () => {
        failures = 0;
      };
      s.onerror = () => {
        setLive(false);
        // CONNECTING = the browser is retrying on its own (normal at the end of
        // each connection). CLOSED = it gave up (e.g. an HTTP error status).
        if (s.readyState === EventSource.CLOSED || ++failures >= MAX_STREAM_FAILURES) {
          s.close();
          source = null;
          setMode("poll");
        }
      };
      source = s;
    };
    const disconnect = () => {
      source?.close();
      source = null;
      setLive(false);
    };
    const onVisibility = () => (document.visibilityState === "visible" ? connect() : disconnect());

    connect();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      disconnect();
    };
  }, [key, mode]);

  // Until the first poll lands, keep showing the last streamed values.
  return mode === "poll" ? { data: polled.updatedAt ? polled.data : streamed, live: false } : { data: streamed, live };
}
