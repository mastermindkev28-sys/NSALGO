import { z } from "zod";
import { dataResponse, route } from "@/lib/api";
import { getOptionChain } from "@/services/intel";

const Query = z.object({
  symbol: z.string().trim().toUpperCase().regex(/^[A-Z.]{1,8}$/),
  expiration: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** GET /api/options/chain — options chain for one expiration (members). */
export const GET = route({ query: Query, auth: "member" }, async ({ query }) => dataResponse(await getOptionChain(query.symbol, query.expiration), 15));
