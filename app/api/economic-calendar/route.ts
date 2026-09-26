import { z } from "zod";
import { apiError, dataResponse, route } from "@/lib/api";
import { addDays, currentSessionDate, daysBetween } from "@/lib/market-time";
import { listEconomicEvents } from "@/services/intel";

const Query = z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

/** GET /api/economic-calendar — scheduled releases; forecast/actual are null until published. */
export const GET = route({ query: Query }, async ({ query }) => {
  const from = query.from ?? currentSessionDate();
  const to = query.to ?? addDays(from, 7);
  if (daysBetween(from, to) < 0 || daysBetween(from, to) > 62) return apiError(400, "INVALID_REQUEST", "Range must be 0–62 days.");
  return dataResponse(await listEconomicEvents(from, to), 300);
});
