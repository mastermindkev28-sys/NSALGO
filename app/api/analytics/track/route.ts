import { z } from "zod";
import { apiError, json, route } from "@/lib/api";
import { ANALYTICS_EVENTS } from "@/config/analytics";
import { getSessionUser } from "@/services/auth/session";
import { track } from "@/services/analytics";

const Body = z.object({
  name: z.enum(ANALYTICS_EVENTS),
  properties: z.record(z.string().max(40), z.union([z.string().max(200), z.number(), z.boolean(), z.null(), z.array(z.string().max(40)).max(10)])).optional(),
  path: z.string().max(300).optional(),
  anonymousId: z.string().max(64).optional(),
});

/** POST /api/analytics/track — first-party product analytics (no third-party trackers required). */
export const POST = route({ body: Body, limit: "analytics" }, async ({ body }) => {
  if (Object.keys(body.properties ?? {}).length > 12) return apiError(400, "INVALID_REQUEST", "Too many properties.");
  const user = await getSessionUser();
  await track(body.name, { userId: user?.id ?? null, anonymousId: body.anonymousId ?? null, path: body.path ?? null, properties: body.properties });
  return json({ ok: true }, 202);
});
