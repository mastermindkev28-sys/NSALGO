import "server-only";
import { providers } from "@/providers/registry";
import type { HistoryInterval, HistoryRange, MoverKind } from "@/types/market";
import { load } from "./data";

/** Market data service — cached facade over the configured MarketDataProvider. */

const QUOTE_TTL = 10_000;

/** Quotes in the caller's order (the cache key is order-independent). */
export async function getQuotes(symbols: string[]) {
  const wanted = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const syms = [...wanted].sort();
  const r = await load(`quotes:${syms.join(",")}`, QUOTE_TTL, () => providers().market.getQuotes(syms));
  if (!r.ok) return r;
  const rank = new Map(wanted.map((s, i) => [s, i]));
  return { ...r, data: [...r.data].sort((a, b) => (rank.get(a.symbol) ?? 999) - (rank.get(b.symbol) ?? 999)) };
}

/**
 * Quotes for the live stream. A short TTL shared by every open stream means
 * each distinct symbol set costs one upstream call per interval, however many
 * viewers are connected to this instance.
 */
export async function getStreamQuotes(symbols: string[], ttlMs: number) {
  const syms = [...new Set(symbols.map((s) => s.toUpperCase()))].sort();
  return load(`quotes-live:${syms.join(",")}`, ttlMs, () => providers().market.getQuotes(syms));
}

export async function getQuote(symbol: string) {
  const r = await getQuotes([symbol]);
  if (!r.ok) return r;
  const q = r.data.find((x) => x.symbol === symbol.toUpperCase());
  return q ? { ok: true as const, data: q, meta: r.meta } : { ok: false as const, error: { code: "NOT_FOUND" as const, message: `No quote for ${symbol}` } };
}

export function getHistory(symbol: string, range: HistoryRange, interval: HistoryInterval) {
  const intraday = interval.endsWith("m") || interval === "1h";
  return load(`hist:${symbol.toUpperCase()}:${range}:${interval}`, intraday ? 30_000 : 10 * 60_000, () =>
    providers().market.getHistory(symbol.toUpperCase(), range, interval),
  );
}

export function searchSymbols(q: string, limit = 8) {
  return load(`search:${q.toLowerCase()}:${limit}`, 5 * 60_000, () => providers().market.search(q, limit));
}

export function getSymbolInfo(symbol: string) {
  return load(`sym:${symbol.toUpperCase()}`, 24 * 3600_000, () => providers().market.getSymbol(symbol.toUpperCase()));
}

export function getMarketStatus() {
  return load("status", 30_000, () => providers().market.getMarketStatus());
}

export function getMovers(kind: MoverKind, limit = 10) {
  return load(`movers:${kind}:${limit}`, 30_000, () => providers().market.getMovers(kind, limit));
}

export function getSectors() {
  return load("sectors", 30_000, () => providers().market.getSectors());
}

export function getBreadth() {
  return load("breadth", 60_000, () => providers().market.getBreadth());
}

/** Recent closes for sparklines (1 month of daily bars). Missing symbols are simply omitted. */
export async function getSparks(symbols: string[]): Promise<Record<string, number[]>> {
  const out: Record<string, number[]> = {};
  await Promise.all(
    symbols.map(async (s) => {
      const r = await getHistory(s, "1M", "1d");
      if (r.ok && r.data.length > 1) out[s] = r.data.map((b) => b.close);
    }),
  );
  return out;
}
