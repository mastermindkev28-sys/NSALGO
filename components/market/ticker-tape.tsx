"use client";

import Link from "next/link";
import { Change } from "@/components/ui/change";
import { usePoll } from "@/hooks/use-poll";
import { fmtQuote } from "@/lib/format";
import type { DataResult } from "@/types/data";
import type { Quote } from "@/types/market";

/** Continuous tape of benchmark quotes. Pauses on hover; honours reduced motion. */
export function TickerTape({ initial, symbols }: { initial: DataResult<Quote[]>; symbols: string[] }) {
  const { data } = usePoll<DataResult<Quote[]>>(`/api/market/quote?symbols=${symbols.join(",")}`, 15_000, initial);
  if (!data.ok || !data.data.length) return <div className="h-9 border-b border-line" />;
  const items = [...data.data, ...data.data];
  return (
    <div className="group relative h-9 overflow-hidden border-b border-line bg-void/60 fade-mask-x" aria-label="Market tape">
      <div className="flex h-full w-max animate-tape items-center group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {items.map((q, i) => (
          <Link key={`${q.symbol}-${i}`} href={`/symbols/${q.symbol}`} className="flex h-full items-center gap-2.5 border-r border-line/60 px-5 text-[12px] hover:bg-white/[0.02]" tabIndex={i >= data.data.length ? -1 : 0}>
            <span className="font-mono text-[11px] tracking-wider text-steel-300">{q.symbol}</span>
            <span className="num text-steel-50">{fmtQuote(q.last, q.unit)}</span>
            <Change percent={q.changePercent} size="xs" />
          </Link>
        ))}
      </div>
      {data.meta.mode === "mock" ? (
        <span className="absolute right-0 top-0 flex h-full items-center bg-gradient-to-l from-void via-void to-transparent pl-8 pr-3 font-mono text-[9.5px] uppercase tracking-[0.14em] text-warn">Simulated</span>
      ) : null}
    </div>
  );
}
