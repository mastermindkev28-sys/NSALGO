import "server-only";

/**
 * Sliding-window rate limiter. The default store is process-local; for
 * multi-instance deployments implement RateLimitStore over Redis/Upstash and
 * register it with setRateLimitStore().
 */
export interface RateLimitStore {
  hit(key: string, windowMs: number): Promise<number>; // returns hits within window including this one
}

class MemoryRateLimitStore implements RateLimitStore {
  private hits = new Map<string, number[]>();
  async hit(key: string, windowMs: number) {
    const now = Date.now();
    const arr = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    arr.push(now);
    this.hits.set(key, arr);
    if (this.hits.size > 50_000) {
      for (const [k, v] of this.hits) if (!v.some((t) => now - t < windowMs)) this.hits.delete(k);
    }
    return arr.length;
  }
}

const g = globalThis as unknown as { __nsalgoRl?: RateLimitStore };
let store: RateLimitStore = (g.__nsalgoRl ??= new MemoryRateLimitStore());

export function setRateLimitStore(s: RateLimitStore) {
  store = s;
  g.__nsalgoRl = s;
}

export const LIMITS = {
  login: { limit: 8, windowMs: 15 * 60_000 },
  signup: { limit: 5, windowMs: 60 * 60_000 },
  passwordReset: { limit: 5, windowMs: 60 * 60_000 },
  api: { limit: 120, windowMs: 60_000 },
  search: { limit: 60, windowMs: 60_000 },
  heavy: { limit: 20, windowMs: 60_000 },
  contact: { limit: 3, windowMs: 60 * 60_000 },
  analytics: { limit: 120, windowMs: 60_000 },
} as const;

export type LimitName = keyof typeof LIMITS;

export async function rateLimit(name: LimitName, identifier: string): Promise<{ ok: boolean; remaining: number; retryAfterSec: number }> {
  const { limit, windowMs } = LIMITS[name];
  const n = await store.hit(`${name}:${identifier}`, windowMs);
  return { ok: n <= limit, remaining: Math.max(0, limit - n), retryAfterSec: Math.ceil(windowMs / 1000) };
}
