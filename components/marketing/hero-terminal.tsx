import { Compass } from "lucide-react";
import { RegimeBadge, regimeStructureLabel } from "@/components/atlas/primitives";
import { LiveQuoteGrid } from "@/components/market/live-quote-grid";
import { DataSourceBadge } from "@/components/ui/data-source";
import { ScoreRing } from "@/components/ui/score-ring";
import type { AtlasSetup, MarketRegime } from "@/types/atlas";
import type { DataResult } from "@/types/data";
import type { MarketStatus, Quote } from "@/types/market";

/** The functional interface behind the hero: live instruments, regime, and the top-ranked setup (levels withheld). */
export function HeroTerminal({
  quotes,
  symbols,
  sparks,
  regime,
  status,
  topSetup,
}: {
  quotes: DataResult<Quote[]>;
  symbols: string[];
  sparks: Record<string, number[]>;
  regime: MarketRegime;
  status: MarketStatus | null;
  topSetup: AtlasSetup | null;
}) {
  return (
    <div className="panel relative overflow-hidden shadow-[var(--shadow-float)]">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-graphite-950/60 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex gap-1.5" aria-hidden>
            <span className="size-2 rounded-full bg-white/10" />
            <span className="size-2 rounded-full bg-white/10" />
            <span className="size-2 rounded-full bg-white/10" />
          </span>
          <span className="font-mono text-[10.5px] tracking-[0.3em] text-steel-300">ATLAS · MARKET INTELLIGENCE</span>
        </div>
        <div className="flex items-center gap-2">
          {status ? (
            <span className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-steel-400 sm:flex">
              <span className={status.state === "open" ? "size-1.5 animate-pulse-soft rounded-full bg-up" : "size-1.5 rounded-full bg-steel-500"} aria-hidden />
              {status.label}
            </span>
          ) : null}
          <DataSourceBadge meta={quotes.ok ? quotes.meta : null} showTime={false} />
        </div>
      </div>
      <div className="grid gap-px bg-line lg:grid-cols-[1fr_260px]">
        <div className="bg-graphite-900 p-3">
          <LiveQuoteGrid initial={quotes} symbols={symbols} sparks={sparks} className="grid-cols-2 sm:grid-cols-3" />
        </div>
        <div className="flex flex-col gap-px bg-line">
          <div className="bg-graphite-900 p-4">
            <div className="eyebrow mb-2">Market regime</div>
            <div className="flex items-center gap-2">
              <RegimeBadge regime={regime} />
              <span className="text-[12px] text-steel-300">{regimeStructureLabel(regime)}</span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {regime.signals.slice(0, 4).map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate text-steel-400">{s.label}</span>
                  <span className={s.reading === "positive" ? "text-up" : s.reading === "negative" ? "text-down" : "text-steel-400"}>
                    {s.reading === "positive" ? "▲" : s.reading === "negative" ? "▼" : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 bg-graphite-900 p-4">
            <div className="eyebrow mb-3 flex items-center gap-1.5">
              <Compass className="size-3" /> Top-ranked setup
            </div>
            {topSetup ? (
              <div className="flex items-center gap-3">
                <ScoreRing value={topSetup.score.value} size={46} />
                <div className="min-w-0">
                  <div className="font-mono text-[14px] tracking-[0.06em] text-chrome">{topSetup.symbol}</div>
                  <div className="text-[11.5px] text-steel-400">
                    {topSetup.direction === "long" ? "Long" : "Short"} · {topSetup.mode === "day" ? "Day trade" : "Swing"}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-steel-500">No setups above threshold right now.</p>
            )}
            <p className="mt-3 text-[10.5px] leading-snug text-steel-500">Analytical ranking, not a prediction.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
