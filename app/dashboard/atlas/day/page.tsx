import type { Metadata } from "next";
import Link from "next/link";
import { FlowTable } from "@/components/disclosures/tables";
import { MembershipGate } from "@/components/member/membership-gate";
import { MemberBody } from "@/components/member/page-header";
import { MoversTable } from "@/components/market/movers-table";
import { Badge } from "@/components/ui/badge";
import { Change } from "@/components/ui/change";
import { DataSourceBadge } from "@/components/ui/data-source";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { EmptyState, UnavailableState } from "@/components/ui/states";
import { AtlasHeaderStrip } from "@/features/atlas/header-strip";
import { AtlasSubnav } from "@/features/atlas/atlas-subnav";
import { SetupBoard } from "@/features/atlas/setup-board";
import { getMarketContext, scan } from "@/services/atlas/engine";
import { runScanner, type ScannerRow } from "@/services/atlas/scanner";
import { getFlow } from "@/services/intel";
import { getMarketStatus, getMovers } from "@/services/market";
import { getViewer } from "@/services/membership";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Atlas · Day Trade" };

function MiniList({ rows, metric }: { rows: ScannerRow[]; metric: (r: ScannerRow) => React.ReactNode }) {
  if (!rows.length) return <EmptyState title="Nothing qualifies right now" className="py-8" />;
  return (
    <ul className="divide-y divide-line/70">
      {rows.map((r) => (
        <li key={r.symbol}>
          <Link href={`/dashboard/symbol/${r.symbol}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[12.5px] hover:bg-white/[0.02]">
            <span className="flex min-w-0 items-center gap-2">
              <span className="w-12 font-mono tracking-wider text-chrome">{r.symbol}</span>
              <span className="truncate text-steel-500">{r.name}</span>
            </span>
            <span className="flex shrink-0 items-center gap-3">
              {metric(r)}
              <Change percent={r.changePct} size="xs" className="w-16 justify-end" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function DayTradePage() {
  const viewer = await getViewer();
  if (!viewer.paid) return <MembershipGate feature="Atlas Day Trade" />;
  const [ctx, status, day, scanner, unusual, flow] = await Promise.all([getMarketContext(), getMarketStatus(), scan("day"), runScanner("day"), getMovers("unusual-volume", 10), getFlow({ limit: 12, minPremium: 500_000 })]);
  const rows = scanner.rows;
  const momentum = [...rows].filter((r) => r.momentum === "strong").sort((a, b) => Math.abs(b.changePct ?? 0) - Math.abs(a.changePct ?? 0)).slice(0, 6);
  const breakouts = rows.filter((r) => r.breakout).slice(0, 6);
  const breakdowns = rows.filter((r) => r.breakdown).slice(0, 6);
  const highRvol = [...rows].filter((r) => (r.rvol ?? 0) >= 1.3).sort((a, b) => (b.rvol ?? 0) - (a.rvol ?? 0)).slice(0, 6);
  const catalysts = day.setups.flatMap((s) => s.catalysts.filter((c) => c.kind !== "economic-event").map((c) => ({ symbol: s.symbol, c }))).slice(0, 8);
  return (
    <>
      <AtlasHeaderStrip ctx={ctx} status={status.ok ? status.data : null} />
      <AtlasSubnav />
      <MemberBody>
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-mono text-[11px] tracking-[0.28em] text-steel-200">DAY TRADER · TOP OPPORTUNITIES</h2>
              <p className="mt-1 text-[12px] text-steel-500">
                Short-horizon setups weighted toward momentum, volume, VWAP structure and liquidity. {ctx.marketOpen ? "Live session." : `Market closed — planning for the ${ctx.planningSession} session.`}
              </p>
            </div>
            <Badge variant="outline" size="sm">Calls · Puts · Verticals · Debit & credit spreads</Badge>
          </div>
          <SetupBoard setups={day.setups} />
        </section>
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          <Panel className="overflow-hidden"><PanelHeader eyebrow="Momentum leaders" title="Strong 20-session momentum" /><MiniList rows={momentum} metric={(r) => <span className="num text-[11px] text-steel-400">RSI {r.rsi ?? "—"}</span>} /></Panel>
          <Panel className="overflow-hidden"><PanelHeader eyebrow="Breakouts" title="Above 20-session high" /><MiniList rows={breakouts} metric={(r) => <span className="num text-[11px] text-steel-400">{r.rvol ? `${r.rvol}×` : "—"}</span>} /></Panel>
          <Panel className="overflow-hidden"><PanelHeader eyebrow="Breakdowns" title="Below 20-session low" /><MiniList rows={breakdowns} metric={(r) => <span className="num text-[11px] text-steel-400">{r.rvol ? `${r.rvol}×` : "—"}</span>} /></Panel>
          <Panel className="overflow-hidden"><PanelHeader eyebrow="High relative volume" title="≥ 1.3× time-adjusted" /><MiniList rows={highRvol} metric={(r) => <span className="num text-[11px] text-steel-300">{r.rvol}×</span>} /></Panel>
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
          <Panel className="overflow-hidden">
            <PanelHeader eyebrow="Options flow" title="Large prints ≥ $500K" actions={<Link href="/dashboard/flow" className="text-[12px] text-steel-400 hover:text-chrome">Full flow →</Link>} />
            {flow.ok ? <FlowTable rows={flow.data} compact /> : <UnavailableState error={flow.error} compact />}
          </Panel>
          <Panel className="overflow-hidden">
            <PanelHeader eyebrow="Catalyst alerts" title="Catalysts on today's setups" />
            {catalysts.length ? (
              <ul className="divide-y divide-line/70">
                {catalysts.map(({ symbol, c }, i) => (
                  <li key={i} className="flex items-start gap-3 px-4 py-2.5 text-[12.5px]">
                    <span className="w-12 shrink-0 font-mono tracking-wider text-chrome">{symbol}</span>
                    <span className="text-steel-200">{c.label}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No symbol-specific catalysts" className="py-8" />
            )}
          </Panel>
        </div>
        <Panel className="overflow-hidden">
          <PanelHeader eyebrow="Unusual volume" title="Relative to average, time-of-day adjusted" actions={<DataSourceBadge meta={unusual.ok ? unusual.meta : null} showTime={false} />} />
          <MoversTable initial={unusual} initialKind="unusual-volume" linkBase="/dashboard/symbol" />
        </Panel>
      </MemberBody>
    </>
  );
}
