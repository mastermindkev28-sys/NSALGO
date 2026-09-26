import "server-only";

/** Minimal outbound HTTP client for provider adapters: timeouts, bounded retries, per-host throttling. */

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const hostBuckets = new Map<string, { tokens: number; last: number; rate: number }>();

/** Token-bucket throttle — e.g. SEC fair access caps automated clients at 10 req/s. */
export async function throttle(host: string, perSecond: number): Promise<void> {
  const now = Date.now();
  const b = hostBuckets.get(host) ?? { tokens: perSecond, last: now, rate: perSecond };
  b.tokens = Math.min(perSecond, b.tokens + ((now - b.last) / 1000) * perSecond);
  b.last = now;
  if (b.tokens < 1) {
    const waitMs = ((1 - b.tokens) / perSecond) * 1000;
    hostBuckets.set(host, b);
    await new Promise((r) => setTimeout(r, waitMs));
    return throttle(host, perSecond);
  }
  b.tokens -= 1;
  hostBuckets.set(host, b);
}

export interface FetchJsonOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
  perSecond?: number;
  method?: "GET" | "POST";
  body?: string;
}

export async function fetchJson<T>(url: string, opts: FetchJsonOptions = {}): Promise<T> {
  const { headers, timeoutMs = 8000, retries = 1, perSecond, method = "GET", body } = opts;
  const host = new URL(url).host;
  let attempt = 0;
  for (;;) {
    if (perSecond) await throttle(host, perSecond);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { method, headers: { Accept: "application/json", ...headers }, body, signal: ctrl.signal, cache: "no-store" });
      if (!res.ok) {
        if ((res.status === 429 || res.status >= 500) && attempt < retries) {
          attempt++;
          await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
          continue;
        }
        throw new HttpError(res.status, `${res.status} ${res.statusText} from ${host}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof HttpError) throw err;
      if (attempt < retries) {
        attempt++;
        continue;
      }
      throw new HttpError(0, `Network error contacting ${host}: ${(err as Error).message}`);
    } finally {
      clearTimeout(timer);
    }
  }
}

export async function fetchText(url: string, opts: FetchJsonOptions = {}): Promise<string> {
  const { headers, timeoutMs = 8000, perSecond } = opts;
  const host = new URL(url).host;
  if (perSecond) await throttle(host, perSecond);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new HttpError(res.status, `${res.status} from ${host}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}
