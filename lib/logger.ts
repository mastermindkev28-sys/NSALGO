import "server-only";
import type { SystemLog } from "@/types/domain";

/**
 * Structured logger. Writes JSON to stdout and keeps a bounded in-process ring
 * buffer for the admin System Health page. A persistent sink (system_logs
 * table) is attached by the repository layer at startup.
 */
type Sink = (log: SystemLog) => void | Promise<void>;

const g = globalThis as unknown as { __nsalgoLogs?: SystemLog[]; __nsalgoSinks?: Sink[] };
const ring: SystemLog[] = (g.__nsalgoLogs ??= []);
const sinks: Sink[] = (g.__nsalgoSinks ??= []);

export function addLogSink(s: Sink) {
  if (!sinks.includes(s)) sinks.push(s);
}

function write(level: SystemLog["level"], scope: string, message: string, context?: Record<string, unknown>) {
  const entry: SystemLog = {
    id: crypto.randomUUID(),
    level,
    scope,
    message,
    context: context ?? null,
    createdAt: new Date().toISOString(),
  };
  ring.unshift(entry);
  if (ring.length > 500) ring.length = 500;
  if (process.env.NODE_ENV !== "test") {
    const line = JSON.stringify({ level, scope, message, ...context, ts: entry.createdAt });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else if (process.env.LOG_LEVEL === "debug") console.log(line);
  }
  for (const s of sinks) {
    try {
      void s(entry);
    } catch {
      /* sinks must never break the request */
    }
  }
}

export const log = {
  info: (scope: string, message: string, context?: Record<string, unknown>) => write("info", scope, message, context),
  warn: (scope: string, message: string, context?: Record<string, unknown>) => write("warn", scope, message, context),
  error: (scope: string, message: string, context?: Record<string, unknown>) => write("error", scope, message, context),
};

export function recentLogs(limit = 100, level?: SystemLog["level"]): SystemLog[] {
  return (level ? ring.filter((l) => l.level === level) : ring).slice(0, limit);
}
