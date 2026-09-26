import "server-only";
import { UNIVERSE } from "@/config/universe";
import { cached } from "@/lib/cache";
import { fail, ok, type DataResult } from "@/types/data";
import type { OptionsScanFilter, OptionsScanRow } from "@/types/options";
import { getExpirations, getOptionChain } from "./intel";
import { getQuotes } from "./market";

/**
 * Options scanner: pulls near-dated chains for optionable symbols and ranks
 * contracts by the selected preset. Computed fields (vol/OI, spread %,
 * premium traded) are derived only from provider-supplied values.
 */
const OPTIONABLE = UNIVERSE.filter((u) => u.optionable).map((u) => u.symbol);

async function universeRows(symbols: string[]): Promise<DataResult<OptionsScanRow[]>> {
  const quotes = await getQuotes(symbols);
  const trend = new Map(quotes.ok ? quotes.data.map((q) => [q.symbol, q.changePercent === null ? null : q.changePercent > 0.3 ? "up" : q.changePercent < -0.3 ? "down" : "flat"]) : []);
  const rows: OptionsScanRow[] = [];
  let lastErr: DataResult<never> | null = null;
  let meta: Extract<DataResult<unknown>, { ok: true }>["meta"] | null = null;
  await Promise.all(
    symbols.map(async (sym) => {
      const exps = await getExpirations(sym);
      if (!exps.ok) {
        lastErr = exps as DataResult<never>;
        return;
      }
      for (const exp of exps.data.slice(0, 2)) {
        const chain = await getOptionChain(sym, exp);
        if (!chain.ok) {
          lastErr = chain as DataResult<never>;
          continue;
        }
        meta ??= chain.meta;
        for (const c of [...chain.data.calls, ...chain.data.puts]) {
          const mid = c.mark ?? (c.bid !== null && c.ask !== null ? (c.bid + c.ask) / 2 : null);
          rows.push({
            ...c,
            volOi: c.volume !== null && c.openInterest ? Math.round((c.volume / c.openInterest) * 100) / 100 : null,
            spreadPct: c.bid !== null && c.ask !== null && mid ? Math.round(((c.ask - c.bid) / mid) * 1000) / 10 : null,
            premiumTraded: c.volume !== null && mid !== null ? Math.round(c.volume * mid * 100) : null,
            underlyingPrice: chain.data.underlyingPrice,
            underlyingTrend: (trend.get(sym) ?? null) as OptionsScanRow["underlyingTrend"],
          });
        }
      }
    }),
  );
  if (!rows.length && lastErr) return lastErr;
  if (!meta) return fail("PROVIDER_UNAVAILABLE", "No option chains available.");
  return ok(rows, meta);
}

export async function scanOptions(f: OptionsScanFilter, limit = 150): Promise<DataResult<OptionsScanRow[]>> {
  const symbols = f.symbols?.length ? f.symbols.filter((s) => OPTIONABLE.includes(s)) : OPTIONABLE;
  const base = await cached(`optscan:${symbols.join(",")}`, 60_000, () => universeRows(symbols), (r) => !r.ok);
  const r = base.value;
  if (!r.ok) return r;
  let rows = r.data.filter((c) => {
    if (f.right && c.right !== f.right) return false;
    if (f.minDte !== undefined && c.dte < f.minDte) return false;
    if (f.maxDte !== undefined && c.dte > f.maxDte) return false;
    const d = c.delta === null ? null : Math.abs(c.delta);
    if (f.minDelta !== undefined && (d === null || d < f.minDelta)) return false;
    if (f.maxDelta !== undefined && (d === null || d > f.maxDelta)) return false;
    if (f.minIv !== undefined && (c.impliedVolatility === null || c.impliedVolatility < f.minIv)) return false;
    if (f.maxIv !== undefined && (c.impliedVolatility === null || c.impliedVolatility > f.maxIv)) return false;
    if (f.minVolume !== undefined && (c.volume ?? 0) < f.minVolume) return false;
    if (f.minOpenInterest !== undefined && (c.openInterest ?? 0) < f.minOpenInterest) return false;
    if (f.minVolOi !== undefined && (c.volOi ?? 0) < f.minVolOi) return false;
    if (f.maxSpreadPct !== undefined && (c.spreadPct === null || c.spreadPct > f.maxSpreadPct)) return false;
    if (f.minPremium !== undefined && (c.premiumTraded ?? 0) < f.minPremium) return false;
    return true;
  });
  const by = (fn: (c: OptionsScanRow) => number | null) => (a: OptionsScanRow, b: OptionsScanRow) => (fn(b) ?? -Infinity) - (fn(a) ?? -Infinity);
  switch (f.preset) {
    case "unusual":
      rows = rows.filter((c) => (c.volOi ?? 0) >= 1 && (c.volume ?? 0) >= 500).sort(by((c) => c.volOi));
      break;
    case "high-vol-oi":
      rows = rows.sort(by((c) => c.volOi));
      break;
    case "large-premium":
      rows = rows.sort(by((c) => c.premiumTraded));
      break;
    case "high-iv":
      rows = rows.filter((c) => (c.volume ?? 0) > 100).sort(by((c) => c.impliedVolatility));
      break;
    case "low-iv":
      rows = rows.filter((c) => (c.volume ?? 0) > 100 && c.impliedVolatility !== null).sort((a, b) => (a.impliedVolatility ?? 9) - (b.impliedVolatility ?? 9));
      break;
    case "directional":
      rows = rows.filter((c) => c.underlyingTrend && c.underlyingTrend !== "flat" && ((c.right === "call") === (c.underlyingTrend === "up")) && (c.volume ?? 0) > 200).sort(by((c) => c.premiumTraded));
      break;
    default:
      rows = rows.sort(by((c) => c.volume));
  }
  return ok(rows.slice(0, limit), r.meta);
}
