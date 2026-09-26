import { apiError, dataResponse, route } from "@/lib/api";
import { getArticle } from "@/services/intel";

/** GET /api/news/:id — one article (licensed fields only). */
export const GET = route<undefined, undefined, { id: string }>({}, async (_ctx, params) => {
  if (!params.id || params.id.length > 200) return apiError(400, "INVALID_REQUEST", "Invalid id.");
  return dataResponse(await getArticle(decodeURIComponent(params.id)), 60);
});
