"use client";

import Link from "next/link";
import { Change } from "@/components/ui/change";
import { Sparkline } from "@/components/ui/sparkline";
import { useTickFlash } from "@/hooks/use-poll";
import { fmtCompact, fmtQuote } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Quote } from "@/types/market";

/** MarketCard / TickerCard: symbol, last, change, optional sparkline + volume. */
export function QuoteCard({ quote, label, spark, href, className, showVolume }: { quote: Quote; label?: string; spark?: number[]; href?: string; className?: string; showVolume?: boolean }) {
  const flash = useTickFlash(quote.last);
  const body = (
    <div className={cn("panel group flex h-full flex-col justify-between gap-3 p-3.5 transition-colors hover:border-line-strong", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-[11px] tracking-[0.12em] text-steel-300">{label ?? quote.symbol}</div>
          {label || !spark ? <div className="mt-0.5 truncate text-[11px] text-steel-500">{label ? quote.symbol : quote.name}</div> : null}
        </div>
        {spark && spark.length > 1 ? <Sparkline values={spark} width={64} height={22} baseline={quote.prevClose ?? undefined} area={false} /> : null}
      </div>
      <div>
        <div className={cn("num text-[17px] font-medium tracking-[-0.02em] text-chrome transition-colors duration-700", flash === "up" && "text-up", flash === "down" && "text-down")}>{fmtQuote(quote.last, quote.unit)}</div>
        <div className="mt-1 flex items-center justify-between gap-2">
          {quote.unit === "pct" ? (
            <Change value={quote.change === null ? null : quote.change * 100} decimals={1} size="xs" className="after:content-['_bp']" />
          ) : (
            <Change value={quote.change} percent={quote.changePercent} size="xs" />
          )}
          {showVolume && quote.volume ? <span className="num text-[10.5px] text-steel-500">Vol {fmtCompact(quote.volume)}</span> : null}
        </div>
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full focus-visible:outline-offset-4">
      {body}
    </Link>
  ) : (
    body
  );
}
