"use client";

import { LayoutGrid, Rows3, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { trackEvent } from "@/components/layout/page-view-tracker";
import { AtlasSetupCard } from "@/components/atlas/setup-card";
import { DirectionBadge, StatusPill, TRADE_TYPE_LABEL } from "@/components/atlas/primitives";
import { Drawer, Input, Segmented, Select } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ScoreRing } from "@/components/ui/score-ring";
import { EmptyState } from "@/components/ui/states";
import { fmtPrice } from "@/lib/format";
import type { AtlasSetup } from "@/types/atlas";
import { SetupDetail } from "./setup-detail";

/** Ranked setup board with filters and a detail drawer. */
export function SetupBoard({ setups, emptyTitle = "No setups above threshold", emptyDescription }: { setups: AtlasSetup[]; emptyTitle?: string; emptyDescription?: string }) {
  const [dir, setDir] = useState<"all" | "long" | "short">("all");
  const [kind, setKind] = useState<"all" | "options" | "stock">("all");
  const [minScore, setMinScore] = useState(0);
  const [sector, setSector] = useState("all");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [open, setOpen] = useState<AtlasSetup | null>(null);
  const [more, setMore] = useState(false);
  const [ticker, setTicker] = useState("");
  const [strategy, setStrategy] = useState("all");
  const [px, setPx] = useState<{ min: string; max: string }>({ min: "", max: "" });
  const [ivr, setIvr] = useState<{ min: string; max: string }>({ min: "", max: "" });
  const [dteMax, setDteMax] = useState("");
  const [delta, setDelta] = useState<{ min: string; max: string }>({ min: "", max: "" });
  const n = (v: string) => (v.trim() === "" ? null : Number(v));
  const sectors = useMemo(() => [...new Set(setups.map((s) => s.sector).filter((x): x is string => !!x))].sort(), [setups]);
  const rows = setups.filter(
    (s) =>
      (dir === "all" || s.direction === dir) &&
      (kind === "all" || (kind === "stock" ? s.tradeType === "stock" : s.tradeType !== "stock")) &&
      s.score.value >= minScore &&
      (sector === "all" || s.sector === sector) &&
      (!ticker || s.symbol.startsWith(ticker.toUpperCase())) &&
      (strategy === "all" || s.tradeType === strategy) &&
      (n(px.min) === null || s.price >= n(px.min)!) &&
      (n(px.max) === null || s.price <= n(px.max)!) &&
      (n(ivr.min) === null || (s.options?.ivRank ?? -1) >= n(ivr.min)!) &&
      (n(ivr.max) === null || (s.options?.ivRank != null && s.options.ivRank <= n(ivr.max)!)) &&
      (n(dteMax) === null || (s.options?.legs[0] != null && s.options.legs[0].dte <= n(dteMax)!)) &&
      (n(delta.min) === null || Math.abs(s.options?.legs[0]?.delta ?? -1) >= n(delta.min)!) &&
      (n(delta.max) === null || (s.options?.legs[0]?.delta != null && Math.abs(s.options.legs[0].delta) <= n(delta.max)!)),
  );
  const openSetup = (s: AtlasSetup) => {
    setOpen(s);
    trackEvent("atlas_setup_viewed", { symbol: s.symbol, mode: s.mode, score: s.score.value });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={dir} onChange={setDir} size="xs" options={[{ value: "all", label: "All" }, { value: "long", label: "Long" }, { value: "short", label: "Short" }]} />
        <Segmented value={kind} onChange={setKind} size="xs" options={[{ value: "all", label: "Any structure" }, { value: "options", label: "Options" }, { value: "stock", label: "Shares" }]} />
        <Select value={String(minScore)} onChange={(e) => setMinScore(Number(e.target.value))} className="w-36 [&_select]:h-7 [&_select]:text-[12px]" aria-label="Minimum score">
          {[0, 60, 65, 70, 75, 80].map((n) => (
            <option key={n} value={n}>{n ? `Score ≥ ${n}` : "Any score"}</option>
          ))}
        </Select>
        {sectors.length > 1 ? (
          <Select value={sector} onChange={(e) => setSector(e.target.value)} className="w-44 [&_select]:h-7 [&_select]:text-[12px]" aria-label="Sector">
            <option value="all">All sectors</option>
            {sectors.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        ) : null}
        <Button variant={more ? "secondary" : "ghost"} size="xs" onClick={() => setMore((m) => !m)} aria-expanded={more}>
          <SlidersHorizontal /> Filters
        </Button>
        <div className="ml-auto">
          <Segmented value={view} onChange={setView} size="xs" options={[{ value: "cards", label: <LayoutGrid className="size-3.5" aria-label="Cards" /> }, { value: "table", label: <Rows3 className="size-3.5" aria-label="Table" /> }]} />
        </div>
      </div>

      {more ? (
        <div className="panel grid gap-3 p-3 sm:grid-cols-3 lg:grid-cols-6">
          <label className="text-[11px] text-steel-500">
            Ticker
            <Input value={ticker} onChange={(e) => setTicker(e.target.value)} className="mt-1 h-8 text-[12px]" placeholder="e.g. NVDA" maxLength={8} />
          </label>
          <label className="text-[11px] text-steel-500">
            Strategy
            <Select value={strategy} onChange={(e) => setStrategy(e.target.value)} className="mt-1 [&_select]:h-8 [&_select]:text-[12px]">
              <option value="all">Any</option>
              {Object.entries(TRADE_TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </label>
          <label className="text-[11px] text-steel-500">
            Price min / max
            <div className="mt-1 flex gap-1">
              <Input value={px.min} onChange={(e) => setPx({ ...px, min: e.target.value })} inputMode="decimal" className="h-8 text-[12px]" placeholder="min" />
              <Input value={px.max} onChange={(e) => setPx({ ...px, max: e.target.value })} inputMode="decimal" className="h-8 text-[12px]" placeholder="max" />
            </div>
          </label>
          <label className="text-[11px] text-steel-500">
            IV rank min / max
            <div className="mt-1 flex gap-1">
              <Input value={ivr.min} onChange={(e) => setIvr({ ...ivr, min: e.target.value })} inputMode="numeric" className="h-8 text-[12px]" placeholder="0" />
              <Input value={ivr.max} onChange={(e) => setIvr({ ...ivr, max: e.target.value })} inputMode="numeric" className="h-8 text-[12px]" placeholder="100" />
            </div>
          </label>
          <label className="text-[11px] text-steel-500">
            Max DTE
            <Input value={dteMax} onChange={(e) => setDteMax(e.target.value)} inputMode="numeric" className="mt-1 h-8 text-[12px]" placeholder="any" />
          </label>
          <label className="text-[11px] text-steel-500">
            |Delta| min / max
            <div className="mt-1 flex gap-1">
              <Input value={delta.min} onChange={(e) => setDelta({ ...delta, min: e.target.value })} inputMode="decimal" className="h-8 text-[12px]" placeholder="0.2" />
              <Input value={delta.max} onChange={(e) => setDelta({ ...delta, max: e.target.value })} inputMode="decimal" className="h-8 text-[12px]" placeholder="0.8" />
            </div>
          </label>
        </div>
      ) : null}

      {!rows.length ? (
        <EmptyState title={emptyTitle} description={emptyDescription ?? "Atlas only lists setups that clear the configured score and data-coverage thresholds. No listing is also information."} className="panel" />
      ) : view === "cards" ? (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {rows.map((s, i) => (
            <button key={s.id} type="button" onClick={() => openSetup(s)} className="text-left">
              <AtlasSetupCard setup={s} rank={i + 1} />
            </button>
          ))}
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <DataTable
            rows={rows}
            rowKey={(s) => s.id}
            onRowClick={openSetup}
            initialSort={{ key: "score", dir: "desc" }}
            columns={[
              { key: "score", header: "Score", cell: (s) => <ScoreRing value={s.score.value} size={30} stroke={2.5} />, sortValue: (s) => s.score.value },
              { key: "sym", header: "Ticker", cell: (s) => <span className="font-mono tracking-wider text-chrome">{s.symbol}</span>, sortValue: (s) => s.symbol },
              { key: "dir", header: "Direction", cell: (s) => <DirectionBadge direction={s.direction} /> },
              { key: "type", header: "Trade type", cell: (s) => <span className="text-steel-300">{TRADE_TYPE_LABEL[s.tradeType]}</span>, hideOnMobile: true },
              { key: "px", header: "Last", align: "right", cell: (s) => <span className="num">{fmtPrice(s.price)}</span> },
              { key: "entry", header: "Entry", align: "right", cell: (s) => <span className="num text-steel-200">{fmtPrice(s.entry.low)}–{fmtPrice(s.entry.high)}</span>, hideOnMobile: true },
              { key: "tgt", header: "Target", align: "right", cell: (s) => <span className="num text-up">{fmtPrice(s.target.low)}–{fmtPrice(s.target.high)}</span>, hideOnMobile: true },
              { key: "inv", header: "Invalidation", align: "right", cell: (s) => <span className="num text-down">{fmtPrice(s.invalidation)}</span> },
              { key: "rr", header: "R/R", align: "right", cell: (s) => <span className="num">{s.riskReward ?? "—"}</span>, sortValue: (s) => s.riskReward, hideOnMobile: true },
              { key: "cov", header: "Coverage", align: "right", cell: (s) => <span className="num text-steel-400">{Math.round(s.score.coverage * 100)}%</span>, hideOnMobile: true },
              { key: "st", header: "Status", cell: (s) => <StatusPill status={s.status} />, hideOnMobile: true },
            ]}
          />
        </div>
      )}
      <Drawer open={!!open} onOpenChange={(o) => !o && setOpen(null)} title={open ? `${open.symbol} · ${open.mode === "day" ? "Day trade" : "Swing"} setup` : ""}>
        {open ? <SetupDetail setup={open} /> : null}
      </Drawer>
    </div>
  );
}
