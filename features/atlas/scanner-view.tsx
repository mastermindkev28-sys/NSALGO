"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Change } from "@/components/ui/change";
import { Input, Segmented, Select } from "@/components/ui/controls";
import { DataTable } from "@/components/ui/data-table";
import { ScoreRing } from "@/components/ui/score-ring";
import { LoadingState } from "@/components/ui/states";
import { fmtCompact, fmtPrice } from "@/lib/format";
import type { ScannerRow } from "@/services/atlas/scanner";

type Data = { rows: ScannerRow[]; configVersion: string; minScore: number; generatedAt: string };

export function ScannerView({ initial }: { initial: Data }) {
  const router = useRouter();
  const [mode, setMode] = useState<"swing" | "day">("swing");
  const [fetched, setFetched] = useState<{ mode: string; data: Data } | null>(null);
  const data = mode === "swing" ? initial : fetched?.mode === mode ? fetched.data : null;
  const [q, setQ] = useState("");
  const [sector, setSector] = useState("all");
  const [dir, setDir] = useState<"all" | "long" | "short">("all");
  const [minScore, setMinScore] = useState(0);
  const [minRvol, setMinRvol] = useState(0);
  const [minLiq, setMinLiq] = useState(0);
  const [price, setPrice] = useState({ min: "", max: "" });
  const [flags, setFlags] = useState<"all" | "qualifies" | "breakout" | "breakdown">("all");

  useEffect(() => {
    if (mode === "swing") return;
    fetch(`/api/atlas/scan?mode=${mode}`)
      .then((r) => r.json())
      .then((j) => j.ok && setFetched({ mode, data: j.data }))
      .catch(() => undefined);
  }, [mode]);

  const sectors = useMemo(() => [...new Set((data?.rows ?? []).map((r) => r.sector).filter((x): x is string => !!x))].sort(), [data]);
  const rows = (data?.rows ?? []).filter((r) => {
    if (q && !(r.symbol.startsWith(q.toUpperCase()) || r.name.toLowerCase().includes(q.toLowerCase()))) return false;
    if (sector !== "all" && r.sector !== sector) return false;
    if (dir !== "all" && r.direction !== dir) return false;
    if (r.score < minScore) return false;
    if (minRvol && (r.rvol ?? 0) < minRvol) return false;
    if (minLiq && (r.avgDollarVolume ?? 0) < minLiq) return false;
    if (price.min && r.price < Number(price.min)) return false;
    if (price.max && r.price > Number(price.max)) return false;
    if (flags === "qualifies" && !r.qualifies) return false;
    if (flags === "breakout" && !r.breakout) return false;
    if (flags === "breakdown" && !r.breakdown) return false;
    return true;
  });

  return (
    <div className="panel overflow-hidden">
      <div className="space-y-3 border-b border-line p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented value={mode} onChange={setMode} size="xs" options={[{ value: "swing", label: "Swing model" }, { value: "day", label: "Day model" }]} />
          <Segmented value={dir} onChange={setDir} size="xs" options={[{ value: "all", label: "Both directions" }, { value: "long", label: "Long" }, { value: "short", label: "Short" }]} />
          <Segmented value={flags} onChange={setFlags} size="xs" options={[{ value: "all", label: "All" }, { value: "qualifies", label: "Above threshold" }, { value: "breakout", label: "Breakouts" }, { value: "breakdown", label: "Breakdowns" }]} />
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ticker or company" className="h-8 text-[12px]" maxLength={30} aria-label="Search" />
          <Select value={sector} onChange={(e) => setSector(e.target.value)} className="[&_select]:h-8 [&_select]:text-[12px]" aria-label="Sector">
            <option value="all">All sectors</option>
            {sectors.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          <Select value={String(minScore)} onChange={(e) => setMinScore(Number(e.target.value))} className="[&_select]:h-8 [&_select]:text-[12px]" aria-label="Minimum score">
            {[0, 50, 55, 60, 65, 70, 75, 80].map((n) => (
              <option key={n} value={n}>{n ? `Score ≥ ${n}` : "Any score"}</option>
            ))}
          </Select>
          <Select value={String(minRvol)} onChange={(e) => setMinRvol(Number(e.target.value))} className="[&_select]:h-8 [&_select]:text-[12px]" aria-label="Relative volume">
            {[0, 1, 1.3, 1.5, 2, 3].map((n) => (
              <option key={n} value={n}>{n ? `Rel. volume ≥ ${n}×` : "Any volume"}</option>
            ))}
          </Select>
          <Select value={String(minLiq)} onChange={(e) => setMinLiq(Number(e.target.value))} className="[&_select]:h-8 [&_select]:text-[12px]" aria-label="Liquidity">
            {[0, 1e8, 5e8, 1e9, 5e9].map((n) => (
              <option key={n} value={n}>{n ? `$ volume ≥ ${fmtCompact(n, { currency: true, decimals: 0 })}` : "Any liquidity"}</option>
            ))}
          </Select>
          <div className="flex gap-1">
            <Input value={price.min} onChange={(e) => setPrice({ ...price, min: e.target.value })} placeholder="Price min" inputMode="decimal" className="h-8 text-[12px]" />
            <Input value={price.max} onChange={(e) => setPrice({ ...price, max: e.target.value })} placeholder="max" inputMode="decimal" className="h-8 text-[12px]" />
          </div>
        </div>
        <p className="text-[11px] text-steel-500">
          {rows.length} of {data?.rows.length ?? 0} symbols · every symbol is scored, including those below the {data?.minScore ?? "—"} threshold · config {data?.configVersion ?? "—"}
        </p>
      </div>
      {!data ? (
        <LoadingState rows={10} />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(r) => r.symbol}
          onRowClick={(r) => router.push(`/dashboard/symbol/${r.symbol}`)}
          initialSort={{ key: "score", dir: "desc" }}
          maxHeight={720}
          columns={[
            { key: "score", header: "Score", cell: (r) => <span className="flex items-center gap-2"><ScoreRing value={r.score} size={28} stroke={2.5} label={false} /><span className="num">{r.score}</span></span>, sortValue: (r) => r.score },
            { key: "sym", header: "Ticker", cell: (r) => <span className="font-mono tracking-wider text-chrome">{r.symbol}</span>, sortValue: (r) => r.symbol },
            { key: "name", header: "Company", cell: (r) => <span className="block max-w-[180px] truncate text-steel-400">{r.name}</span>, hideOnMobile: true },
            { key: "dir", header: "Bias", cell: (r) => <Badge size="sm" variant={r.direction === "long" ? "up" : "down"}>{r.direction}</Badge> },
            { key: "px", header: "Last", align: "right", cell: (r) => <span className="num">{fmtPrice(r.price)}</span>, sortValue: (r) => r.price },
            { key: "chg", header: "% Chg", align: "right", cell: (r) => <Change percent={r.changePct} />, sortValue: (r) => r.changePct },
            { key: "trend", header: "Trend", cell: (r) => <span className="capitalize text-steel-300">{r.trend}</span>, hideOnMobile: true },
            { key: "mom", header: "Momentum", cell: (r) => <span className="capitalize text-steel-300">{r.momentum}</span>, hideOnMobile: true },
            { key: "rsi", header: "RSI", align: "right", cell: (r) => <span className="num">{r.rsi ?? "—"}</span>, sortValue: (r) => r.rsi, hideOnMobile: true },
            { key: "rvol", header: "Rel. vol", align: "right", cell: (r) => <span className="num">{r.rvol ? `${r.rvol}×` : "—"}</span>, sortValue: (r) => r.rvol },
            { key: "rs", header: "RS 20d", align: "right", cell: (r) => <span className="num">{r.rs20 === null ? "—" : `${r.rs20 >= 0 ? "+" : "−"}${Math.abs(r.rs20).toFixed(1)}`}</span>, sortValue: (r) => r.rs20, hideOnMobile: true },
            { key: "atr", header: "ATR %", align: "right", cell: (r) => <span className="num">{r.atrPct ?? "—"}</span>, sortValue: (r) => r.atrPct, hideOnMobile: true },
            { key: "liq", header: "$ Vol", align: "right", cell: (r) => <span className="num text-steel-300">{fmtCompact(r.avgDollarVolume, { currency: true })}</span>, sortValue: (r) => r.avgDollarVolume, hideOnMobile: true },
            { key: "sig", header: "Signals", cell: (r) => <span className="flex gap-1">{r.breakout ? <Badge size="sm" variant="up">Breakout</Badge> : null}{r.breakdown ? <Badge size="sm" variant="down">Breakdown</Badge> : null}{r.qualifies ? <Badge size="sm" variant="accent">Setup</Badge> : null}</span>, hideOnMobile: true },
          ]}
        />
      )}
    </div>
  );
}
