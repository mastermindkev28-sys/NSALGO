import type { Metadata } from "next";
import { InsiderTable } from "@/components/disclosures/tables";
import { MembershipGate } from "@/components/member/membership-gate";
import { MemberBody, MemberPageHeader } from "@/components/member/page-header";
import { Button } from "@/components/ui/button";
import { DataSourceBadge } from "@/components/ui/data-source";
import { Input, Select } from "@/components/ui/controls";
import { MetricCard } from "@/components/ui/metric";
import { Panel } from "@/components/ui/panel";
import { EmptyState, UnavailableState } from "@/components/ui/states";
import { fmtCompact } from "@/lib/format";
import { listInsiders } from "@/services/intel";
import { getViewer } from "@/services/membership";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Insider Transactions" };

const TX = ["purchase", "sale", "option-exercise", "award", "gift", "tax-withholding", "other"] as const;

export default async function InsidersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const viewer = await getViewer();
  if (!viewer.paid) return <MembershipGate feature="Insider transactions" />;
  const sp = await searchParams;
  const ticker = sp.ticker && /^[A-Za-z.]{1,8}$/.test(sp.ticker) ? sp.ticker.toUpperCase() : undefined;
  const transaction = TX.includes(sp.transaction as (typeof TX)[number]) ? sp.transaction : undefined;
  const person = sp.person?.slice(0, 80) || undefined;
  const r = await listInsiders({ ticker, transaction, person, limit: 300 });
  const buys = r.ok ? r.data.filter((x) => x.transactionType === "purchase") : [];
  const sells = r.ok ? r.data.filter((x) => x.transactionType === "sale") : [];
  const sum = (xs: typeof buys) => xs.reduce((a, x) => a + (x.value ?? 0), 0);
  return (
    <>
      <MemberPageHeader
        eyebrow="Public disclosures"
        title="Insider transactions"
        description="Section 16 filings (Forms 3, 4 and 5) from SEC EDGAR, linked to the originating filing. Transactions are shown as reported; many sales are pre-planned (Rule 10b5-1) or tax-related. Nothing here labels a transaction as suspicious."
        actions={<DataSourceBadge meta={r.ok ? r.meta : null} />}
      />
      <MemberBody>
        <form className="grid gap-2 sm:grid-cols-4" action="/dashboard/insiders">
          <Input name="ticker" defaultValue={ticker} placeholder="Ticker" maxLength={8} className="h-9 text-[13px]" />
          <Input name="person" defaultValue={person} placeholder="Person" maxLength={80} className="h-9 text-[13px]" />
          <Select name="transaction" defaultValue={transaction ?? ""} className="[&_select]:h-9 [&_select]:text-[13px]">
            <option value="">All transaction types</option>
            {TX.map((t) => <option key={t} value={t}>{t.replace("-", " ")}</option>)}
          </Select>
          <Button variant="secondary" className="h-9">Filter</Button>
        </form>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Transactions" value={r.ok ? r.data.length : "—"} />
          <MetricCard label="Open-market purchases" value={buys.length} hint={fmtCompact(sum(buys), { currency: true })} />
          <MetricCard label="Sales" value={sells.length} hint={fmtCompact(sum(sells), { currency: true })} />
          <MetricCard label="Distinct filers" value={r.ok ? new Set(r.data.map((x) => x.person)).size : "—"} />
        </div>
        <Panel className="overflow-hidden">
          {r.ok ? r.data.length ? <InsiderTable rows={r.data} maxHeight={680} /> : <EmptyState title="No filings match these filters" /> : <UnavailableState error={r.error} label="SEC filings" />}
        </Panel>
      </MemberBody>
    </>
  );
}
