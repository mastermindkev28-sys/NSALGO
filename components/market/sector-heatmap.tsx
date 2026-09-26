import Link from "next/link";
import { fmtPct } from "@/lib/format";
import type { SectorPerformance } from "@/types/market";

/**
 * Sector heatmap. Diverging encoding (down ↔ neutral grey ↔ up) with the
 * signed value printed on every tile, so colour is never the only channel.
 */
function tone(cp: number | null): string {
  if (cp === null) return "#16191e";
  const t = Math.max(-1, Math.min(1, cp / 2.5));
  const a = Math.round(Math.abs(t) * 0.55 * 255)
    .toString(16)
    .padStart(2, "0");
  return t >= 0 ? `#31a57f${a}` : `#e5484d${a}`;
}

export function SectorHeatmap({ sectors }: { sectors: SectorPerformance[] }) {
  const sorted = [...sectors].sort((a, b) => (b.changePercent ?? -99) - (a.changePercent ?? -99));
  return (
    <div className="grid grid-cols-2 gap-[2px] overflow-hidden rounded-md sm:grid-cols-3 lg:grid-cols-4">
      {sorted.map((s) => (
        <Link
          key={s.etf}
          href={`/symbols/${s.etf}`}
          className="group relative flex min-h-[84px] flex-col justify-between bg-graphite-850 p-3 transition-[filter] hover:brightness-125"
          style={{ backgroundImage: `linear-gradient(${tone(s.changePercent)}, ${tone(s.changePercent)})` }}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-[12.5px] font-medium text-steel-50">{s.sector}</span>
            <span className="font-mono text-[10px] text-steel-300">{s.etf}</span>
          </div>
          <div className="flex items-end justify-between">
            <span className="num text-[16px] text-chrome">{fmtPct(s.changePercent)}</span>
            <span className="num text-[10.5px] text-steel-300" title="Relative to S&P 500">
              RS {s.relativeStrength === null ? "—" : `${s.relativeStrength >= 0 ? "+" : "−"}${Math.abs(s.relativeStrength).toFixed(2)}`}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
