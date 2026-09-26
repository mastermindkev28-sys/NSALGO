import { apiError, json, route } from "@/lib/api";
import { symbolIntelligence } from "@/services/atlas/engine";
import { track } from "@/services/analytics";

/** GET /api/atlas/:ticker — day + swing analysis for one symbol (members). */
export const GET = route<undefined, undefined, { ticker: string }>({ auth: "member" }, async ({ viewer }, params) => {
  const t = params.ticker?.toUpperCase();
  if (!t || !/^[A-Z.]{1,8}$/.test(t)) return apiError(400, "INVALID_REQUEST", "Invalid ticker.");
  const r = await symbolIntelligence(t);
  if (!r.day && !r.swing) return apiError(404, "NOT_FOUND", "No Atlas analysis available for this symbol.");
  void track("atlas_setup_viewed", { userId: viewer?.user.id, properties: { symbol: t } });
  return json({ ok: true, data: { day: r.day?.setup ?? null, swing: r.swing?.setup ?? null, regime: r.regime, unavailable: r.unavailable } });
});
