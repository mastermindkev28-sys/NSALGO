import { z } from "zod";
import { apiError, json, route } from "@/lib/api";
import { db } from "@/db";
import { track } from "@/services/analytics";

const Create = z.object({ name: z.string().trim().min(1).max(40) });

/** GET /api/watchlists — the member's watchlists. POST — create one. */
export const GET = route({ auth: "user" }, async ({ viewer }) => json({ ok: true, data: await db().watchlists.list(viewer!.user.id) }));

export const POST = route({ auth: "user", body: Create }, async ({ viewer, body }) => {
  const existing = await db().watchlists.list(viewer!.user.id);
  if (existing.length >= 20) return apiError(400, "INVALID_REQUEST", "Watchlist limit reached (20).");
  try {
    const w = await db().watchlists.create(viewer!.user.id, body.name);
    void track("watchlist_created", { userId: viewer!.user.id });
    return json({ ok: true, data: w }, 201);
  } catch (e) {
    return apiError(409, "CONFLICT", (e as Error).message.includes("exists") ? "A watchlist with that name already exists." : "Could not create watchlist.");
  }
});
