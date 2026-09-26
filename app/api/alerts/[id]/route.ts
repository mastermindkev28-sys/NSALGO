import { z } from "zod";
import { apiError, json, route } from "@/lib/api";
import { db } from "@/db";

const Patch = z.object({ active: z.boolean().optional(), threshold: z.number().finite().positive().max(1e12).optional() });
type P = { id: string };

export const PATCH = route<undefined, typeof Patch, P>({ auth: "user", body: Patch }, async ({ viewer, body }, { id }) => {
  const a = await db().alerts.update(viewer!.user.id, id, body);
  return a ? json({ ok: true, data: a }) : apiError(404, "NOT_FOUND", "Alert not found.");
});

export const DELETE = route<undefined, undefined, P>({ auth: "user" }, async ({ viewer }, { id }) => {
  const ok = await db().alerts.delete(viewer!.user.id, id);
  return ok ? json({ ok: true }) : apiError(404, "NOT_FOUND", "Alert not found.");
});
