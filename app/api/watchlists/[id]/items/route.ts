import { z } from "zod";
import { apiError, json, route } from "@/lib/api";
import { db } from "@/db";
import { getSymbolInfo } from "@/services/market";

const Item = z.object({ symbol: z.string().trim().toUpperCase().regex(/^[A-Z0-9.^-]{1,12}$/), note: z.string().trim().max(200).nullish() });
const Remove = z.object({ symbol: z.string().trim().toUpperCase().regex(/^[A-Z0-9.^-]{1,12}$/) });
type P = { id: string };

/** POST adds a symbol (validated against the market data provider); DELETE removes it. */
export const POST = route<undefined, typeof Item, P>({ auth: "user", body: Item }, async ({ viewer, body }, { id }) => {
  const info = await getSymbolInfo(body.symbol);
  if (!info.ok) return apiError(400, "INVALID_REQUEST", `${body.symbol} is not a recognised symbol.`);
  const w = await db().watchlists.get(viewer!.user.id, id);
  if (!w) return apiError(404, "NOT_FOUND", "Watchlist not found.");
  if (w.items.length >= 100) return apiError(400, "INVALID_REQUEST", "Watchlist item limit reached (100).");
  const item = await db().watchlists.addItem(viewer!.user.id, id, info.data.symbol, body.note ?? null);
  return item ? json({ ok: true, data: item }, 201) : apiError(404, "NOT_FOUND", "Watchlist not found.");
});

export const DELETE = route<undefined, typeof Remove, P>({ auth: "user", body: Remove }, async ({ viewer, body }, { id }) => {
  const ok = await db().watchlists.removeItem(viewer!.user.id, id, body.symbol);
  return ok ? json({ ok: true }) : apiError(404, "NOT_FOUND", "Item not found.");
});
