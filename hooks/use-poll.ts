"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Visibility-aware polling. Starts from server-rendered data, refreshes on an
 * interval only while the tab is visible, and keeps the last good value if a
 * refresh fails (graceful degradation).
 */
export function usePoll<T>(url: string | null, intervalMs: number, initial: T): { data: T; error: boolean; updatedAt: number | null } {
  const [data, setData] = useState<T>(initial);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const urlRef = useRef(url);
  urlRef.current = url;

  useEffect(() => {
    if (!url) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const ctrl = new AbortController();
    const tick = async () => {
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
          if (!res.ok) throw new Error(String(res.status));
          const json = (await res.json()) as T;
          if (!stopped && urlRef.current === url) {
            setData(json);
            setError(false);
            setUpdatedAt(Date.now());
          }
        } catch (e) {
          if ((e as Error).name !== "AbortError" && !stopped) setError(true);
        }
      }
      if (!stopped) timer = setTimeout(tick, intervalMs);
    };
    timer = setTimeout(tick, intervalMs);
    const onVis = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        void tick();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stopped = true;
      ctrl.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [url, intervalMs]);

  return { data, error, updatedAt };
}

/** Flash direction when a numeric value changes (for tick animations). */
export function useTickFlash(value: number | null | undefined): "up" | "down" | null {
  const prev = useRef(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    if (value === null || value === undefined || prev.current === null || prev.current === undefined) {
      prev.current = value;
      return;
    }
    if (value !== prev.current) {
      setFlash(value > prev.current ? "up" : "down");
      prev.current = value;
      const t = setTimeout(() => setFlash(null), 900);
      return () => clearTimeout(t);
    }
  }, [value]);
  return flash;
}
