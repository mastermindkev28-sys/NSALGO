import Link from "next/link";
import { CongressTable, InsiderTable, InstitutionalTable } from "@/components/disclosures/tables";
import { DataSourceBadge } from "@/components/ui/data-source";
import { MetricCard } from "@/components/ui/metric";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { UnavailableState } from "@/components/ui/states";
import { fmtCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listCongress, listInsiders, listInstitutional } from "@/services/intel";
import type { InstitutionalCategory } from "@/types/disclosures";

export const WHALE_CATEGORIES: { id: InstitutionalCategory | "all"; label: string }[] = [
  { id: "all", label: "All institutional" },
  { id: "large-options", label: "Large options activity" },
  { id: "13f", label: "13F" },
  { id: "large-equity", label: "Large equity transactions" },
  { id: "large-premium", label: "Large premium" },
  { id: "unusual-options-volume", label: "Unusual options volume" },
];

/** Whale activity: institutional categories plus insider and congressional disclosure summaries. */
export async function WhaleView({ basePath, category, limit, full }: { basePath: string; category?: InstitutionalCategory; limit: number; full: boolean }) {
  const [inst, insiders, congress] = await Promise.all([
    listInstitutional({ category, limit }),
    full ? null : listInsiders({ limit: 8 }),
    full ? null : listCongress({ limit: 8 }),
  ]);
  const total = inst.ok ? inst.data.reduce((a, r) => a + (r.estimatedValue ?? 0), 0) : null;
  const entities = inst.ok ? new Set(inst.data.map((r) => r.entity)).size : null;
  const tickers = inst.ok ? new Set(inst.data.map((r) => r.ticker).filter(Boolean)).size : null;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Records in view" value={inst.ok ? inst.data.length : "—"} />
        <MetricCard label="Estimated value (where reported)" value={fmtCompact(total, { currency: true })} />
        <MetricCard label="Entities" value={entities ?? "—"} />
        <MetricCard label="Tickers" value={tickers ?? "—"} />
      </div>
      <Panel className="overflow-hidden">
        <div className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2 scrollbar-none">
          {WHALE_CATEGORIES.map((c) => {
            const active = (category ?? "all") === c.id;
            return (
              <Link
                key={c.id}
                href={c.id === "all" ? basePath : `${basePath}?category=${c.id}`}
                className={cn("shrink-0 rounded-sm px-3 py-1.5 text-[12.5px]", active ? "bg-white/[0.07] text-chrome" : "text-steel-400 hover:text-steel-100")}
              >
                {c.label}
              </Link>
            );
          })}
          <span className="ml-auto flex shrink-0 items-center pl-3">
            <DataSourceBadge meta={inst.ok ? inst.meta : null} showTime={false} />
          </span>
        </div>
        {inst.ok ? <InstitutionalTable rows={inst.data} maxHeight={full ? 640 : undefined} /> : <UnavailableState error={inst.error} label="Institutional data" />}
        <p className="border-t border-line px-4 py-2.5 text-[11.5px] text-steel-500">
          Only data available from public filings or licensed sources is shown. Large prints are reported as exchange activity and are not attributed to a named firm unless the source does so. 13F data reflects holdings as of quarter end, filed up to 45 days later.
        </p>
      </Panel>
      {insiders && congress ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel className="overflow-hidden">
            <PanelHeader eyebrow="Insider transactions" title="Recent Forms 3/4/5" actions={<Link href="/dashboard/insiders" className="text-[12px] text-steel-400 hover:text-chrome">Full data →</Link>} />
            {insiders.ok ? <InsiderTable rows={insiders.data} compact /> : <UnavailableState error={insiders.error} compact />}
          </Panel>
          <Panel className="overflow-hidden">
            <PanelHeader eyebrow="Congressional disclosures" title="Recent Periodic Transaction Reports" actions={<Link href="/dashboard/congress" className="text-[12px] text-steel-400 hover:text-chrome">Full data →</Link>} />
            {congress.ok ? <CongressTable rows={congress.data} compact /> : <UnavailableState error={congress.error} compact />}
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
