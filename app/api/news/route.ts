import { z } from "zod";
import { dataResponse, route } from "@/lib/api";
import { listNews } from "@/services/intel";
import { NEWS_CATEGORIES } from "@/types/news";

const Query = z.object({
  category: z.enum(NEWS_CATEGORIES).optional(),
  ticker: z.string().trim().toUpperCase().regex(/^[A-Z.]{1,8}$/).optional(),
  q: z.string().trim().max(64).optional(),
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

/** GET /api/news — headline feed from the configured licensed NewsProvider. */
export const GET = route({ query: Query }, async ({ query }) => dataResponse(await listNews(query), 30));
