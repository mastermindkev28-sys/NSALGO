"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Change } from "@/components/ui/change";
import { Segmented } from "@/components/ui/controls";
import { DataTable } from "@/components/ui/data-table";
import { LoadingState, UnavailableState } from "@/components/ui/states";
import { fmtCompact, fmtPrice } from "@/lib/format";
import type { DataResult } from "@/types/data";
import type { MoverKind, MoverRow } from "@/types/market";

const KINDS: { value: MoverKind; label: string }[] = [
  { value: "gainers", label: "Top Gainers" },
  { value: "losers", label: "Top Losers" },
  { value: "active", label: "Most Active" },
  { value: "unusual-volume", label: "Unusual Volume" },
];

export function MoversTable({ initial, initialKind = "gainers", limit = 10, linkBase = "/symbols" }: { initial: DataResult<MoverRow[]>; initialKind?: MoverKind; limit?: number; linkBase?: string }) {
  const [kind, setKind] = useState<MoverKind>(initialKind);
  const [fetched, setFetched] = useState<{ kind: MoverKind; data: DataResult<MoverRow[]> } | null>(null);
  const data = kind === initialKind ? initial : fetched?.kind === kind ? fetched.data : null;
  useEffect(() => {
    if (kind === initialKind) return;
    const ctrl = new AbortController();
    fetch(`/api/market/movers?kind=${kind}&limit=${limit}`, { signal: ctrl.signal })
      .then((r) => r.json() as Promise<DataResult<MoverRow[]>>)
      .then((d) => setFetched({ kind, data: d }))
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [kind, initialKind, limit]);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 overflow-x-auto border-b border-line px-4 py-2.5 scrollbar-none">
        <Segmented value={kind} onChange={setKind} options={KINDS} size="xs" />
      </div>
      {!data ? (
        <LoadingState rows={8} />
      ) : !data.ok ? (
        <UnavailableState error={data.error} />
      ) : (
        <DataTable
          rows={data.data}
          rowKey={(r) => r.symbol}
          dense
          columns={[
            {
              key: "sym",
              header: "Symbol",
              cell: (r) => (
                <Link href={`${linkBase}/${r.symbol}`} className="group/s flex flex-col">
                  <span className="font-mono text-[12px] tracking-wider text-chrome group-hover/s:text-polar-300">{r.symbol}</span>
                  <span className="max-w-[160px] truncate text-[11px] text-steel-500">{r.name}</span>
                </Link>
              ),
            },
            { key: "last", header: "Last", align: "right", cell: (r) => <span className="num">{fmtPrice(r.last)}</span>, sortValue: (r) => r.last },
            { key: "chg", header: "Change", align: "right", cell: (r) => <Change value={r.change} showArrow={false} />, hideOnMobile: true, sortValue: (r) => r.change },
            { key: "pct", header: "% Chg", align: "right", cell: (r) => <Change percent={r.changePercent} />, sortValue: (r) => r.changePercent },
            { key: "vol", header: "Volume", align: "right", cell: (r) => <span className="num text-steel-300">{fmtCompact(r.volume)}</span>, sortValue: (r) => r.volume, hideOnMobile: true },
            { key: "rv", header: "Rel. vol", align: "right", cell: (r) => <span className="num text-steel-300">{r.relativeVolume === null ? "—" : `${r.relativeVolume.toFixed(2)}×`}</span>, sortValue: (r) => r.relativeVolume },
            {
              key: "st",
              header: "Session",
              cell: (r) => <span className="font-mono text-[10px] uppercase tracking-wider text-steel-500">{r.marketState}</span>,
              hideOnMobile: true,
            },
          ]}
        />
      )}
    </div>
  );
}
