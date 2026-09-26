/**
 * Provenance metadata that travels with every piece of data rendered in NSALGO.
 * Nothing reaches the UI without a source, a mode, and a timestamp.
 */
export type DataMode = "mock" | "live" | "delayed" | "eod";

export interface DataMeta {
  /** Stable provider id, e.g. "polygon", "sec-edgar", "mock". */
  source: string;
  /** Human readable attribution, e.g. "Polygon.io", "SEC EDGAR". */
  sourceLabel: string;
  mode: DataMode;
  /** ISO timestamp the data represents (provider time). */
  asOf: string;
  /** ISO timestamp NSALGO fetched it. */
  fetchedAt: string;
  delayMinutes?: number;
  /** True when served from cache after a provider error. */
  stale?: boolean;
  notice?: string;
}

export type ErrorCode =
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_NOT_CONFIGURED"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "INVALID_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "UNSUPPORTED"
  | "INTERNAL";

export interface DataError {
  code: ErrorCode;
  message: string;
}

export type DataResult<T> =
  | { ok: true; data: T; meta: DataMeta }
  | { ok: false; error: DataError; meta?: Partial<DataMeta> };

export function ok<T>(data: T, meta: DataMeta): DataResult<T> {
  return { ok: true, data, meta };
}

export function fail<T = never>(code: ErrorCode, message: string, meta?: Partial<DataMeta>): DataResult<T> {
  return { ok: false, error: { code, message }, meta };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
