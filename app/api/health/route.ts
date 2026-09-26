import { json } from "@/lib/api";
import { db } from "@/db";

/** GET /api/health — liveness + database reachability for uptime monitors. */
export async function GET() {
  const started = Date.now();
  let database = "ok";
  try {
    const repos = db();
    if (repos.kind === "unavailable") throw new Error("not configured");
    await repos.users.count();
  } catch {
    database = "unavailable";
  }
  return json({ status: database === "ok" ? "ok" : "degraded", database, dataMode: process.env.DATA_MODE ?? "mock", latencyMs: Date.now() - started, time: new Date().toISOString() }, database === "ok" ? 200 : 503);
}
