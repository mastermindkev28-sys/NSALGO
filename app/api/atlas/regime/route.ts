import { json, route } from "@/lib/api";
import { getRegime } from "@/services/atlas/engine";

/** GET /api/atlas/regime — current market regime with reasoning. */
export const GET = route({}, async () => json({ ok: true, data: await getRegime() }));
