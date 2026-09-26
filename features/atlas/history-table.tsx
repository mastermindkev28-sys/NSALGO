"use client";

import { useMemo, useState } from "react";
import { DirectionBadge, StatusPill } from "@/components/atlas/primitives";
import { Badge } from "@/components/ui/badge";
import { Drawer, Segmented } from "@/components/ui/controls";
import { DataTable } from "@/components/ui/data-table";
import { fmtDate, fmtPct, fmtPrice } from "@/lib/format";
import type { AtlasSetup } from "@/types/atlas";
import { SetupDetail } from "./setup-detail";

export function HistoryTable({ rows }: { rows: { setup: AtlasSetup; returnPct: number | null }[] }) {
  const [mode, setMode] = useState<"all" | "day" | "swing">("all");
  const [state, setState] = useState<"all" | "open" | "closed">("all");
  const [open, setOpen] = useState<AtlasSetup | null>(null);
  const view = useMemo(
    () =>
      rows.filter(
        (r) =>
          (mode === "all" || r.setup.mode === mode) &&
          (state === "all" || (state === "closed" ? ["invalidated", "target-reached", "expired"].includes(r.setup.status) : !["invalidated", "target-reached", "expired"].includes(r.setup.status))),
      ),
    [rows, mode, state],
  );
  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <Segmented value={mode} onChange={setMode} size="xs" options={[{ value: "all", label: "All modes" }, { value: "day", label: "Day" }, { value: "swing", label: "Swing" }]} />
        <Segmented value={state} onChange={setState} size="xs" options={[{ value: "all", label: "All outcomes" }, { value: "open", label: "Open" }, { value: "closed", label: "Closed" }]} />
        <span className="ml-auto text-[11.5px] text-steel-500">{view.length} setups · nothing is hidden or removed</span>
      </div>
      <DataTable
        rows={view}
        rowKey={(r) => r.setup.id}
        onRowClick={(r) => setOpen(r.setup)}
        maxHeight={640}
        initialSort={{ key: "date", dir: "desc" }}
        columns={[
          { key: "date", header: "Date", cell: (r) => <span className="num text-steel-400">{fmtDate(r.setup.generatedAt, true)}</span>, sortValue: (r) => r.setup.generatedAt },
          { key: "sym", header: "Ticker", cell: (r) => <span className="font-mono tracking-wider text-chrome">{r.setup.symbol}</span>, sortValue: (r) => r.setup.symbol },
          { key: "mode", header: "Mode", cell: (r) => <span className="text-steel-300">{r.setup.mode === "day" ? "Day" : "Swing"}</span>, hideOnMobile: true },
          { key: "dir", header: "Direction", cell: (r) => <DirectionBadge direction={r.setup.direction} /> },
          { key: "score", header: "Score", align: "right", cell: (r) => <span className="num">{r.setup.score.value}</span>, sortValue: (r) => r.setup.score.value },
          { key: "entry", header: "Entry", align: "right", cell: (r) => <span className="num">{fmtPrice((r.setup.entry.low + r.setup.entry.high) / 2)}</span>, hideOnMobile: true },
          { key: "target", header: "Target", align: "right", cell: (r) => <span className="num text-steel-300">{fmtPrice(r.setup.direction === "long" ? r.setup.target.low : r.setup.target.high)}</span>, hideOnMobile: true },
          { key: "inv", header: "Invalidation", align: "right", cell: (r) => <span className="num text-steel-300">{fmtPrice(r.setup.invalidation)}</span>, hideOnMobile: true },
          { key: "out", header: "Outcome", cell: (r) => <StatusPill status={r.setup.status} />, sortValue: (r) => r.setup.status },
          { key: "ret", header: "Result", align: "right", cell: (r) => <span className={r.returnPct === null ? "text-steel-500" : r.returnPct >= 0 ? "num text-up" : "num text-down"}>{r.returnPct === null ? "—" : fmtPct(r.returnPct)}</span>, sortValue: (r) => r.returnPct },
          { key: "src", header: "Data", cell: (r) => (r.setup.dataMode === "mock" ? <Badge variant="mock" size="sm">Simulated</Badge> : <span className="text-[11px] text-steel-500">{r.setup.dataMode}</span>), hideOnMobile: true },
        ]}
      />
      <Drawer open={!!open} onOpenChange={(o) => !o && setOpen(null)} title={open ? `${open.symbol} · ${open.mode} setup · ${fmtDate(open.generatedAt, true)}` : ""}>
        {open ? <SetupDetail setup={open} /> : null}
      </Drawer>
    </div>
  );
}
