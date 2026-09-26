import { z } from "zod";
import { json, route } from "@/lib/api";
import { db } from "@/db";

const Mark = z.object({ ids: z.union([z.literal("all"), z.array(z.string().uuid()).max(200)]) });

/** GET in-app notifications + unread count; POST marks them read. */
export const GET = route({ auth: "user" }, async ({ viewer }) => {
  const [items, unread] = await Promise.all([db().notifications.list(viewer!.user.id, 30), db().notifications.unreadCount(viewer!.user.id)]);
  return json({ ok: true, data: { items, unread } });
});

export const POST = route({ auth: "user", body: Mark }, async ({ viewer, body }) => {
  await db().notifications.markRead(viewer!.user.id, body.ids);
  return json({ ok: true });
});
