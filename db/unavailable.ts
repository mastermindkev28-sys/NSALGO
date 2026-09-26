import type { Repositories } from "./types";

/**
 * Used when DATA_MODE=production but DATABASE_URL is missing. Instead of
 * crashing every page (or silently falling back to a volatile in-memory store),
 * reads resolve empty so public pages still render, fire-and-forget telemetry
 * is dropped, and every other write rejects with an explicit error.
 * /api/health reports the database as unavailable (503).
 */
export class DatabaseUnavailableError extends Error {
  constructor() {
    super("Database is not configured (DATABASE_URL is required when DATA_MODE=production).");
    this.name = "DatabaseUnavailableError";
  }
}

const LIST = /^(list|all)|^(popularSymbols|eventCounts|topProperty)$/;
const NULLABLE = /^(get|find)/;
const COUNT = /^(count|countAll|countSetups|unreadCount|distinctUsers|purgeExpired)$/;
const TELEMETRY = /^(insertLog|track|touch)$/;

function repo(): unknown {
  return new Proxy(
    {},
    {
      get: (_t, prop) => {
        const name = String(prop);
        if (name === "then") return undefined; // not a thenable
        if (LIST.test(name)) return async () => [];
        if (COUNT.test(name)) return async () => 0;
        if (NULLABLE.test(name)) return async () => null;
        if (TELEMETRY.test(name)) return async () => undefined;
        return async () => {
          throw new DatabaseUnavailableError();
        };
      },
    },
  );
}

export function unavailableRepositories(): Repositories {
  const keys = ["users", "profiles", "sessions", "tokens", "billing", "watchlists", "alerts", "notifications", "education", "commentary", "atlas", "ops"] as const;
  return { kind: "unavailable", ...Object.fromEntries(keys.map((k) => [k, repo()])) } as unknown as Repositories;
}
