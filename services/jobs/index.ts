import "server-only";
import { db } from "@/db";
import { cacheStore } from "@/lib/cache";
import { log } from "@/lib/logger";
import { addDays, currentSessionDate } from "@/lib/market-time";
import { evaluateAlerts } from "@/services/alerts";
import { refreshOpenSetups, scan } from "@/services/atlas/engine";
import { getFlow, listCongress, listEconomicEvents, listInsiders, listInstitutional, listNews } from "@/services/intel";
import { getBreadth, getMovers, getQuotes, getSectors } from "@/services/market";
import { PULSE_SYMBOLS } from "@/config/universe";

/**
 * Scheduled jobs. Triggered by the platform scheduler (see vercel.json) via
 * /api/cron/:job with CRON_SECRET, or locally with `npm run jobs:run <job>`.
 * Each run is recorded in job_runs for System Health.
 */
export const JOBS = {
  "market-refresh": { schedule: "*/5 13-21 * * 1-5", description: "Warm quote, breadth, sector and mover caches", run: async () => {
    await Promise.all([getQuotes(PULSE_SYMBOLS.map((p) => p.symbol)), getBreadth(), getSectors(), getMovers("gainers"), getMovers("losers")]);
    return {};
  } },
  "news-ingest": { schedule: "*/10 * * * *", description: "Ingest licensed news feed", run: async () => {
    const r = await listNews({ limit: 100 });
    return { articles: r.ok ? r.data.length : 0, ok: r.ok };
  } },
  "sec-ingest": { schedule: "15 * * * 1-5", description: "Ingest SEC Form 3/4/5 and 13F filings", run: async () => {
    const [i, f] = await Promise.all([listInsiders({ limit: 200 }), listInstitutional({ category: "13f", limit: 200 })]);
    return { insider: i.ok ? i.data.length : 0, institutional: f.ok ? f.data.length : 0 };
  } },
  "congress-ingest": { schedule: "30 */6 * * *", description: "Ingest congressional disclosures", run: async () => {
    const r = await listCongress({ limit: 300 });
    return { disclosures: r.ok ? r.data.length : 0 };
  } },
  "calendar-refresh": { schedule: "0 */2 * * *", description: "Refresh economic calendar", run: async () => {
    const d = currentSessionDate();
    const r = await listEconomicEvents(d, addDays(d, 14));
    return { events: r.ok ? r.data.length : 0 };
  } },
  "options-flow-ingest": { schedule: "*/2 13-21 * * 1-5", description: "Refresh options flow", run: async () => {
    const r = await getFlow({ limit: 1000 });
    return { prints: r.ok ? r.data.length : 0, ok: r.ok };
  } },
  "atlas-day": { schedule: "*/5 13-20 * * 1-5", description: "Generate day-trade setups", run: async () => {
    const r = await scan("day");
    return { setups: r.setups.length, evaluated: r.evaluated };
  } },
  "atlas-swing": { schedule: "10 14,17,20 * * 1-5", description: "Generate swing setups", run: async () => {
    const r = await scan("swing");
    return { setups: r.setups.length, evaluated: r.evaluated };
  } },
  "atlas-lifecycle": { schedule: "*/10 13-21 * * 1-5", description: "Advance setup lifecycle states", run: async () => ({ updated: await refreshOpenSetups() }) },
  alerts: { schedule: "*/5 * * * *", description: "Evaluate member alerts", run: async () => evaluateAlerts() },
  cleanup: { schedule: "0 8 * * *", description: "Purge expired sessions and stale cache", run: async () => {
    const sessions = await db().sessions.purgeExpired();
    const cache = cacheStore.clearExpired(6 * 3600_000);
    return { sessions, cache };
  } },
} as const satisfies Record<string, { schedule: string; description: string; run: () => Promise<Record<string, unknown>> }>;

export type JobName = keyof typeof JOBS;

export function isJob(name: string): name is JobName {
  return name in JOBS;
}

export async function runJob(name: JobName) {
  const id = await db().ops.recordJob(name, "running");
  const started = Date.now();
  try {
    const detail = await JOBS[name].run();
    await db().ops.recordJob(name, "succeeded", { ...detail, ms: Date.now() - started }, id);
    return { ok: true as const, detail };
  } catch (e) {
    log.error("jobs", `Job ${name} failed`, { error: (e as Error).message });
    await db().ops.recordJob(name, "failed", { error: (e as Error).message, ms: Date.now() - started }, id);
    return { ok: false as const, error: (e as Error).message };
  }
}
