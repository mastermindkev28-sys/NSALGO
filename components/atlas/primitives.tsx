import { ArrowDownRight, ArrowUpRight, Circle, CircleCheck, CircleDashed, CircleX, Clock3, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AtlasSetup, FactorResult, MarketRegime, SetupStatus, TradeType } from "@/types/atlas";

export function DirectionBadge({ direction, className }: { direction: "long" | "short"; className?: string }) {
  return (
    <Badge variant={direction === "long" ? "up" : "down"} size="sm" className={className}>
      {direction === "long" ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
      {direction === "long" ? "Long" : "Short"}
    </Badge>
  );
}

export const TRADE_TYPE_LABEL: Record<TradeType, string> = {
  stock: "Shares",
  "long-call": "Long call",
  "long-put": "Long put",
  "call-debit-spread": "Call debit spread",
  "put-debit-spread": "Put debit spread",
  "put-credit-spread": "Put credit spread",
  "call-credit-spread": "Call credit spread",
};

const STATUS: Record<SetupStatus, { label: string; icon: React.ReactNode; cls: string }> = {
  generated: { label: "Generated", icon: <Circle />, cls: "text-steel-300" },
  active: { label: "Active", icon: <CircleDashed />, cls: "text-polar-300" },
  triggered: { label: "Triggered", icon: <Clock3 />, cls: "text-warn" },
  invalidated: { label: "Invalidated", icon: <CircleX />, cls: "text-down" },
  "target-reached": { label: "Target reached", icon: <Target />, cls: "text-up" },
  expired: { label: "Expired", icon: <CircleCheck />, cls: "text-steel-400" },
};

export function StatusPill({ status, className }: { status: SetupStatus; className?: string }) {
  const s = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11.5px] [&_svg]:size-3", s.cls, className)}>
      {s.icon}
      {s.label}
    </span>
  );
}

/** Horizontal factor bars — one hue (magnitude), unavailable factors hatched rather than zero. */
export function FactorBars({ components, limit, className, showWeights }: { components: FactorResult[]; limit?: number; className?: string; showWeights?: boolean }) {
  const list = (limit ? components.filter((c) => c.weight > 0 || c.score === null).slice(0, limit) : components).sort((a, b) => b.weight - a.weight);
  return (
    <div className={cn("space-y-1.5", className)}>
      {list.map((c) => (
        <div key={c.key} className={cn("grid items-center gap-2.5 text-[11.5px]", showWeights ? "grid-cols-[150px_1fr_34px]" : "grid-cols-[112px_1fr_34px]")} title={c.evidence.join(" ")}>
          <span className="truncate text-steel-400">
            {c.label}
            {showWeights && c.weight > 0 ? <span className="ml-1 text-steel-500">{Math.round(c.weight * 100)}%</span> : null}
          </span>
          <div className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
            {c.score === null ? (
              <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,#ffffff10_0_3px,transparent_3px_6px)]" aria-label="Data unavailable" />
            ) : (
              <div
                className={cn("h-full rounded-full", c.score >= 60 ? "bg-polar-400" : c.score <= 40 ? "bg-steel-500" : "bg-polar-600")}
                style={{ width: `${Math.max(3, c.score)}%` }}
              />
            )}
          </div>
          <span className={cn("num text-right", c.score === null ? "text-steel-500" : "text-steel-100")}>{c.score === null ? "n/a" : c.score}</span>
        </div>
      ))}
    </div>
  );
}

export function RegimeBadge({ regime }: { regime: Pick<MarketRegime, "risk"> }) {
  const label = regime.risk === "risk-on" ? "Risk-On" : regime.risk === "risk-off" ? "Risk-Off" : "Mixed";
  return (
    <Badge variant={regime.risk === "risk-on" ? "up" : regime.risk === "risk-off" ? "down" : "warn"} size="sm">
      {label}
    </Badge>
  );
}

export function LevelsRow({ setup, className }: { setup: Pick<AtlasSetup, "entry" | "target" | "invalidation" | "riskReward" | "direction">; className?: string }) {
  const f = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div className={cn("grid grid-cols-4 gap-2 text-[11px]", className)}>
      <div>
        <div className="text-steel-500">Entry zone</div>
        <div className="num mt-0.5 text-steel-50">
          {f(setup.entry.low)}–{f(setup.entry.high)}
        </div>
      </div>
      <div>
        <div className="text-steel-500">Target zone</div>
        <div className="num mt-0.5 text-up">
          {f(setup.target.low)}–{f(setup.target.high)}
        </div>
      </div>
      <div>
        <div className="text-steel-500">Invalidation</div>
        <div className="num mt-0.5 text-down">{f(setup.invalidation)}</div>
      </div>
      <div>
        <div className="text-steel-500">Reward / risk</div>
        <div className="num mt-0.5 text-steel-50">{setup.riskReward !== null ? `${setup.riskReward}:1` : "—"}</div>
      </div>
    </div>
  );
}
