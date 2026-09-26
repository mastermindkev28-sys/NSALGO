import "server-only";
import { db } from "@/db";
import type { AtlasMode, AtlasSetup } from "@/types/atlas";
import { backfillSimulatedHistory, refreshOpenSetups } from "./engine";
import { outcomeReturn, TERMINAL } from "./lifecycle";

export interface HistoryStats {
  total: number;
  open: number;
  closed: number;
  triggered: number;
  targetReached: number;
  invalidated: number;
  expired: number;
  /** Among triggered setups that resolved at target or invalidation. */
  targetRate: number | null;
  avgReturnPct: number | null;
}

let lastRefresh = 0;

/**
 * Atlas history — every recorded setup and outcome. Nothing is filtered by
 * result; statistics are computed over the full set shown.
 */
export async function atlasHistory(opts: { mode?: AtlasMode; status?: "open" | "closed"; symbol?: string; limit?: number }) {
  await backfillSimulatedHistory(30);
  if (Date.now() - lastRefresh > 5 * 60_000) {
    lastRefresh = Date.now();
    await refreshOpenSetups();
  }
  const setups = await db().atlas.listSetups({ mode: opts.mode, status: opts.status, symbol: opts.symbol, limit: opts.limit ?? 300 });
  const rows = setups.map((s) => ({ setup: s, returnPct: outcomeReturn(s) }));
  return { rows, stats: stats(setups) };
}

export function stats(setups: AtlasSetup[]): HistoryStats {
  const closed = setups.filter((s) => TERMINAL.includes(s.status));
  const triggered = setups.filter((s) => s.statusHistory.some((h) => h.status === "triggered"));
  const tr = setups.filter((s) => s.status === "target-reached").length;
  const inv = setups.filter((s) => s.status === "invalidated" && s.statusHistory.some((h) => h.status === "triggered")).length;
  const returns = setups.map(outcomeReturn).filter((x): x is number => x !== null);
  return {
    total: setups.length,
    open: setups.length - closed.length,
    closed: closed.length,
    triggered: triggered.length,
    targetReached: tr,
    invalidated: setups.filter((s) => s.status === "invalidated").length,
    expired: setups.filter((s) => s.status === "expired").length,
    targetRate: tr + inv > 0 ? Math.round((tr / (tr + inv)) * 1000) / 10 : null,
    avgReturnPct: returns.length ? Math.round((returns.reduce((a, b) => a + b, 0) / returns.length) * 100) / 100 : null,
  };
}
