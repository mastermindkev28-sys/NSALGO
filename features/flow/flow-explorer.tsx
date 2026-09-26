"use client";

import { useMemo, useState } from "react";
import { FlowScatter } from "@/components/charts/flow-scatter";
import { FlowTable } from "@/components/disclosures/tables";
import { Input, Segmented } from "@/components/ui/controls";
import { MetricCard } from "@/components/ui/metric";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { fmtCompact } from "@/lib/format";
import type { OptionsFlowPrint } from "@/types/options";

type Preset = "all" | "bullish" | "bearish" | "large" | "unusual" | "opening" | "closing";

const PRESETS: { value: Preset; label: string }[] = [
  { value: "all", label: "All" },
  { value: "bullish", label: "Bullish" },
  { value: "bearish", label: "Bearish" },
  { value: "large", label: "Large premium" },
  { value: "unusual", label: "Unusual volume" },
  { value: "opening", label: "Opening" },
  { value: "closing", label: "Closing" },
];

/** Options-flow explorer. Filters only use classifications the provider actually supplied. */
export function FlowExplorer({ prints, maxHeight = 560 }: { prints: OptionsFlowPrint[]; maxHeight?: number }) {
  const [preset, setPreset] = useState<Preset>("all");
  const [right, setRight] = useState<"both" | "call" | "put">("both");
  const [symbol, setSymbol] = useState("");
  const rows = useMemo(() => {
    const s = symbol.trim().toUpperCase();
    return prints.filter((p) => {
      if (s && !p.underlying.startsWith(s)) return false;
      if (right !== "both" && p.right !== right) return false;
      switch (preset) {
        case "bullish":
          return p.sentiment === "bullish";
        case "bearish":
          return p.sentiment === "bearish";
        case "large":
          return p.premium >= 1_000_000;
        case "unusual":
          return p.volume !== null && p.openInterest !== null && p.volume > p.openInterest;
        case "opening":
          return p.intent === "opening";
        case "closing":
          return p.intent === "closing";
        default:
          return true;
      }
    });
  }, [prints, preset, right, symbol]);

  const stats = useMemo(() => {
    let total = 0;
    let bull = 0;
    let bear = 0;
    let calls = 0;
    let puts = 0;
    let unknownIntent = 0;
    for (const p of rows) {
      total += p.premium;
      if (p.sentiment === "bullish") bull += p.premium;
      if (p.sentiment === "bearish") bear += p.premium;
      if (p.right === "call") calls += p.premium;
      else puts += p.premium;
      if (!p.intent) unknownIntent++;
    }
    return { total, bull, bear, calls, puts, unknownIntent };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Premium in view" value={fmtCompact(stats.total, { currency: true })} hint={`${rows.length} prints`} />
        <MetricCard
          label="Bullish vs bearish (classified)"
          value={
            <span>
              <span className="text-up">{fmtCompact(stats.bull, { currency: true })}</span>
              <span className="text-steel-500"> / </span>
              <span className="text-down">{fmtCompact(stats.bear, { currency: true })}</span>
            </span>
          }
          hint="Unclassified prints excluded"
        />
        <MetricCard label="Call / put premium" value={stats.puts ? (stats.calls / stats.puts).toFixed(2) : "—"} hint={`${fmtCompact(stats.calls, { currency: true })} calls`} />
        <MetricCard label="Open/close status" value={`${rows.length ? Math.round(((rows.length - stats.unknownIntent) / rows.length) * 100) : 0}%`} hint="of prints classified by provider" />
      </div>

      <Panel className="overflow-hidden">
        <PanelHeader title="Flow map" description="Strike distance from spot over time; mark area proportional to premium." />
        <div className="p-3 sm:p-4">
          <FlowScatter prints={rows} />
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <Segmented value={preset} onChange={setPreset} options={PRESETS} size="xs" className="max-w-full overflow-x-auto" />
          <Segmented
            value={right}
            onChange={setRight}
            options={[
              { value: "both", label: "Calls & puts" },
              { value: "call", label: "Calls" },
              { value: "put", label: "Puts" },
            ]}
            size="xs"
          />
          <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="Ticker" className="h-7 w-28 text-[12px]" aria-label="Filter by ticker" maxLength={8} />
          <span className="ml-auto text-[11px] text-steel-500">Opening/closing status unavailable where the provider cannot determine it.</span>
        </div>
        {rows.length ? <FlowTable rows={rows} maxHeight={maxHeight} /> : <EmptyState title="No prints match these filters" description="Classification-based filters only include prints the provider classified." />}
      </Panel>
    </div>
  );
}
