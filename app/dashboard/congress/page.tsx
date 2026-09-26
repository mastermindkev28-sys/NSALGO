import type { Metadata } from "next";
import { CongressTable } from "@/components/disclosures/tables";
import { MembershipGate } from "@/components/member/membership-gate";
import { MemberBody, MemberPageHeader } from "@/components/member/page-header";
import { Button } from "@/components/ui/button";
import { DataSourceBadge } from "@/components/ui/data-source";
import { Input, Select } from "@/components/ui/controls";
import { MetricCard } from "@/components/ui/metric";
import { Panel } from "@/components/ui/panel";
import { EmptyState, UnavailableState } from "@/components/ui/states";
import { listCongress } from "@/services/intel";
import { getViewer } from "@/services/membership";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Congressional Disclosures" };

export default async function CongressPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const viewer = await getViewer();
  if (!viewer.paid) return <MembershipGate feature="Congressional disclosures" />;
  const sp = await searchParams;
  const chamber = sp.chamber === "house" || sp.chamber === "senate" ? sp.chamber : undefined;
  const ticker = sp.ticker && /^[A-Za-z.]{1,8}$/.test(sp.ticker) ? sp.ticker.toUpperCase() : undefined;
  const person = sp.person?.slice(0, 80) || undefined;
  const transaction = ["purchase", "sale", "partial-sale", "exchange"].includes(sp.transaction ?? "") ? sp.transaction : undefined;
  const since = sp.since && /^\d{4}-\d{2}-\d{2}$/.test(sp.since) ? sp.since : undefined;
  const r = await listCongress({ chamber, ticker, person, transaction, since, limit: 400 });
  return (
    <>
      <MemberPageHeader
        eyebrow="Public disclosures"
        title="Congressional disclosures"
        description="Public-official transaction disclosures (STOCK Act Periodic Transaction Reports). Values are reported in statutory ranges and may belong to a spouse or dependent. A disclosure records that a transaction occurred — it does not imply wrongdoing."
        actions={<DataSourceBadge meta={r.ok ? r.meta : null} />}
      />
      <MemberBody>
        <form className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6" action="/dashboard/congress">
          <Select name="chamber" defaultValue={chamber ?? ""} className="[&_select]:h-9 [&_select]:text-[13px]">
            <option value="">House & Senate</option>
            <option value="house">House</option>
            <option value="senate">Senate</option>
          </Select>
          <Input name="person" defaultValue={person} placeholder="Representative / Senator" maxLength={80} className="h-9 text-[13px]" />
          <Input name="ticker" defaultValue={ticker} placeholder="Ticker" maxLength={8} className="h-9 text-[13px]" />
          <Select name="transaction" defaultValue={transaction ?? ""} className="[&_select]:h-9 [&_select]:text-[13px]">
            <option value="">All transactions</option>
            <option value="purchase">Purchase</option>
            <option value="sale">Sale</option>
            <option value="partial-sale">Partial sale</option>
            <option value="exchange">Exchange</option>
          </Select>
          <Input name="since" type="date" defaultValue={since} className="h-9 text-[13px]" aria-label="Disclosed since" />
          <Button variant="secondary" className="h-9">Filter</Button>
        </form>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Disclosures" value={r.ok ? r.data.length : "—"} />
          <MetricCard label="Purchases" value={r.ok ? r.data.filter((x) => x.transaction === "purchase").length : "—"} />
          <MetricCard label="Sales" value={r.ok ? r.data.filter((x) => x.transaction !== "purchase" && x.transaction !== "exchange").length : "—"} />
          <MetricCard label="Members" value={r.ok ? new Set(r.data.map((x) => x.member)).size : "—"} />
        </div>
        <Panel className="overflow-hidden">
          {r.ok ? r.data.length ? <CongressTable rows={r.data} maxHeight={680} /> : <EmptyState title="No disclosures match these filters" /> : <UnavailableState error={r.error} label="Disclosure feed" />}
        </Panel>
      </MemberBody>
    </>
  );
}
