import { z } from "zod";
import { json, route } from "@/lib/api";
import { getViewer } from "@/services/membership";
import { globalSearch } from "@/services/search";
import { track } from "@/services/analytics";

const Query = z.object({ q: z.string().trim().min(1).max(64) });

/** GET /api/search?q= — global search: tickers, companies, articles, Atlas setups, people, concepts. */
export const GET = route({ query: Query, limit: "search" }, async ({ query }) => {
  const v = await getViewer();
  const results = await globalSearch(query.q, { member: v.paid });
  if (query.q.length >= 2) void track("search_performed", { userId: v.user?.id ?? null, properties: { q: query.q.slice(0, 32).toUpperCase() } });
  return json(results);
});
