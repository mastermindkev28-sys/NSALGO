import type { Metadata } from "next";
import { MembershipGate } from "@/components/member/membership-gate";
import { MemberBody, MemberPageHeader } from "@/components/member/page-header";
import { MetricCard } from "@/components/ui/metric";
import { AtlasSubnav } from "@/features/atlas/atlas-subnav";
import { HistoryTable } from "@/features/atlas/history-table";
import { atlasHistory } from "@/services/atlas/history";
import { getViewer } from "@/services/membership";
import { fmtPct } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Atlas · History" };

export default async function HistoryPage() {
  const viewer = await getViewer();
  if (!viewer.paid) return <MembershipGate feature="Atlas History" />;
  const { rows, stats } = await atlasHistory({ limit: 500 });
  const simulated = rows.some((r) => r.setup.dataMode === "mock");
  return (
    <>
      <MemberPageHeader
        eyebrow="Atlas"
        title="Setup history"
        description="Every setup Atlas has generated, with its lifecycle and outcome. Invalidated setups remain in the record; statistics are computed over everything shown."
      />
      <AtlasSubnav />
      <MemberBody>
        {simulated ? (
          <p className="rounded-md border border-dashed border-warn/30 bg-warn-soft/40 px-4 py-2.5 text-[12px] text-warn">
            Development mode: history includes a point-in-time replay on simulated data (technical factors only). These are not real market outcomes.
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <MetricCard label="Setups recorded" value={stats.total} />
          <MetricCard label="Open" value={stats.open} />
          <MetricCard label="Triggered" value={stats.triggered} />
          <MetricCard label="Target reached" value={stats.targetReached} />
          <MetricCard label="Invalidated" value={stats.invalidated} />
          <MetricCard label="Expired" value={stats.expired} />
          <MetricCard label="Target rate" value={stats.targetRate === null ? "—" : `${stats.targetRate}%`} hint="of resolved, triggered" />
          <MetricCard label="Avg. result" value={fmtPct(stats.avgReturnPct)} hint="entry mid → exit" />
        </div>
        <HistoryTable rows={rows} />
        <p className="text-[11.5px] leading-relaxed text-steel-500">
          Results measure price movement from the entry-zone midpoint to the recorded exit level for triggered setups; they ignore fees, slippage and options pricing and are not a record of any account&apos;s performance. Past outcomes do not indicate future results.
        </p>
      </MemberBody>
    </>
  );
}
