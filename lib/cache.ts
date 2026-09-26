import "server-only";

/**
 * Process-local TTL cache with stale-if-error semantics. The interface is
 * intentionally small so it can be backed by Redis/Upstash in multi-instance
 * deployments (see CacheStore).
 */
export interface CacheStore {
  get<T>(key: string): { value: T; expiresAt: number; storedAt: number } | undefined;
  set<T>(key: string, value: T, ttlMs: number): void;
  delete(key: string): void;
  clearExpired(maxStaleMs: number): number;
  size(): number;
}

class MemoryStore implements CacheStore {
  private map = new Map<string, { value: unknown; expiresAt: number; storedAt: number }>();
  constructor(private maxEntries = 5000) {}
  get<T>(key: string) {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    // refresh LRU position
    this.map.delete(key);
    this.map.set(key, hit);
    return hit as { value: T; expiresAt: number; storedAt: number };
  }
  set<T>(key: string, value: T, ttlMs: number) {
    this.map.delete(key);
    this.map.set(key, { value, expiresAt: Date.now() + ttlMs, storedAt: Date.now() });
    while (this.map.size > this.maxEntries) {
      const first = this.map.keys().next().value;
      if (first === undefined) break;
      this.map.delete(first);
    }
  }
  delete(key: string) {
    this.map.delete(key);
  }
  clearExpired(maxStaleMs: number) {
    const cutoff = Date.now() - maxStaleMs;
    let n = 0;
    for (const [k, v] of this.map) {
      if (v.expiresAt < cutoff) {
        this.map.delete(k);
        n++;
      }
    }
    return n;
  }
  size() {
    return this.map.size;
  }
}

const g = globalThis as unknown as { __nsalgoCache?: CacheStore; __nsalgoInflight?: Map<string, Promise<unknown>> };
export const cacheStore: CacheStore = (g.__nsalgoCache ??= new MemoryStore());
const inflight: Map<string, Promise<unknown>> = (g.__nsalgoInflight ??= new Map());

export interface CachedResult<T> {
  value: T;
  stale: boolean;
  cachedAt: number;
}

/**
 * Returns a fresh cached value, or runs `loader` (deduplicating concurrent
 * calls). If the loader reports failure and a previous value exists, the stale
 * value is returned with `stale: true` so the UI can degrade gracefully.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  isFailure: (v: T) => boolean = () => false,
): Promise<CachedResult<T>> {
  const hit = cacheStore.get<T>(key);
  if (hit && hit.expiresAt > Date.now()) return { value: hit.value, stale: false, cachedAt: hit.storedAt };

  const existing = inflight.get(key) as Promise<T> | undefined;
  const p =
    existing ??
    (async () => {
      try {
        return await loader();
      } finally {
        inflight.delete(key);
      }
    })();
  if (!existing) inflight.set(key, p);

  try {
    const value = await p;
    if (isFailure(value)) {
      if (hit) return { value: hit.value, stale: true, cachedAt: hit.storedAt };
      return { value, stale: false, cachedAt: Date.now() };
    }
    cacheStore.set(key, value, ttlMs);
    return { value, stale: false, cachedAt: Date.now() };
  } catch (err) {
    if (hit) return { value: hit.value, stale: true, cachedAt: hit.storedAt };
    throw err;
  }
}
