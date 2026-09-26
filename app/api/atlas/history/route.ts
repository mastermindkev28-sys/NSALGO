import { z } from "zod";
import { json, route } from "@/lib/api";
import { atlasHistory } from "@/services/atlas/history";

const Query = z.object({ mode: z.enum(["day", "swing"]).optional(), status: z.enum(["open", "closed"]).optional(), symbol: z.string().trim().toUpperCase().max(8).optional(), limit: z.coerce.number().int().min(1).max(500).default(200) });

/** GET /api/atlas/history — every recorded setup with its outcome (members). */
export const GET = route({ query: Query, auth: "member" }, async ({ query }) => json({ ok: true, data: await atlasHistory(query) }));
