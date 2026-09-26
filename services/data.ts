import "server-only";
import { cached } from "@/lib/cache";
import { log } from "@/lib/logger";
import type { DataResult } from "@/types/data";

/**
 * Wraps a provider call with caching, stale-if-error fallback and logging.
 * A provider failure never throws into a page — it becomes a typed error the
 * UI renders as a degraded state.
 */
export async function load<T>(key: string, ttlMs: number, loader: () => Promise<DataResult<T>>): Promise<DataResult<T>> {
  try {
    const r = await cached(key, ttlMs, loader, (v) => !v.ok);
    const v = r.value;
    if (!v.ok) {
      if (v.error.code !== "PROVIDER_NOT_CONFIGURED" && v.error.code !== "NOT_FOUND" && v.error.code !== "UNSUPPORTED") {
        log.warn("provider", v.error.message, { key, code: v.error.code });
      }
      return v;
    }
    if (r.stale) {
      log.warn("provider", "Serving stale cached data after provider error", { key });
      return {
        ...v,
        meta: { ...v.meta, stale: true, notice: "Live data temporarily unavailable. Showing the latest available data." },
      };
    }
    return v;
  } catch (err) {
    log.error("provider", "Unhandled provider exception", { key, error: (err as Error).message });
    return { ok: false, error: { code: "PROVIDER_UNAVAILABLE", message: "Data provider temporarily unavailable." } };
  }
}

export function unwrap<T>(r: DataResult<T>, fallback: T): T {
  return r.ok ? r.data : fallback;
}
