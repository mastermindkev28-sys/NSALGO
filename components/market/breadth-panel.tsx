import { fmtInt } from "@/lib/format";
import type { BreadthSnapshot } from "@/types/market";

/** Advance/decline split bar plus participation meters. Unavailable metrics are labelled, never zero-filled. */
export function BreadthPanel({ breadth }: { breadth: BreadthSnapshot }) {
  const a = breadth.advancers ?? 0;
  const d = breadth.decliners ?? 0;
  const u = breadth.unchanged ?? 0;
  const total = a + d + u || 1;
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between text-[12px]">
          <span className="text-up">▲ {fmtInt(breadth.advancers)} advancing</span>
          <span className="text-steel-500">{fmtInt(breadth.unchanged)} unch.</span>
          <span className="text-down">{fmtInt(breadth.decliners)} declining ▼</span>
        </div>
        <div className="flex h-2 gap-[2px] overflow-hidden rounded-full">
          <div className="bg-up" style={{ width: `${(a / total) * 100}%` }} />
          <div className="bg-steel-500" style={{ width: `${(u / total) * 100}%` }} />
          <div className="bg-down" style={{ width: `${(d / total) * 100}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-steel-500">{breadth.universe}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Meter label="Above 50-day average" value={breadth.pctAbove50d} />
        <Meter label="Above 200-day average" value={breadth.pctAbove200d} />
      </div>
      <div className="grid grid-cols-2 gap-4 border-t border-line pt-4">
        <div>
          <div className="text-[11px] text-steel-500">New 52-week highs</div>
          <div className="num mt-1 text-lg text-steel-50">{fmtInt(breadth.newHighs)}</div>
        </div>
        <div>
          <div className="text-[11px] text-steel-500">New 52-week lows</div>
          <div className="num mt-1 text-lg text-steel-50">{fmtInt(breadth.newLows)}</div>
        </div>
      </div>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[12px]">
        <span className="text-steel-400">{label}</span>
        <span className="num text-steel-50">{value === null ? "Data unavailable" : `${value}%`}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-polar-700/30">{value !== null ? <div className="h-full rounded-full bg-polar-500" style={{ width: `${value}%` }} /> : null}</div>
    </div>
  );
}
