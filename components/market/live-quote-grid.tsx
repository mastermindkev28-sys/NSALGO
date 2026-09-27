"use client";

import { useLiveQuotes } from "@/hooks/use-live-quotes";
import { cn } from "@/lib/utils";
import type { DataResult } from "@/types/data";
import type { Quote } from "@/types/market";
import { UnavailableState } from "@/components/ui/states";
import { QuoteCard } from "./quote-card";

/** Polling grid of quote cards (Market Pulse, hero instruments, market groups). */
export function LiveQuoteGrid({
  initial,
  symbols,
  labels,
  sparks,
  className,
  interval = 15_000,
  showVolume,
}: {
  initial: DataResult<Quote[]>;
  symbols: string[];
  labels?: Record<string, string>;
  sparks?: Record<string, number[]>;
  className?: string;
  interval?: number;
  showVolume?: boolean;
}) {
  const { data } = useLiveQuotes(symbols, initial, interval);
  if (!data.ok) return <UnavailableState error={data.error} label="Quotes" className="panel" />;
  const bySym = new Map(data.data.map((q) => [q.symbol, q]));
  return (
    <div className={cn("grid gap-2", className)}>
      {symbols.map((s) => {
        const q = bySym.get(s);
        if (!q) {
          return (
            <div key={s} className="panel flex flex-col justify-between p-3.5">
              <div className="font-mono text-[11px] tracking-[0.12em] text-steel-300">{labels?.[s] ?? s}</div>
              <div className="mt-3 text-[12px] text-steel-500">Data unavailable</div>
            </div>
          );
        }
        return <QuoteCard key={s} quote={q} label={labels?.[s]} spark={sparks?.[s]} href={`/symbols/${s}`} showVolume={showVolume} />;
      })}
    </div>
  );
}
