import { z } from "zod";
import { json, route } from "@/lib/api";
import { runScanner } from "@/services/atlas/scanner";

const Query = z.object({ mode: z.enum(["day", "swing"]).default("swing") });

/** GET /api/atlas/scan — full-universe analysis (not thresholded) for the Market Scanner (members). */
export const GET = route({ query: Query, auth: "member", limit: "heavy" }, async ({ query }) => json({ ok: true, data: await runScanner(query.mode) }));
