"use client";

import Link from "next/link";
import { Change } from "@/components/ui/change";
import { Sparkline } from "@/components/ui/sparkline";
import { usePoll } from "@/hooks/use-poll";
import { fmtPrice } from "@/lib/format";
import type { DataResult } from "@/types/data";
import type { Quote } from "@/types/market";

export function WatchlistSnapshot({ symbols, initial, sparks }: { symbols: string[]; initial: DataResult<Quote[]>; sparks: Record<string, number[]> }) {
  const { data } = usePoll<DataResult<Quote[]>>(symbols.length ? `/api/market/quote?symbols=${symbols.join(",")}` : null, 20_000, initial);
  if (!symbols.length) return <p className="px-4 py-6 text-[12.5px] text-steel-500">Add symbols to a watchlist to see them here.</p>;
  if (!data.ok) return <p className="px-4 py-6 text-[12.5px] text-steel-500">Quotes unavailable.</p>;
  return (
    <ul className="divide-y divide-line/70">
      {data.data.map((q) => (
        <li key={q.symbol}>
          <Link href={`/dashboard/symbol/${q.symbol}`} className="grid grid-cols-[56px_1fr_72px_78px] items-center gap-2 px-4 py-2 text-[12.5px] hover:bg-white/[0.02]">
            <span className="font-mono tracking-wider text-chrome">{q.symbol}</span>
            <Sparkline values={sparks[q.symbol] ?? []} width={80} height={20} area={false} baseline={q.prevClose ?? undefined} />
            <span className="num text-right text-steel-100">{fmtPrice(q.last)}</span>
            <Change percent={q.changePercent} size="xs" className="justify-end" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
