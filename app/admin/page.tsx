import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/admin-header";
import { MetricCard } from "@/components/ui/metric";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { can } from "@/lib/auth/permissions";
import { fmtMoney } from "@/lib/format";
import { adminMetrics } from "@/services/admin/metrics";
import { requirePermission } from "@/services/membership";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard" };

function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <EmptyState title="No data yet" className="py-6" />;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[140px_1fr_48px] items-center gap-3 text-[12px]">
          <span className="truncate text-steel-300">{r.label}</span>
          <span className="h-1.5 rounded-full bg-polar-700/30">
            <span className="block h-full rounded-full bg-polar-500" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="num text-right text-steel-100">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function AdminDashboard() {
  const v = await requirePermission("admin.view");
  const showBusiness = can(v.user.role, "billing.view");
  const m = await adminMetrics();
  return (
    <>
      <AdminHeader title="Admin dashboard" description="Membership, revenue and product engagement. Financial metrics are visible to administrators only." />
      {showBusiness ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <MetricCard label="Active members" value={m.activeMembers} hint={m.pastDue ? `${m.pastDue} past due` : undefined} />
          <MetricCard label="New users (30d)" value={m.newUsers} />
          <MetricCard label="MRR" value={fmtMoney(m.mrrCents)} hint={m.unpriced ? `${m.unpriced} unpriced` : undefined} />
          <MetricCard label="ARR" value={fmtMoney(m.arrCents)} />
          <MetricCard label="Churn (30d)" value={m.churnRate === null ? "—" : `${m.churnRate}%`} />
          <MetricCard label="Conversion" value={m.conversionRate === null ? "—" : `${m.conversionRate}%`} hint="members / users" />
          <MetricCard label="Revenue (30d)" value={fmtMoney(m.revenue30)} />
          <MetricCard label="Total users" value={m.users} />
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Daily active members" value={m.dau} />
        <MetricCard label="Weekly active" value={m.wau} />
        <MetricCard label="Atlas opens (7d)" value={m.atlasOpens7} />
        <MetricCard label="Setup views (7d)" value={m.setupViews7} />
        <MetricCard label="Signups (7d)" value={m.signups7} />
        <MetricCard label="Checkouts started (7d)" value={m.checkouts7} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <PanelHeader title="Popular tickers" description="Atlas setup views (30d), else watchlists" />
          <PanelBody><Bars rows={m.popularTickers.map((p) => ({ label: p.symbol, value: p.count }))} /></PanelBody>
        </Panel>
        <Panel>
          <PanelHeader title="Popular articles" description="Education opens (30d)" />
          <PanelBody><Bars rows={m.popularArticles.map((p) => ({ label: p.value, value: p.count }))} /></PanelBody>
        </Panel>
        <Panel>
          <PanelHeader title="Product events" description="Last 7 days" />
          <PanelBody><Bars rows={m.events7.slice(0, 10).map((e) => ({ label: e.name, value: e.count }))} /></PanelBody>
        </Panel>
      </div>
      <p className="text-[11.5px] text-steel-500">MRR normalises annual plans to monthly and counts active and trialing subscriptions. Atlas setups recorded: {m.setupsRecorded}.</p>
    </>
  );
}
