import { cn } from "@/lib/utils";
import { fmtTimeET } from "@/lib/format";
import type { DataMeta } from "@/types/data";

/**
 * Provenance chip. Every data module shows where its numbers came from and
 * whether they are live, delayed, end-of-day or simulated.
 */
export function DataSourceBadge({ meta, className, showTime = true }: { meta?: Partial<DataMeta> | null; className?: string; showTime?: boolean }) {
  if (!meta?.mode) return null;
  const mock = meta.mode === "mock";
  const label = mock
    ? "Simulated data"
    : meta.mode === "delayed"
      ? `Delayed ${meta.delayMinutes ?? 15}m`
      : meta.mode === "eod"
        ? "End of day"
        : "Live";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xs border px-1.5 py-[3px] font-mono text-[9.5px] uppercase leading-none tracking-[0.1em]",
        mock ? "border-dashed border-warn/40 bg-warn-soft text-warn" : meta.stale ? "border-warn/30 text-warn" : "border-line text-steel-400",
        className,
      )}
      title={[meta.sourceLabel, meta.notice, meta.asOf ? `As of ${meta.asOf}` : null].filter(Boolean).join(" · ")}
    >
      <span className={cn("size-1.5 rounded-full", mock ? "bg-warn" : meta.mode === "live" ? "bg-up animate-pulse-soft" : "bg-steel-400")} aria-hidden />
      {label}
      {!mock && meta.sourceLabel ? <span className="normal-case tracking-normal text-steel-500">· {meta.sourceLabel}</span> : null}
      {showTime && meta.asOf && !mock ? <span className="normal-case tracking-normal text-steel-500">· {fmtTimeET(meta.asOf)}</span> : null}
      {meta.stale ? <span className="normal-case tracking-normal">· stale</span> : null}
    </span>
  );
}

export function StaleNotice({ meta }: { meta?: Partial<DataMeta> | null }) {
  if (!meta?.stale) return null;
  return <div className="border-b border-warn/20 bg-warn-soft px-4 py-2 text-xs text-warn">{meta.notice ?? "Showing the latest available data."}</div>;
}
