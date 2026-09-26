import { AlertTriangle, CircleSlash, Inbox, Loader2, PlugZap } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import type { DataError } from "@/types/data";

export function EmptyState({ title, description, action, icon, className }: { title: string; description?: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-12 text-center", className)}>
      <div className="mb-1 flex size-9 items-center justify-center rounded-md border border-line bg-graphite-850 text-steel-400">{icon ?? <Inbox className="size-4" />}</div>
      <p className="text-sm font-medium text-steel-100">{title}</p>
      {description ? <p className="max-w-sm text-[13px] leading-relaxed text-steel-400">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, action, className }: { title?: string; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-10 text-center", className)} role="alert">
      <div className="mb-1 flex size-9 items-center justify-center rounded-md border border-down/25 bg-down-soft text-down">
        <AlertTriangle className="size-4" />
      </div>
      <p className="text-sm font-medium text-steel-100">{title}</p>
      {description ? <p className="max-w-sm text-[13px] leading-relaxed text-steel-400">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

const ERROR_COPY: Record<string, { title: string; icon: React.ReactNode }> = {
  PROVIDER_NOT_CONFIGURED: { title: "Data source not configured", icon: <PlugZap className="size-4" /> },
  PROVIDER_UNAVAILABLE: { title: "Data temporarily unavailable", icon: <AlertTriangle className="size-4" /> },
  UNSUPPORTED: { title: "Not available from the current provider", icon: <CircleSlash className="size-4" /> },
  NOT_FOUND: { title: "No data found", icon: <Inbox className="size-4" /> },
  RATE_LIMITED: { title: "Provider rate limit reached", icon: <AlertTriangle className="size-4" /> },
};

/** Graceful degradation for a single module whose provider failed — the rest of the page keeps working. */
export function UnavailableState({ error, label, className, compact }: { error: DataError; label?: string; className?: string; compact?: boolean }) {
  const copy = ERROR_COPY[error.code] ?? { title: "Data unavailable", icon: <AlertTriangle className="size-4" /> };
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 px-4 py-3 text-[12.5px] text-steel-400", className)}>
        <span className="text-warn">{copy.icon}</span>
        <span>
          {label ? `${label}: ` : ""}
          {error.message}
        </span>
      </div>
    );
  }
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-10 text-center", className)}>
      <div className="mb-1 flex size-9 items-center justify-center rounded-md border border-warn/25 bg-warn-soft text-warn">{copy.icon}</div>
      <p className="text-sm font-medium text-steel-100">{label ? `${label} — ${copy.title.toLowerCase()}` : copy.title}</p>
      <p className="max-w-md text-[13px] leading-relaxed text-steel-400">{error.message}</p>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin text-steel-400", className)} aria-label="Loading" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-sm bg-white/[0.045]", className)} />;
}

export function LoadingState({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2.5 p-4", className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-5" />
      ))}
    </div>
  );
}
