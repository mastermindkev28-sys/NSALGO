/**
 * Converts a scored opportunity into concrete, transparent levels and an
 * options structure. Levels are derived from ATR and observed structure —
 * they describe the setup's risk framework, not a forecast.
 */
import type { AtlasConfig, AtlasMode, Direction, OptionLeg, OptionsPlan, TradeType } from "@/types/atlas";
import type { OptionChain, OptionContract } from "@/types/options";
import type { Features } from "./features";

const r2 = (n: number) => Math.round(n * 100) / 100;

export interface Levels {
  entry: { low: number; high: number };
  target: { low: number; high: number };
  invalidation: number;
  riskReward: number | null;
  holdingHorizon: string;
}

export function buildLevels(f: Features, direction: Direction, mode: AtlasMode): Levels {
  const atr = f.atr14 ?? f.price * 0.02;
  const k = mode === "day" ? { entry: 0.12, stop: 0.55, t1: 0.9, t2: 1.4 } : { entry: 0.3, stop: 1.4, t1: 2.4, t2: 3.6 };
  const sign = direction === "long" ? 1 : -1;
  const entryMid = f.price;
  let invalidation = entryMid - sign * k.stop * atr;
  // Respect nearby structure: a long's stop sits below the 20-day low / VWAP when close.
  if (mode === "swing" && f.low20 !== null && direction === "long" && f.low20 < entryMid && entryMid - f.low20 < 2 * k.stop * atr) {
    invalidation = Math.min(invalidation, f.low20 - 0.1 * atr);
  }
  if (mode === "swing" && f.high20 !== null && direction === "short" && f.high20 > entryMid && f.high20 - entryMid < 2 * k.stop * atr) {
    invalidation = Math.max(invalidation, f.high20 + 0.1 * atr);
  }
  if (mode === "day" && f.vwap !== null) {
    if (direction === "long" && f.vwap < entryMid && entryMid - f.vwap < k.stop * atr * 1.5) invalidation = Math.min(invalidation, f.vwap - 0.05 * atr);
    if (direction === "short" && f.vwap > entryMid && f.vwap - entryMid < k.stop * atr * 1.5) invalidation = Math.max(invalidation, f.vwap + 0.05 * atr);
  }
  const entry = { low: r2(entryMid - k.entry * atr), high: r2(entryMid + k.entry * atr) };
  const target = direction === "long" ? { low: r2(entryMid + k.t1 * atr), high: r2(entryMid + k.t2 * atr) } : { low: r2(entryMid - k.t2 * atr), high: r2(entryMid - k.t1 * atr) };
  const targetMid = (target.low + target.high) / 2;
  const risk = Math.abs(entryMid - invalidation);
  return {
    entry,
    target,
    invalidation: r2(invalidation),
    riskReward: risk > 0 ? Math.round((Math.abs(targetMid - entryMid) / risk) * 10) / 10 : null,
    holdingHorizon: mode === "day" ? "Intraday · close by session end" : "5–15 sessions",
  };
}

function spreadPct(c: OptionContract): number | null {
  if (c.bid === null || c.ask === null) return null;
  const mid = (c.bid + c.ask) / 2;
  return mid > 0 ? ((c.ask - c.bid) / mid) * 100 : null;
}

function nearestDelta(contracts: OptionContract[], target: number): OptionContract | null {
  let best: OptionContract | null = null;
  for (const c of contracts) {
    if (c.delta === null) continue;
    if (!best || Math.abs(Math.abs(c.delta) - target) < Math.abs(Math.abs(best.delta!) - target)) best = c;
  }
  return best;
}

function leg(c: OptionContract, action: "buy" | "sell"): OptionLeg {
  return {
    contract: c.contract,
    right: c.right,
    action,
    strike: c.strike,
    expiration: c.expiration,
    dte: c.dte,
    delta: c.delta,
    iv: c.impliedVolatility,
    openInterest: c.openInterest,
    volume: c.volume,
    bid: c.bid,
    ask: c.ask,
  };
}

const mid = (c: OptionContract) => c.mark ?? (c.bid !== null && c.ask !== null ? (c.bid + c.ask) / 2 : c.last);

/** Picks the expiration matching the mode's horizon from those available. */
export function pickExpiration(expirations: string[], mode: AtlasMode, today: string): string | null {
  const dte = (e: string) => Math.round((Date.parse(`${e}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
  const [lo, hi] = mode === "day" ? [1, 9] : [21, 50];
  const inRange = expirations.filter((e) => dte(e) >= lo && dte(e) <= hi);
  if (inRange.length) return inRange[0]!;
  const future = expirations.filter((e) => dte(e) >= lo);
  return future[0] ?? null;
}

export function buildOptionsPlan(
  chain: OptionChain,
  direction: Direction,
  mode: AtlasMode,
  thresholds: AtlasConfig["thresholds"],
): { tradeType: TradeType; plan: OptionsPlan | null; note: string } {
  const side = direction === "long" ? chain.calls : chain.puts;
  const opposite = direction === "long" ? chain.puts : chain.calls;
  const ivRank = chain.ivRank;
  const liquid = (c: OptionContract | null): c is OptionContract =>
    !!c && (c.openInterest ?? 0) >= thresholds.minOptionOpenInterest && (spreadPct(c) ?? 999) <= thresholds.maxOptionSpreadPct;

  const primaryDelta = mode === "day" ? 0.45 : 0.55;
  const buy = nearestDelta(side, primaryDelta);
  if (!liquid(buy)) {
    return { tradeType: "stock", plan: null, note: "Options liquidity below Atlas thresholds — shares-only framework shown." };
  }

  let tradeType: TradeType = direction === "long" ? "long-call" : "long-put";
  const legs: OptionLeg[] = [];
  let debit: number | null = null;
  let credit: number | null = null;
  let maxRisk: number | null = null;
  let maxReward: number | null = null;

  if (ivRank !== null && ivRank >= 65) {
    // Elevated IV: sell premium on the opposite side with a defined-risk wing.
    const short = nearestDelta(opposite, 0.3);
    const wing = short ? nearestDelta(opposite.filter((c) => (direction === "long" ? c.strike < short.strike : c.strike > short.strike)), 0.15) : null;
    if (liquid(short) && wing && mid(short) !== null && mid(wing) !== null) {
      tradeType = direction === "long" ? "put-credit-spread" : "call-credit-spread";
      legs.push(leg(short, "sell"), leg(wing, "buy"));
      credit = Math.max(0, mid(short)! - mid(wing)!) * 100;
      const width = Math.abs(short.strike - wing.strike) * 100;
      maxRisk = width - credit;
      maxReward = credit;
    }
  } else if (ivRank !== null && ivRank >= 35) {
    const sell = nearestDelta(side.filter((c) => (direction === "long" ? c.strike > buy.strike : c.strike < buy.strike)), 0.3);
    if (sell && mid(buy) !== null && mid(sell) !== null) {
      tradeType = direction === "long" ? "call-debit-spread" : "put-debit-spread";
      legs.push(leg(buy, "buy"), leg(sell, "sell"));
      debit = Math.max(0, mid(buy)! - mid(sell)!) * 100;
      maxRisk = debit;
      maxReward = Math.abs(sell.strike - buy.strike) * 100 - debit;
    }
  }
  if (!legs.length) {
    legs.push(leg(buy, "buy"));
    debit = mid(buy) !== null ? mid(buy)! * 100 : null;
    maxRisk = debit;
    maxReward = null;
  }
  const primary = legs[0]!;
  const pc = side.concat(opposite).find((c) => c.contract === primary.contract);
  const sp = pc ? spreadPct(pc) : null;
  return {
    tradeType,
    plan: {
      legs,
      ivRank,
      spreadPct: sp !== null ? Math.round(sp * 10) / 10 : null,
      estimatedDebit: debit !== null ? Math.round(debit) : null,
      estimatedCredit: credit !== null ? Math.round(credit) : null,
      maxRisk: maxRisk !== null ? Math.round(maxRisk) : null,
      maxReward: maxReward !== null ? Math.round(maxReward) : null,
      liquidityNote:
        ivRank === null
          ? "IV rank unavailable from provider — structure chosen on delta and liquidity only."
          : `IV rank ${ivRank} → ${tradeType.replaceAll("-", " ")} structure.`,
    },
    note: "",
  };
}

export function qualitative(f: Features, direction: Direction) {
  const trend: "up" | "down" | "sideways" =
    f.sma20 !== null && f.sma50 !== null ? (f.price > f.sma20 && f.sma20 > f.sma50 ? "up" : f.price < f.sma20 && f.sma20 < f.sma50 ? "down" : "sideways") : "sideways";
  const mom = Math.abs(f.ret20 ?? 0);
  const momentum: "strong" | "moderate" | "weak" = mom > 8 ? "strong" : mom > 3 ? "moderate" : "weak";
  const volumeState: "elevated" | "normal" | "light" = (f.rvol ?? 1) >= 1.4 ? "elevated" : (f.rvol ?? 1) <= 0.7 ? "light" : "normal";
  const volatilityState: "expanding" | "stable" | "contracting" = (f.atrPctile ?? 50) > 70 ? "expanding" : (f.atrPctile ?? 50) < 30 ? "contracting" : "stable";
  void direction;
  return { trend, momentum, volumeState, volatilityState };
}
