import { z } from "zod";
import { apiError, json, route } from "@/lib/api";
import { db } from "@/db";

const Create = z
  .object({
    kind: z.enum(["price-above", "price-below", "atlas-score", "options-flow", "news", "earnings", "unusual-volume", "insider"]),
    symbol: z.string().trim().toUpperCase().regex(/^[A-Z0-9.^-]{1,12}$/),
    threshold: z.number().finite().positive().max(1e12).nullable().default(null),
    channel: z.enum(["in-app", "email", "push"]).default("in-app"),
  })
  .refine((a) => !["price-above", "price-below", "atlas-score"].includes(a.kind) || a.threshold !== null, { message: "This alert type needs a threshold.", path: ["threshold"] })
  .refine((a) => a.kind !== "atlas-score" || (a.threshold ?? 0) <= 100, { message: "Atlas score threshold must be 0–100.", path: ["threshold"] });

/** GET lists the member's alerts; POST creates one (in-app delivery; email/push are future channels). */
export const GET = route({ auth: "user" }, async ({ viewer }) => json({ ok: true, data: await db().alerts.list(viewer!.user.id) }));

export const POST = route({ auth: "member", body: Create }, async ({ viewer, body }) => {
  const existing = await db().alerts.list(viewer!.user.id);
  if (existing.length >= 50) return apiError(400, "INVALID_REQUEST", "Alert limit reached (50).");
  if (body.channel !== "in-app") return apiError(400, "UNSUPPORTED", "Email and push alerts are not yet available.");
  const a = await db().alerts.create({ userId: viewer!.user.id, kind: body.kind, symbol: body.symbol, threshold: body.threshold, channel: body.channel, active: true });
  return json({ ok: true, data: a }, 201);
});
