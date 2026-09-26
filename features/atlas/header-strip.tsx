import { RegimeBadge } from "@/components/atlas/primitives";
import { AtlasWordmark } from "@/components/brand/logo";
import { Change } from "@/components/ui/change";
import { DataSourceBadge } from "@/components/ui/data-source";
import { fmtPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MarketContext } from "@/services/atlas/engine";
import type { MarketStatus } from "@/types/market";

/** ATLAS MARKET INTELLIGENCE header: status, SPY, QQQ, VIX, regime, risk environment, breadth, volatility. */
export function AtlasHeaderStrip({ ctx, status }: { ctx: MarketContext; status: MarketStatus | null }) {
  const q = (s: string) => ctx.quotes.find((x) => x.symbol === s);
  const spy = q("SPY");
  const qqq = q("QQQ");
  const vix = q("VIX");
  const b = ctx.breadth;
  const cells: { label: string; value: React.ReactNode; sub?: React.ReactNode }[] = [
    { label: "Market status", value: <span className="flex items-center gap-1.5"><span className={cn("size-1.5 rounded-full", status?.state === "open" ? "animate-pulse-soft bg-up" : "bg-steel-500")} />{status?.label ?? "—"}</span> },
    { label: "SPY", value: fmtPrice(spy?.last), sub: <Change percent={spy?.changePercent ?? null} size="xs" /> },
    { label: "QQQ", value: fmtPrice(qqq?.last), sub: <Change percent={qqq?.changePercent ?? null} size="xs" /> },
    { label: "VIX", value: fmtPrice(vix?.last), sub: <Change percent={vix?.changePercent ?? null} size="xs" /> },
    { label: "Market regime", value: <RegimeBadge regime={ctx.regime} />, sub: <span className="text-[11px] text-steel-500">{ctx.regime.structure === "trend" ? "Trending" : "Range-bound"}</span> },
    { label: "Risk environment", value: <span className="capitalize">{ctx.regime.riskEnvironment}</span> },
    { label: "Breadth", value: b?.advancers != null && b.decliners != null ? `${b.advancers} / ${b.decliners}` : "—", sub: <span className="text-[11px] text-steel-500">adv / dec</span> },
    { label: "Volatility", value: <span className="capitalize">{ctx.regime.volatility.replace("-volatility", "")}</span> },
  ];
  return (
    <div className="border-b border-line bg-graphite-950/60">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <AtlasWordmark />
          <span className="h-3 w-px bg-line-strong" aria-hidden />
          <h1 className="font-mono text-[11px] tracking-[0.3em] text-steel-400">MARKET INTELLIGENCE</h1>
        </div>
        <DataSourceBadge meta={{ mode: ctx.dataMode === "mock" ? "mock" : ctx.dataMode, sourceLabel: "Configured providers" }} showTime={false} />
      </div>
      <dl className="grid grid-cols-2 gap-px px-4 py-4 sm:grid-cols-4 sm:px-6 lg:px-8 xl:grid-cols-8">
        {cells.map((c) => (
          <div key={c.label} className="min-w-0 py-1.5 pr-3">
            <dt className="text-[10.5px] uppercase tracking-[0.12em] text-steel-500">{c.label}</dt>
            <dd className="num mt-1 truncate text-[14px] text-steel-50">{c.value}</dd>
            {c.sub ? <dd className="mt-0.5">{c.sub}</dd> : null}
          </div>
        ))}
      </dl>
      {ctx.unavailable.length ? (
        <p className="border-t border-line px-4 py-2 text-[11.5px] text-warn sm:px-6 lg:px-8">
          Unavailable inputs: {ctx.unavailable.join(", ")}. Atlas is scoring with the remaining data and reports coverage on every setup.
        </p>
      ) : null}
    </div>
  );
}
