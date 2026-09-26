import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { cn } from "@/lib/utils";
import type { MarketRegime } from "@/types/atlas";
import { RegimeBadge, regimeStructureLabel } from "./primitives";

/** Market regime with its reasoning — every signal and its reading, including unavailable inputs. */
export function RegimePanel({ regime, className, compact }: { regime: MarketRegime; className?: string; compact?: boolean }) {
  return (
    <Panel className={className}>
      <PanelHeader
        eyebrow="Market regime"
        title={
          <span className="flex items-center gap-2">
            <RegimeBadge regime={regime} />
            <span className="text-steel-300">
              {regime.score === null ? regimeStructureLabel(regime) : `${regimeStructureLabel(regime)} · ${regime.volatility.replace("-volatility", "")} volatility`}
            </span>
          </span>
        }
        actions={
          <span className="num text-[11px] text-steel-500" title="Composite regime reading, −100 to +100">
            {regime.score === null ? "—" : `${regime.score > 0 ? "+" : ""}${regime.score}`}
          </span>
        }
      />
      <PanelBody className="space-y-3">
        {!compact ? <p className="text-[12.5px] leading-relaxed text-steel-300">{regime.summary}</p> : null}
        <ul className="divide-y divide-line/70">
          {regime.signals.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-3 py-2 text-[12px]">
              <span className="flex items-center gap-2 text-steel-300">
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full [&_svg]:size-2.5",
                    s.reading === "positive" ? "bg-up-soft text-up" : s.reading === "negative" ? "bg-down-soft text-down" : "bg-white/[0.05] text-steel-400",
                  )}
                  aria-label={s.reading}
                >
                  {s.reading === "positive" ? <TrendingUp /> : s.reading === "negative" ? <TrendingDown /> : <Minus />}
                </span>
                {s.label}
              </span>
              <span className={cn("num text-right text-[11.5px]", s.reading === "unavailable" ? "text-steel-500" : "text-steel-100")}>{s.value}</span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-steel-500">
          Coverage {Math.round(regime.coverage * 100)}% of regime inputs · classification is descriptive, not predictive.
        </p>
      </PanelBody>
    </Panel>
  );
}
