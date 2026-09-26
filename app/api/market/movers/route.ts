import { z } from "zod";
import { dataResponse, route } from "@/lib/api";
import { getMovers } from "@/services/market";

const Query = z.object({ kind: z.enum(["gainers", "losers", "active", "unusual-volume"]).default("gainers"), limit: z.coerce.number().int().min(1).max(50).default(10) });

export const GET = route({ query: Query }, async ({ query }) => dataResponse(await getMovers(query.kind, query.limit), 15));
