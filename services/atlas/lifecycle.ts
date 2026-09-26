/**
 * Setup lifecycle: generated → active → triggered → (target-reached | invalidated | expired).
 * Evaluated from price bars that occurred after generation. Outcomes are
 * recorded as they happen and are never rewritten or hidden.
 */
import type { AtlasSetup, SetupStatus } from "@/types/atlas";
import type { Bar } from "@/types/market";

export const TERMINAL: SetupStatus[] = ["invalidated", "target-reached", "expired"];

export function evaluateLifecycle(
  setup: Pick<AtlasSetup, "direction" | "entry" | "target" | "invalidation" | "status" | "statusHistory" | "generatedAt" | "expiresAt">,
  barsSince: Bar[],
  now: Date = new Date(),
): { status: SetupStatus; statusHistory: AtlasSetup["statusHistory"] } {
  let status = setup.status;
  const history = [...setup.statusHistory];
  if (TERMINAL.includes(status)) return { status, statusHistory: history };
  const long = setup.direction === "long";
  const genTs = Date.parse(setup.generatedAt) / 1000;

  const push = (s: SetupStatus, at: number, price: number | null) => {
    if (history.some((h) => h.status === s)) return;
    history.push({ status: s, at: new Date(at * 1000).toISOString(), price });
    status = s;
  };

  if (status === "generated") push("active", genTs, null);

  for (const b of barsSince) {
    if (b.time < genTs) continue;
    if (status === "active") {
      const touched = b.low <= setup.entry.high && b.high >= setup.entry.low;
      const brokeFirst = long ? b.low <= setup.invalidation : b.high >= setup.invalidation;
      if (brokeFirst) {
        push("invalidated", b.time, setup.invalidation);
        break;
      }
      if (touched) push("triggered", b.time, Math.round(((setup.entry.low + setup.entry.high) / 2) * 100) / 100);
    }
    if (status === "triggered") {
      const stop = long ? b.low <= setup.invalidation : b.high >= setup.invalidation;
      const hit = long ? b.high >= setup.target.low : b.low <= setup.target.high;
      // If both occur within one bar the conservative outcome (invalidation) is recorded.
      if (stop) {
        push("invalidated", b.time, setup.invalidation);
        break;
      }
      if (hit) {
        push("target-reached", b.time, long ? setup.target.low : setup.target.high);
        break;
      }
    }
  }

  if (!TERMINAL.includes(status) && now.getTime() >= Date.parse(setup.expiresAt)) {
    const lastClose = barsSince[barsSince.length - 1]?.close ?? null;
    push("expired", Math.floor(Date.parse(setup.expiresAt) / 1000), lastClose);
  }
  return { status, statusHistory: history };
}

/** Realised move (percent, direction-adjusted) for a closed setup, measured from entry midpoint. */
export function outcomeReturn(setup: Pick<AtlasSetup, "direction" | "entry" | "statusHistory" | "status">): number | null {
  const entryMid = (setup.entry.low + setup.entry.high) / 2;
  const triggered = setup.statusHistory.some((h) => h.status === "triggered");
  const exit = setup.statusHistory.find((h) => TERMINAL.includes(h.status));
  if (!triggered || !exit || exit.price === null) return null;
  const raw = ((exit.price - entryMid) / entryMid) * 100;
  return Math.round((setup.direction === "long" ? raw : -raw) * 100) / 100;
}
