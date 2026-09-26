import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/action-form";
import { AdminHeader } from "@/components/admin/admin-header";
import { Badge } from "@/components/ui/badge";
import { Checkbox, Input, Label } from "@/components/ui/controls";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { db } from "@/db";
import { savePlanAction } from "@/features/admin/actions";
import { can } from "@/lib/auth/permissions";
import { fmtDate } from "@/lib/format";
import { billingConfigured, getPlans } from "@/services/billing";
import { requirePermission } from "@/services/membership";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Subscriptions" };

export default async function SubscriptionsAdmin({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const v = await requirePermission("billing.view");
  const { status } = await searchParams;
  const [{ items, total }, plans] = await Promise.all([db().billing.listSubscriptions({ status: status || undefined, page: 1, pageSize: 200 }), getPlans()]);
  const b = billingConfigured();
  return (
    <>
      <AdminHeader title="Subscriptions & plans" description="Plan pricing lives here (not in code). Subscription state is written only by verified Stripe webhooks." />
      {b.issues.length ? <div className="rounded-md border border-warn/25 bg-warn-soft px-4 py-3 text-[12.5px] text-warn">{b.issues.join(" ")}</div> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {plans.map((p) => (
          <Panel key={p.code}>
            <PanelHeader title={`${p.name} plan`} description={`Billed per ${p.interval}`} actions={<Badge size="sm" variant={p.active ? "up" : "outline"}>{p.active ? "active" : "inactive"}</Badge>} />
            <PanelBody>
              {can(v.user.role, "users.manage") ? (
                <ActionForm action={savePlanAction} submitLabel="Save plan">
                  <input type="hidden" name="code" value={p.code} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><Label htmlFor={`n-${p.code}`}>Display name</Label><Input id={`n-${p.code}`} name="name" defaultValue={p.name} /></div>
                    <div><Label htmlFor={`a-${p.code}`}>Price ({p.currency})</Label><Input id={`a-${p.code}`} name="amount" inputMode="decimal" defaultValue={p.amount === null ? "" : (p.amount / 100).toFixed(2)} placeholder="Not configured" /></div>
                    <div><Label htmlFor={`c-${p.code}`}>Currency</Label><Input id={`c-${p.code}`} name="currency" defaultValue={p.currency} maxLength={3} /></div>
                    <div><Label htmlFor={`s-${p.code}`}>Stripe price ID</Label><Input id={`s-${p.code}`} name="stripePriceId" defaultValue={p.stripePriceId ?? ""} placeholder="price_…" /></div>
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-[13px] text-steel-300"><Checkbox name="active" defaultChecked={p.active} /> Available for purchase</label>
                  <p className="mt-2 text-[11.5px] text-steel-500">The display price must match the Stripe price; Stripe charges the price ID&apos;s amount.</p>
                </ActionForm>
              ) : (
                <p className="text-[13px] text-steel-400">{p.amount === null ? "Price not configured" : `${(p.amount / 100).toFixed(2)} ${p.currency}`}</p>
              )}
            </PanelBody>
          </Panel>
        ))}
      </div>
      <Panel className="overflow-x-auto">
        <PanelHeader title={`Subscriptions (${total})`} actions={<form className="flex gap-2" action="/admin/subscriptions"><select name="status" defaultValue={status ?? ""} className="h-7 rounded-sm border border-line bg-graphite-950 px-2 text-[12px] text-steel-100"><option value="">All statuses</option>{["active", "trialing", "past_due", "canceled", "unpaid", "incomplete"].map((s) => <option key={s}>{s}</option>)}</select><button className="text-[12px] text-steel-300">Filter</button></form>} />
        {items.length ? (
          <table className="w-full min-w-[820px] text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-[0.12em] text-steel-500">
                {["Member", "Plan", "Status", "Period end", "Cancel at end", "Provider", "Subscription"].map((h) => <th key={h} className="px-4 py-2.5 font-normal">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-b border-line/60">
                  <td className="px-4 py-2.5 text-steel-50">{s.email}</td>
                  <td className="px-4 py-2.5 capitalize text-steel-300">{s.planCode ?? "—"}</td>
                  <td className="px-4 py-2.5"><Badge size="sm" variant={s.status === "active" || s.status === "trialing" ? "up" : s.status === "past_due" ? "warn" : "outline"}>{s.status}</Badge></td>
                  <td className="num px-4 py-2.5 text-steel-400">{fmtDate(s.currentPeriodEnd, true)}</td>
                  <td className="px-4 py-2.5 text-steel-400">{s.cancelAtPeriodEnd ? "yes" : "no"}</td>
                  <td className="px-4 py-2.5 text-steel-400">{s.provider}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-steel-500">{s.providerSubscriptionId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="No subscriptions" />
        )}
      </Panel>
    </>
  );
}
