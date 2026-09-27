/**
 * Options-flow classification from raw Polygon trade prints.
 *
 * Polygon supplies trades (price, size, exchange, SIP timestamp) and NBBO
 * quotes but no flow labels, so NSALGO derives them here. Every label is a
 * documented heuristic and falls back to `null` ("unknown") when the inputs
 * to decide it are missing:
 *
 *  - execution: legs of the same contract printed within SWEEP_WINDOW_NS are
 *    one order. Legs on 2+ exchanges → "sweep"; 2+ legs on one exchange →
 *    "split"; one print of BLOCK_MIN_CONTRACTS or more → "block"; otherwise
 *    "single".
 *  - side: the order's average price against the NBBO in force just before
 *    its first leg. Within SIDE_TOLERANCE of the spread from the ask → "ask",
 *    from the bid → "bid", otherwise "mid". No usable quote → null.
 *  - sentiment: bought at the ask is bullish for calls and bearish for puts;
 *    sold at the bid is the reverse; mid is neutral; unknown side → null.
 *  - intent: an order larger than the contract's open interest must include
 *    opening contracts → "opening". Anything else can't be determined from
 *    public data → null.
 */
import type { FlowExecution, FlowSentiment, FlowSide, OptionRight } from "@/types/options";

export const SWEEP_WINDOW_NS = 50_000_000; // 50 ms
export const BLOCK_MIN_CONTRACTS = 250;
export const SIDE_TOLERANCE = 0.1;

export interface RawTrade {
  price: number;
  size: number;
  exchange: number | null;
  /** SIP timestamp, nanoseconds since epoch. */
  ts: number;
}

export interface FlowOrder {
  ts: number;
  contracts: number;
  premium: number;
  price: number;
  legs: number;
  exchanges: number;
  execution: Exclude<FlowExecution, null>;
}

/** Groups a contract's trades into orders (sweeps, splits, single prints). */
export function groupOrders(trades: RawTrade[]): FlowOrder[] {
  const sorted = trades.filter((t) => t.size > 0 && t.price > 0).sort((a, b) => a.ts - b.ts);
  const orders: FlowOrder[] = [];
  let legs: RawTrade[] = [];
  const flush = () => {
    if (!legs.length) return;
    let contracts = 0;
    let notional = 0;
    const venues = new Set<number>();
    for (const l of legs) {
      contracts += l.size;
      notional += l.price * l.size;
      if (l.exchange !== null) venues.add(l.exchange);
    }
    const execution: FlowOrder["execution"] =
      legs.length > 1 ? (venues.size > 1 ? "sweep" : "split") : contracts >= BLOCK_MIN_CONTRACTS ? "block" : "single";
    orders.push({
      ts: legs[0]!.ts,
      contracts,
      premium: Math.round(notional * 100),
      price: Math.round((notional / contracts) * 10_000) / 10_000,
      legs: legs.length,
      exchanges: venues.size,
      execution,
    });
    legs = [];
  };
  for (const t of sorted) {
    if (legs.length && t.ts - legs[0]!.ts > SWEEP_WINDOW_NS) flush();
    legs.push(t);
  }
  flush();
  return orders;
}

export function classifySide(price: number, bid: number | null, ask: number | null): FlowSide {
  if (bid === null || ask === null || ask <= 0 || ask < bid) return null;
  const spread = ask - bid;
  const tol = Math.max(spread * SIDE_TOLERANCE, 0.005);
  if (price >= ask - tol) return "ask";
  if (price <= bid + tol) return "bid";
  return "mid";
}

export function classifySentiment(right: OptionRight, side: FlowSide): FlowSentiment {
  if (side === null) return null;
  if (side === "mid") return "neutral";
  const bought = side === "ask";
  return (right === "call") === bought ? "bullish" : "bearish";
}

export function classifyIntent(contracts: number, openInterest: number | null) {
  return openInterest !== null && contracts > openInterest ? ("opening" as const) : null;
}
