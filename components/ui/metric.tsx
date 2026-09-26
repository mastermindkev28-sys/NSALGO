import * as React from "react";
import { cn } from "@/lib/utils";

/** Stat tile: label · value · optional delta and context. */
export function MetricCard({
  label,
  value,
  delta,
  hint,
  className,
  trend,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  delta?: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
  trend?: React.ReactNode;
}) {
  return (
    <div className={cn("panel flex flex-col justify-between gap-3 p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] text-steel-400">{label}</span>
        {trend}
      </div>
      <div>
        <div className="num text-[22px] font-medium leading-none tracking-[-0.02em] text-chrome">{value}</div>
        {delta || hint ? (
          <div className="mt-2 flex items-center gap-2 text-[12px] text-steel-400">
            {delta}
            {hint ? <span>{hint}</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Stat({ label, value, className }: { label: React.ReactNode; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-[11px] text-steel-500">{label}</div>
      <div className="num mt-0.5 truncate text-[13px] text-steel-50">{value}</div>
    </div>
  );
}
