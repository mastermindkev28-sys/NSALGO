import { z } from "zod";
import { dataResponse, route } from "@/lib/api";
import { getFlow } from "@/services/intel";

const Query = z.object({
  symbol: z.string().trim().toUpperCase().regex(/^[A-Z.]{1,8}$/).optional(),
  right: z.enum(["call", "put"]).optional(),
  minPremium: z.coerce.number().min(0).max(1e10).optional(),
  sentiment: z.enum(["bullish", "bearish", "neutral"]).optional(),
  execution: z.enum(["sweep", "block", "split", "single"]).optional(),
  unusualOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(200),
});

/** GET /api/options/flow — large options prints; classification fields are null when the provider doesn't supply them. */
export const GET = route({ query: Query, auth: "member" }, async ({ query }) => dataResponse(await getFlow(query), 10));
