import { z } from "zod";
import { dataResponse, route } from "@/lib/api";
import { scanOptions } from "@/services/options-scanner";

const num = z.coerce.number().finite();
const Query = z.object({
  symbols: z.string().max(400).optional().transform((s) => (s ? s.split(",").map((x) => x.trim().toUpperCase()).filter((x) => /^[A-Z.]{1,8}$/.test(x)) : undefined)),
  right: z.enum(["call", "put"]).optional(),
  minDte: num.int().min(0).optional(),
  maxDte: num.int().max(1000).optional(),
  minDelta: num.min(0).max(1).optional(),
  maxDelta: num.min(0).max(1).optional(),
  minIv: num.min(0).max(10).optional(),
  maxIv: num.min(0).max(10).optional(),
  minVolume: num.min(0).optional(),
  minOpenInterest: num.min(0).optional(),
  minVolOi: num.min(0).optional(),
  maxSpreadPct: num.min(0).max(1000).optional(),
  minPremium: num.min(0).optional(),
  preset: z.enum(["most-active", "unusual", "high-vol-oi", "large-premium", "high-iv", "low-iv", "directional"]).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(150),
});

/** GET /api/options/scan — options scanner with filters and presets (members). */
export const GET = route({ query: Query, auth: "member", limit: "heavy" }, async ({ query }) => {
  const { limit, ...f } = query;
  return dataResponse(await scanOptions(f, limit), 15);
});
