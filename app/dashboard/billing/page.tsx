import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MemberBody, MemberPageHeader } from "@/components/member/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { db } from "@/db";
import { cancelMockAction, portalAction } from "@/features/billing/actions";
import { fmtDate, fmtMoney, titleCase } from "@/lib/format";
import { billing, getPlans } from "@/services/billing";
import { requireUser } from "@/services/membership";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const v = await requireUser("/dashboard/billing");
  const sp = await searchParams;
  const [tx, plans] = await Promise.all([db().billing.listTransactions(v.user.id), getPlans()]);
  const sub = v.subscription;
  const plan = plans.find((p) => p.code === sub?.planCode);
  const provider = billing().id;
  return (
    <>
      <MemberPageHeader eyebrow="Personal" title="Billing" description="Membership, payment status and invoices. Payments are processed by Stripe; NSALGO never stores card details." />
      <MemberBody className="max-w-4xl">
        {sp.error === "portal" ? <div className="rounded-md border border-down/30 bg-down-soft px-4 py-3 text-[13px] text-down">The billing portal is temporarily unavailable. Please try again.</div> : null}
        {sp.canceled ? <div className="rounded-md border border-line bg-graphite-900 px-4 py-3 text-[13px] text-steel-300">Cancellation scheduled — access continues until the end of the current period.</div> : null}
        <Panel>
          <PanelHeader title="Membership" actions={<Badge variant={v.paid ? "up" : v.state === "past_due" ? "warn" : "outline"} size="sm">{titleCase(v.state.replace("_", " "))}</Badge>} />
          <PanelBody>
            {sub ? (
              <div className="grid gap-4 text-[13px] sm:grid-cols-4">
                <div>
                  <div className="text-steel-500">Plan</div>
                  <div className="mt-0.5 text-steel-100">{plan?.name ?? titleCase(sub.planCode ?? "—")}</div>
                </div>
                <div>
                  <div className="text-steel-500">Status</div>
                  <div className="mt-0.5 capitalize text-steel-100">{sub.status.replace("_", " ")}</div>
                </div>
                <div>
                  <div className="text-steel-500">{sub.cancelAtPeriodEnd || sub.status === "canceled" ? "Access until" : "Renews"}</div>
                  <div className="mt-0.5 text-steel-100">{fmtDate(sub.currentPeriodEnd, true)}</div>
                </div>
                <div>
                  <div className="text-steel-500">Provider</div>
                  <div className="mt-0.5 text-steel-100">{sub.provider === "mock" ? "Mock (development)" : "Stripe"}</div>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-steel-400">You&apos;re on a free account. Membership unlocks Atlas, options intelligence, whale activity and public disclosures.</p>
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              {!v.paid || v.state === "admin" ? (
                <Button asChild variant="primary" size="sm">
                  <Link href="/signup/plan">{sub ? "Rejoin NSALGO" : "Upgrade membership"}</Link>
                </Button>
              ) : null}
              {sub && provider === "stripe" ? (
                <form action={portalAction}>
                  <Button variant="secondary" size="sm">
                    Manage in Stripe portal <ExternalLink />
                  </Button>
                </form>
              ) : null}
              {sub && provider === "mock" && !sub.cancelAtPeriodEnd && v.paid ? (
                <form action={cancelMockAction}>
                  <Button variant="outline" size="sm">Cancel membership (mock)</Button>
                </form>
              ) : null}
            </div>
            <p className="mt-4 text-[11.5px] text-steel-500">Upgrades, downgrades, cancellation, payment methods and receipts are handled in the Stripe customer portal.</p>
          </PanelBody>
        </Panel>
        <Panel className="overflow-hidden">
          <PanelHeader title="Invoice history" />
          {tx.length ? (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-[0.12em] text-steel-500">
                  <th className="px-5 py-2.5 font-normal">Date</th>
                  <th className="px-5 py-2.5 font-normal">Amount</th>
                  <th className="px-5 py-2.5 font-normal">Status</th>
                  <th className="px-5 py-2.5 font-normal" />
                </tr>
              </thead>
              <tbody>
                {tx.map((t) => (
                  <tr key={t.id} className="border-b border-line/60">
                    <td className="num px-5 py-2.5 text-steel-300">{fmtDate(t.createdAt, true)}</td>
                    <td className="num px-5 py-2.5 text-steel-100">{fmtMoney(t.amount, t.currency)}</td>
                    <td className="px-5 py-2.5"><Badge size="sm" variant={t.status === "paid" ? "up" : t.status === "failed" ? "down" : "outline"}>{t.status}</Badge></td>
                    <td className="px-5 py-2.5 text-right">{t.hostedInvoiceUrl ? <a href={t.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] text-polar-300">Invoice ↗</a> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="No invoices yet" />
          )}
        </Panel>
      </MemberBody>
    </>
  );
}
