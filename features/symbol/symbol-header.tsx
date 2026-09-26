import { Badge } from "@/components/ui/badge";
import { Change } from "@/components/ui/change";
import { DataSourceBadge } from "@/components/ui/data-source";
import { Stat } from "@/components/ui/metric";
import { fmtCompact, fmtPrice, fmtQuote } from "@/lib/format";
import type { DataMeta } from "@/types/data";
import type { Bar, Quote, SymbolInfo } from "@/types/market";

export function SymbolHeader({ info, quote, meta, yearBars, actions }: { info: SymbolInfo; quote: Quote | null; meta?: DataMeta; yearBars: Bar[]; actions?: React.ReactNode }) {
  const hi52 = yearBars.length ? Math.max(...yearBars.map((b) => b.high)) : null;
  const lo52 = yearBars.length ? Math.min(...yearBars.map((b) => b.low)) : null;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-[30px] font-medium tracking-[0.06em] text-chrome">{info.symbol}</h1>
            <Badge variant="outline" size="sm">{info.exchange}</Badge>
            <Badge variant="outline" size="sm">{info.assetClass}</Badge>
            {info.sector ? <Badge size="sm">{info.sector}</Badge> : null}
          </div>
          <p className="mt-1 text-[14px] text-steel-400">{info.name}</p>
          <div className="mt-4 flex flex-wrap items-baseline gap-4">
            <span className="num text-[40px] font-medium tracking-[-0.03em] text-chrome">{fmtQuote(quote?.last ?? null, quote?.unit)}</span>
            {quote ? <Change value={quote.change} percent={quote.changePercent} size="md" /> : null}
            <DataSourceBadge meta={meta} />
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="grid grid-cols-3 gap-4 border-y border-line py-4 sm:grid-cols-4 lg:grid-cols-8">
        <Stat label="Open" value={fmtPrice(quote?.open)} />
        <Stat label="High" value={fmtPrice(quote?.high)} />
        <Stat label="Low" value={fmtPrice(quote?.low)} />
        <Stat label="Prev close" value={fmtPrice(quote?.prevClose)} />
        <Stat label="Volume" value={fmtCompact(quote?.volume)} />
        <Stat label="Avg volume" value={fmtCompact(quote?.avgVolume)} />
        <Stat label="52-wk range" value={hi52 !== null && lo52 !== null ? `${fmtPrice(lo52)} – ${fmtPrice(hi52)}` : "—"} />
        <Stat label="Market cap" value={fmtCompact(info.marketCap ?? null, { currency: true })} />
      </div>
    </div>
  );
}
