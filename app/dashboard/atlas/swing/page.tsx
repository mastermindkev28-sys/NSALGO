import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalTable } from "@/components/disclosures/tables";
import { MembershipGate } from "@/components/member/membership-gate";
import { MemberBody } from "@/components/member/page-header";
import { Change } from "@/components/ui/change";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState, UnavailableState } from "@/components/ui/states";
import { AtlasHeaderStrip } from "@/features/atlas/header-strip";
import { AtlasSubnav } from "@/features/atlas/atlas-subnav";
import { SetupBoard } from "@/features/atlas/setup-board";
import { addDays } from "@/lib/market-time";
import { fmtDate } from "@/lib/format";
import { getMarketContext, scan } from "@/services/atlas/engine";
import { runScanner } from "@/services/atlas/scanner";
import { listEarnings, listInstitutional } from "@/services/intel";
import { getMarketStatus } from "@/services/market";
import { getViewer } from "@/services/membership";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Atlas · Swing Trader" };

export default async function SwingPage() {
  const viewer = await getViewer();
  if (!viewer.paid) return <MembershipGate feature="Atlas Swing Trader" />;
  const ctx = await getMarketContext();
  const [status, swing, scanner, earnings, inst] = await Promise.all([getMarketStatus(), scan("swing"), runScanner("swing"), listEarnings(ctx.session, addDays(ctx.session, 21)), listInstitutional({ category: "13f", limit: 8 })]);
  const rows = scanner.rows;
  const rsLeaders = [...rows].filter((r) => r.rs20 !== null).sort((a, b) => (b.rs20 ?? 0) - (a.rs20 ?? 0)).slice(0, 8);
  const maStack = rows.filter((r) => r.trend === "up" && r.momentum !== "weak").slice(0, 8);
  const sectors = [...(ctx.sectors ?? [])].sort((a, b) => (b.relativeStrength ?? -99) - (a.relativeStrength ?? -99));
  const maxRs = Math.max(0.5, ...sectors.map((s) => Math.abs(s.relativeStrength ?? 0)));
  return (
    <>
      <AtlasHeaderStrip ctx={ctx} status={status.ok ? status.data : null} />
      <AtlasSubnav />
      <MemberBody>
        <section className="space-y-3">
          <div>
            <h2 className="font-mono text-[11px] tracking-[0.28em] text-steel-200">SWING WATCHLIST · RANKED CANDIDATES</h2>
            <p className="mt-1 text-[12px] text-steel-500">Multi-session setups weighted toward trend, relative strength, structure and accumulation. Potential entry, target, invalidation and holding horizon on every candidate.</p>
          </div>
          <SetupBoard setups={swing.setups} />
        </section>
        <div className="grid gap-4 xl:grid-cols-3">
          <Panel>
            <PanelHeader eyebrow="Sector rotation" title="Relative strength vs S&P 500 (today)" />
            <PanelBody className="space-y-2">
              {sectors.length ? (
                sectors.map((s) => {
                  const v = s.relativeStrength ?? 0;
                  return (
                    <div key={s.etf} className="grid grid-cols-[120px_1fr_52px] items-center gap-2 text-[12px]">
                      <span className="truncate text-steel-300">{s.sector}</span>
                      <div className="relative h-2">
                        <div className="absolute left-1/2 top-0 h-full w-px bg-line-strong" />
                        <div className={v >= 0 ? "absolute left-1/2 h-full rounded-r-sm bg-up/70" : "absolute right-1/2 h-full rounded-l-sm bg-down/70"} style={{ width: `${(Math.abs(v) / maxRs) * 50}%` }} />
                      </div>
                      <span className="num text-right text-steel-200">{v >= 0 ? "+" : "−"}{Math.abs(v).toFixed(2)}</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-[12.5px] text-steel-500">Sector data unavailable.</p>
              )}
            </PanelBody>
          </Panel>
          <Panel className="overflow-hidden">
            <PanelHeader eyebrow="Relative strength leaders" title="20-session excess return vs SPY" />
            <ul className="divide-y divide-line/70">
              {rsLeaders.map((r) => (
                <li key={r.symbol}>
                  <Link href={`/dashboard/symbol/${r.symbol}`} className="flex items-center justify-between px-4 py-2.5 text-[12.5px] hover:bg-white/[0.02]">
                    <span className="font-mono tracking-wider text-chrome">{r.symbol}</span>
                    <span className="num text-steel-200">{(r.rs20 ?? 0) >= 0 ? "+" : "−"}{Math.abs(r.rs20 ?? 0).toFixed(2)} pts</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel className="overflow-hidden">
            <PanelHeader eyebrow="Moving-average structure" title="Price > 20 > 50-day, momentum intact" />
            {maStack.length ? (
              <ul className="divide-y divide-line/70">
                {maStack.map((r) => (
                  <li key={r.symbol}>
                    <Link href={`/dashboard/symbol/${r.symbol}`} className="flex items-center justify-between px-4 py-2.5 text-[12.5px] hover:bg-white/[0.02]">
                      <span className="font-mono tracking-wider text-chrome">{r.symbol}</span>
                      <span className="flex items-center gap-3">
                        <span className="text-[11px] text-steel-500">{r.pctFromHigh52 !== null ? `${r.pctFromHigh52}% from 52w high` : ""}</span>
                        <Change percent={r.changePct} size="xs" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No stacked uptrends" className="py-8" />
            )}
          </Panel>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel className="overflow-hidden">
            <PanelHeader eyebrow="Earnings" title="Scheduled in the next 3 weeks" description="Binary event risk inside a swing horizon" />
            {earnings.ok ? (
              earnings.data.length ? (
                <ul className="divide-y divide-line/70">
                  {earnings.data.slice(0, 10).map((e) => (
                    <li key={`${e.symbol}${e.date}`} className="flex items-center justify-between px-4 py-2.5 text-[12.5px]">
                      <Link href={`/dashboard/symbol/${e.symbol}`} className="font-mono tracking-wider text-chrome">{e.symbol}</Link>
                      <span className="text-steel-400">{fmtDate(e.date)} · {e.time === "bmo" ? "Before open" : e.time === "amc" ? "After close" : "Time TBA"}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="No scheduled earnings in the window" className="py-8" />
              )
            ) : (
              <UnavailableState error={earnings.error} compact />
            )}
          </Panel>
          <Panel className="overflow-hidden">
            <PanelHeader eyebrow="Institutional activity" title="Recent 13F changes" />
            {inst.ok ? <InstitutionalTable rows={inst.data} compact /> : <UnavailableState error={inst.error} compact />}
          </Panel>
        </div>
      </MemberBody>
    </>
  );
}
