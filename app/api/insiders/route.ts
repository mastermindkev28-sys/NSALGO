import { z } from "zod";
import { dataResponse, route } from "@/lib/api";
import { listInsiders } from "@/services/intel";

const Query = z.object({
  ticker: z.string().trim().toUpperCase().regex(/^[A-Z.]{1,8}$/).optional(),
  person: z.string().trim().max(80).optional(),
  transaction: z.enum(["purchase", "sale", "option-exercise", "award", "gift", "tax-withholding", "other"]).optional(),
  since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

/** GET /api/insiders — SEC Forms 3/4/5 transactions with filing links (members). */
export const GET = route({ query: Query, auth: "member" }, async ({ query }) => dataResponse(await listInsiders(query), 300));
