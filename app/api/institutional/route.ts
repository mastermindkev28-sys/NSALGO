import { z } from "zod";
import { dataResponse, route } from "@/lib/api";
import { listInstitutional } from "@/services/intel";

const Query = z.object({
  category: z.enum(["13f", "large-options", "large-equity", "large-premium", "unusual-options-volume"]).optional(),
  ticker: z.string().trim().toUpperCase().regex(/^[A-Z.]{1,8}$/).optional(),
  person: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

/** GET /api/institutional — whale / institutional activity with source attribution (members). */
export const GET = route({ query: Query, auth: "member" }, async ({ query }) => dataResponse(await listInstitutional(query), 600));
