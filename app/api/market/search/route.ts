import { z } from "zod";
import { dataResponse, route } from "@/lib/api";
import { searchSymbols } from "@/services/market";

const Query = z.object({ q: z.string().trim().min(1).max(40), limit: z.coerce.number().int().min(1).max(25).default(10) });

/** GET /api/market/search?q=nvidia — symbol autocomplete (symbol, company, exchange, asset type). */
export const GET = route({ query: Query, limit: "search" }, async ({ query }) => dataResponse(await searchSymbols(query.q, query.limit), 60));
