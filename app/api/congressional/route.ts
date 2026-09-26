import { z } from "zod";
import { dataResponse, route } from "@/lib/api";
import { listCongress } from "@/services/intel";

const Query = z.object({
  chamber: z.enum(["house", "senate"]).optional(),
  person: z.string().trim().max(80).optional(),
  ticker: z.string().trim().toUpperCase().regex(/^[A-Z.]{1,8}$/).optional(),
  transaction: z.enum(["purchase", "sale", "partial-sale", "exchange"]).optional(),
  since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

/** GET /api/congressional — public-official transaction disclosures with source documents (members). */
export const GET = route({ query: Query, auth: "member" }, async ({ query }) => dataResponse(await listCongress(query), 600));
