import { Lock } from "lucide-react";
import Link from "next/link";
import { ScoreRing } from "@/components/ui/score-ring";
import { fmtPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AtlasSetup } from "@/types/atlas";
import { DirectionBadge, FactorBars, LevelsRow, StatusPill, TRADE_TYPE_LABEL } from "./primitives";

/** AtlasSetupCard — compact ranked opportunity. `locked` hides levels for visitors. */
export function AtlasSetupCard({ setup, rank, locked = false, href, className }: { setup: AtlasSetup; rank?: number; locked?: boolean; href?: string; className?: string }) {
  const body = (
    <article className={cn("panel group flex h-full flex-col gap-4 p-4 transition-colors hover:border-line-strong", className)}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {rank ? <span className="num text-[11px] text-steel-500">#{rank}</span> : null}
            <h3 className="font-mono text-[15px] font-medium tracking-[0.06em] text-chrome">{setup.symbol}</h3>
            <DirectionBadge direction={setup.direction} />
          </div>
          <p className="mt-1 truncate text-[12px] text-steel-400">
            {setup.name} · <span className="num text-steel-300">{fmtPrice(setup.price)}</span>
          </p>
          <p className="mt-1 text-[11.5px] text-steel-500">
            {setup.mode === "day" ? "Day trade" : "Swing"} · {TRADE_TYPE_LABEL[setup.tradeType]} · <StatusPill status={setup.status} />
          </p>
        </div>
        <ScoreRing value={setup.score.value} size={50} coverage={setup.score.coverage} />
      </header>
      <FactorBars components={setup.score.components} limit={5} />
      <div className="mt-auto border-t border-line pt-3">
        {locked ? (
          <div className="flex items-center gap-2 text-[12px] text-steel-400">
            <Lock className="size-3.5" /> Levels, options structure and AI explanation for members.
          </div>
        ) : (
          <LevelsRow setup={setup} />
        )}
      </div>
    </article>
  );
  return href ? (
    <Link href={href} className="block h-full" aria-label={`${setup.symbol} ${setup.direction} setup, score ${setup.score.value}`}>
      {body}
    </Link>
  ) : (
    body
  );
}
