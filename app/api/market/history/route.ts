import { z } from "zod";
import { dataResponse, route } from "@/lib/api";
import { getHistory } from "@/services/market";

const Query = z.object({
  symbol: z.string().trim().toUpperCase().regex(/^[A-Z0-9.^:-]{1,12}$/),
  range: z.enum(["1D", "5D", "1M", "3M", "6M", "YTD", "1Y", "5Y"]).default("3M"),
  interval: z.enum(["1m", "5m", "15m", "1h", "1d", "1w"]).default("1d"),
});

/** GET /api/market/history — OHLCV bars (backend datafeed for NSALGO charts). */
export const GET = route({ query: Query }, async ({ query }) => dataResponse(await getHistory(query.symbol, query.range, query.interval), 15));
