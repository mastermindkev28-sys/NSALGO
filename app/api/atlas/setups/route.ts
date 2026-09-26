import { z } from "zod";
import { json, route } from "@/lib/api";
import { scan } from "@/services/atlas/engine";

const Query = z.object({ mode: z.enum(["day", "swing"]).default("swing") });

/** GET /api/atlas/setups?mode=day|swing — today's ranked, thresholded setups (members). */
export const GET = route({ query: Query, auth: "member" }, async ({ query }) => {
  const r = await scan(query.mode);
  return json({ ok: true, data: r });
});
