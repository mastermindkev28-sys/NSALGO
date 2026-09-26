import { ChartSwitcher } from "@/components/charts/chart-switcher";
import { BreadthPanel } from "@/components/market/breadth-panel";
import { LiveQuoteGrid } from "@/components/market/live-quote-grid";
import { MoversTable } from "@/components/market/movers-table";
import { SectorHeatmap } from "@/components/market/sector-heatmap";
import { DataSourceBadge } from "@/components/ui/data-source";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { UnavailableState } from "@/components/ui/states";
import { MARKET_GROUPS, lookupSymbol } from "@/config/universe";
import { getBreadth, getMovers, getQuotes, getSectors, getSparks } from "@/services/market";

/** Market overview modules — shared by the public Markets page and member Market Data. */
export async function MarketOverview({ memberLinks = false }: { memberLinks?: boolean }) {
  const all = MARKET_GROUPS.flatMap((g) => g.symbols);
  const [quotes, sparks, sectors, breadth, movers] = await Promise.all([getQuotes(all), getSparks(all), getSectors(), getBreadth(), getMovers("gainers", 12)]);
  const labels = Object.fromEntries(all.map((s) => [s, lookupSymbol(s)?.name.replace(/ (Futures|Index|Treasury Yield)$/, "") ?? s]));

  return (
    <div className="space-y-10">
      <nav className="-mt-2 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none" aria-label="Market sections">
        {[...MARKET_GROUPS.map((g) => ({ id: g.id, title: g.title })), { id: "sectors", title: "Sectors" }, { id: "breadth", title: "Market Breadth" }, { id: "movers", title: "Movers" }].map((g) => (
          <a key={g.id} href={`#${g.id}`} className="shrink-0 rounded-sm border border-line px-3 py-1.5 text-[12px] text-steel-300 hover:border-line-strong hover:text-chrome">
            {g.title}
          </a>
        ))}
      </nav>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Panel className="overflow-hidden">
          <PanelHeader eyebrow="Interactive chart" title="Index ETFs" />
          <ChartSwitcher symbols={["SPY", "QQQ", "IWM", "DIA"]} height={380} />
        </Panel>
        <div className="space-y-6">
          {MARKET_GROUPS.filter((g) => g.id === "indices").map((g) => (
            <GroupBlock key={g.id} id={g.id} title={g.title} meta={quotes.ok ? quotes.meta : null}>
              <LiveQuoteGrid initial={quotes} symbols={g.symbols} labels={labels} sparks={sparks} className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-2" />
            </GroupBlock>
          ))}
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        {MARKET_GROUPS.filter((g) => g.id !== "indices").map((g) => (
          <GroupBlock key={g.id} id={g.id} title={g.title} meta={quotes.ok ? quotes.meta : null}>
            <LiveQuoteGrid initial={quotes} symbols={g.symbols} labels={labels} sparks={sparks} className="grid-cols-2 sm:grid-cols-3" />
          </GroupBlock>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel id="sectors" className="scroll-mt-24">
          <PanelHeader eyebrow="Sectors" title="S&P sector ETFs · change and relative strength" actions={<DataSourceBadge meta={sectors.ok ? sectors.meta : null} showTime={false} />} />
          <PanelBody>{sectors.ok ? <SectorHeatmap sectors={sectors.data} /> : <UnavailableState error={sectors.error} />}</PanelBody>
        </Panel>
        <Panel id="breadth" className="scroll-mt-24">
          <PanelHeader eyebrow="Market breadth" title="Participation" actions={<DataSourceBadge meta={breadth.ok ? breadth.meta : null} showTime={false} />} />
          <PanelBody>{breadth.ok ? <BreadthPanel breadth={breadth.data} /> : <UnavailableState error={breadth.error} />}</PanelBody>
        </Panel>
      </div>

      <Panel id="movers" className="scroll-mt-24 overflow-hidden">
        <PanelHeader eyebrow="Market movers" title="Gainers, losers, most active and unusual volume" description="Computed over the NSALGO coverage universe." actions={<DataSourceBadge meta={movers.ok ? movers.meta : null} showTime={false} />} />
        <MoversTable initial={movers} limit={12} linkBase={memberLinks ? "/dashboard/symbol" : "/symbols"} />
      </Panel>
    </div>
  );
}

function GroupBlock({ id, title, meta, children }: { id: string; title: string; meta: Parameters<typeof DataSourceBadge>[0]["meta"]; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-mono text-[11px] tracking-[0.28em] text-steel-200 uppercase">{title}</h2>
        <DataSourceBadge meta={meta} showTime={false} />
      </div>
      {children}
    </section>
  );
}
