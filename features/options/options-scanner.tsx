"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Segmented } from "@/components/ui/controls";
import { DataTable } from "@/components/ui/data-table";
import { LoadingState, UnavailableState } from "@/components/ui/states";
import { fmtCompact, fmtDate, fmtIv, fmtPrice } from "@/lib/format";
import type { DataResult } from "@/types/data";
import type { OptionsScanRow } from "@/types/options";

type Preset = "most-active" | "unusual" | "high-vol-oi" | "large-premium" | "high-iv" | "low-iv" | "directional";
const PRESETS: { value: Preset; label: string }[] = [
  { value: "most-active", label: "Most Active" },
  { value: "unusual", label: "Unusual Activity" },
  { value: "high-vol-oi", label: "High Vol/OI" },
  { value: "large-premium", label: "Large Premium" },
  { value: "high-iv", label: "High IV" },
  { value: "low-iv", label: "Low IV" },
  { value: "directional", label: "Directional Flow" },
];

const FIELDS = [
  ["symbols", "Tickers (comma)"],
  ["minDte", "DTE min"],
  ["maxDte", "DTE max"],
  ["minDelta", "|Δ| min"],
  ["maxDelta", "|Δ| max"],
  ["minIv", "IV min (0.3 = 30%)"],
  ["maxIv", "IV max"],
  ["minVolume", "Volume ≥"],
  ["minOpenInterest", "Open interest ≥"],
  ["minVolOi", "Vol/OI ≥"],
  ["maxSpreadPct", "Bid/ask spread ≤ %"],
  ["minPremium", "Premium traded ≥ $"],
] as const;

export function OptionsScanner({ initial }: { initial: DataResult<OptionsScanRow[]> }) {
  const [preset, setPreset] = useState<Preset>("most-active");
  const [right, setRight] = useState<"both" | "call" | "put">("both");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [applied, setApplied] = useState<Record<string, string>>({});
  const query = (() => {
    const sp = new URLSearchParams({ preset, limit: "200" });
    if (right !== "both") sp.set("right", right);
    for (const [k, v] of Object.entries(applied)) if (v.trim()) sp.set(k, v.trim());
    return sp.toString();
  })();
  const initialQuery = "preset=most-active&limit=200";
  const [fetched, setFetched] = useState<{ q: string; data: DataResult<OptionsScanRow[]> } | null>(null);
  const data = query === initialQuery ? initial : fetched?.q === query ? fetched.data : null;

  useEffect(() => {
    if (query === initialQuery) return;
    const ctrl = new AbortController();
    fetch(`/api/options/scan?${query}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => setFetched({ q: query, data: j.ok ? j : { ok: false, error: j.error ?? { code: "INTERNAL", message: "Scan failed" } } }))
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [query]);

  return (
    <div>
      <div className="space-y-3 border-b border-line p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented value={preset} onChange={setPreset} options={PRESETS} size="xs" className="max-w-full overflow-x-auto" />
          <Segmented value={right} onChange={setRight} size="xs" options={[{ value: "both", label: "Calls & puts" }, { value: "call", label: "Calls" }, { value: "put", label: "Puts" }]} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setApplied(filters);
          }}
          className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6"
        >
          {FIELDS.map(([k, label]) => (
            <Input key={k} placeholder={label} aria-label={label} value={filters[k] ?? ""} onChange={(e) => setFilters({ ...filters, [k]: e.target.value })} className="h-8 text-[12px]" />
          ))}
          <div className="flex gap-2 sm:col-span-3 lg:col-span-6">
            <Button size="sm" variant="secondary">Apply filters</Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => { setFilters({}); setApplied({}); }}>Reset</Button>
          </div>
        </form>
      </div>
      {!data ? (
        <LoadingState rows={10} />
      ) : !data.ok ? (
        <UnavailableState error={data.error} label="Options scanner" />
      ) : (
        <DataTable
          rows={data.data}
          rowKey={(r) => r.contract}
          maxHeight={620}
          dense
          columns={[
            { key: "u", header: "Ticker", cell: (r) => <Link href={`/dashboard/symbol/${r.underlying}`} className="font-mono tracking-wider text-chrome hover:text-polar-300">{r.underlying}</Link>, sortValue: (r) => r.underlying },
            { key: "c", header: "Contract", cell: (r) => <span className="num"><span className={r.right === "call" ? "text-up" : "text-down"}>{r.right === "call" ? "C" : "P"}</span> {fmtPrice(r.strike)} <span className="text-steel-500">{fmtDate(r.expiration)}</span></span> },
            { key: "dte", header: "DTE", align: "right", cell: (r) => <span className="num">{r.dte}</span>, sortValue: (r) => r.dte },
            { key: "spot", header: "Spot", align: "right", cell: (r) => <span className="num text-steel-300">{fmtPrice(r.underlyingPrice)}</span>, hideOnMobile: true },
            { key: "bid", header: "Bid / Ask", align: "right", cell: (r) => <span className="num">{fmtPrice(r.bid, { decimals: 2 })} / {fmtPrice(r.ask, { decimals: 2 })}</span>, hideOnMobile: true },
            { key: "sp", header: "Spread", align: "right", cell: (r) => <span className="num text-steel-300">{r.spreadPct === null ? "—" : `${r.spreadPct}%`}</span>, sortValue: (r) => r.spreadPct, hideOnMobile: true },
            { key: "d", header: "Δ", align: "right", cell: (r) => <span className="num">{r.delta?.toFixed(2) ?? "n/a"}</span>, sortValue: (r) => (r.delta === null ? null : Math.abs(r.delta)) },
            { key: "iv", header: "IV", align: "right", cell: (r) => <span className="num">{fmtIv(r.impliedVolatility)}</span>, sortValue: (r) => r.impliedVolatility },
            { key: "vol", header: "Volume", align: "right", cell: (r) => <span className="num">{fmtCompact(r.volume)}</span>, sortValue: (r) => r.volume },
            { key: "oi", header: "OI", align: "right", cell: (r) => <span className="num">{fmtCompact(r.openInterest)}</span>, sortValue: (r) => r.openInterest },
            { key: "voi", header: "Vol/OI", align: "right", cell: (r) => <span className={r.volOi !== null && r.volOi >= 1 ? "num text-warn" : "num"}>{r.volOi ?? "—"}</span>, sortValue: (r) => r.volOi },
            { key: "prem", header: "Premium", align: "right", cell: (r) => <span className="num text-chrome">{fmtCompact(r.premiumTraded, { currency: true })}</span>, sortValue: (r) => r.premiumTraded },
            { key: "tr", header: "Trend", cell: (r) => (r.underlyingTrend ? <Badge size="sm" variant={r.underlyingTrend === "up" ? "up" : r.underlyingTrend === "down" ? "down" : "neutral"}>{r.underlyingTrend}</Badge> : <span className="text-steel-500">n/a</span>), hideOnMobile: true },
          ]}
        />
      )}
    </div>
  );
}
