import { z } from "zod";
import { dataResponse, route } from "@/lib/api";
import { getQuotes } from "@/services/market";

const Query = z.object({
  symbols: z
    .string()
    .min(1)
    .max(600)
    .transform((s) => s.split(",").map((x) => x.trim().toUpperCase()).filter(Boolean))
    .pipe(z.array(z.string().regex(/^[A-Z0-9.^:-]{1,12}$/)).min(1).max(60)),
});

/** GET /api/market/quote?symbols=SPY,QQQ — quotes from the configured MarketDataProvider. */
export const GET = route({ query: Query }, async ({ query }) => dataResponse(await getQuotes(query.symbols), 5));
