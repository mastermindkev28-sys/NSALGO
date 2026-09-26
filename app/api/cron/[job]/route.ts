import { timingSafeEqual } from "node:crypto";
import { apiError, json } from "@/lib/api";
import { isJob, runJob } from "@/services/jobs";

export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

/** GET /api/cron/:job — scheduled job trigger (Bearer CRON_SECRET). */
export async function GET(req: Request, { params }: { params: Promise<{ job: string }> }) {
  if (!authorized(req)) return apiError(401, "UNAUTHORIZED", "Invalid cron credentials.");
  const { job } = await params;
  if (!isJob(job)) return apiError(404, "NOT_FOUND", "Unknown job.");
  const r = await runJob(job);
  return json(r, r.ok ? 200 : 500);
}
