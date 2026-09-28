import "server-only";
import { addLogSink } from "@/lib/logger";
import { memoryRepositories } from "./memory";
import { postgresRepositories } from "./postgres";
import type { Repositories } from "./types";
import { unavailableRepositories } from "./unavailable";
import { databaseUrl, databaseUrlMalformed } from "./url";

let repos: Repositories | undefined;

/**
 * Repository factory. DATABASE_URL (or POSTGRES_URL) → PostgreSQL; otherwise the in-memory store
 * (refused in production so a misconfigured deploy can't silently lose data —
 * public pages degrade, writes fail loudly and /api/health reports 503).
 */
export function db(): Repositories {
  if (repos) return repos;
  const url = databaseUrl();
  if (databaseUrlMalformed()) {
    // A placeholder or malformed value would otherwise throw on every query.
    console.error("[db] DATABASE_URL is not a valid connection URL — running with the database unavailable.");
    repos = unavailableRepositories();
    return repos;
  }
  if (url) {
    repos = postgresRepositories(url);
  } else {
    if (process.env.NODE_ENV === "production" && process.env.DATA_MODE === "production") {
      console.error("[db] DATABASE_URL is required when DATA_MODE=production — running with the database unavailable.");
      repos = unavailableRepositories();
      return repos;
    }
    repos = memoryRepositories();
  }
  const r = repos;
  addLogSink((l) => {
    if (l.level !== "info") return r.ops.insertLog(l).catch(() => undefined);
  });
  return repos;
}

export type { Repositories } from "./types";
