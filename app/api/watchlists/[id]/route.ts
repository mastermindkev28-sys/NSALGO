import { z } from "zod";
import { apiError, json, route } from "@/lib/api";
import { db } from "@/db";

const Rename = z.object({ name: z.string().trim().min(1).max(40) });
type P = { id: string };

export const GET = route<undefined, undefined, P>({ auth: "user" }, async ({ viewer }, { id }) => {
  const w = await db().watchlists.get(viewer!.user.id, id);
  return w ? json({ ok: true, data: w }) : apiError(404, "NOT_FOUND", "Watchlist not found.");
});

export const PATCH = route<undefined, typeof Rename, P>({ auth: "user", body: Rename }, async ({ viewer, body }, { id }) => {
  const w = await db().watchlists.rename(viewer!.user.id, id, body.name);
  return w ? json({ ok: true, data: w }) : apiError(404, "NOT_FOUND", "Watchlist not found.");
});

export const DELETE = route<undefined, undefined, P>({ auth: "user" }, async ({ viewer }, { id }) => {
  const ok = await db().watchlists.delete(viewer!.user.id, id);
  return ok ? json({ ok: true }) : apiError(404, "NOT_FOUND", "Watchlist not found.");
});
