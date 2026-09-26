import type { DataMeta, DataMode } from "@/types/data";
import type { ProviderHealth } from "./types";

export const MOCK_SOURCE = "mock";
export const MOCK_LABEL = "NSALGO Simulator (mock data)";
export const MOCK_NOTICE = "Simulated data for development. Not market data.";

export function meta(source: string, sourceLabel: string, mode: DataMode, asOf?: string, extra?: Partial<DataMeta>): DataMeta {
  const now = new Date().toISOString();
  return { source, sourceLabel, mode, asOf: asOf ?? now, fetchedAt: now, ...extra };
}

export function mockMeta(asOf?: string): DataMeta {
  return meta(MOCK_SOURCE, MOCK_LABEL, "mock", asOf, { notice: MOCK_NOTICE });
}

export function healthy(message = "Operational", latencyMs: number | null = 0): ProviderHealth {
  return { ok: true, latencyMs, message, checkedAt: new Date().toISOString() };
}

export function unhealthy(message: string, latencyMs: number | null = null): ProviderHealth {
  return { ok: false, latencyMs, message, checkedAt: new Date().toISOString() };
}
