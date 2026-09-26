import { Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PriceChart } from "@/components/charts/price-chart";
import { FlowTable, InsiderTable } from "@/components/disclosures/tables";
import { Container } from "@/components/marketing/section";
import { NewsCard } from "@/components/news/news-card";
import { LazyTradingViewChart } from "@/components/tradingview/lazy-chart";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState, UnavailableState } from "@/components/ui/states";
import { lookupSymbol } from "@/config/universe";
import { SymbolHeader } from "@/features/symbol/symbol-header";
import { fmtIv } from "@/lib/format";
import { getFlow, getOptionChain, listInsiders, listNews } from "@/services/intel";
import { getHistory, getQuote, getSymbolInfo } from "@/services/market";
import { getViewer } from "@/services/membership";

export const dynamic = "force-dynamic";

const valid = (t: string) => /^[A-Za-z0-9.^-]{1,12}$/.test(t);

export async function generateMetadata({ params }: { params: Promise<{ ticker: string }> }): Promise<Metadata> {
  const { ticker } = await params;
  const sym = ticker.toUpperCase();
  const name = lookupSymbol(sym)?.name ?? sym;
  return {
    title: `${sym} — ${name}`,
    description: `${name} (${sym}) chart, quote, news, options activity, insider transactions and ATLAS intelligence on NSALGO.`,
    alternates: { canonical: `/symbols/${sym}` },
  };
}

export default async function SymbolPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  if (!valid(ticker)) notFound();
  const sym = ticker.toUpperCase();
  const info = await getSymbolInfo(sym);
  if (!info.ok) notFound();
  const [quote, year, news, flow, insiders, chain, viewer] = await Promise.all([
    getQuote(sym),
    getHistory(sym, "1Y", "1d"),
    listNews({ ticker: sym, limit: 8 }),
    getFlow({ symbol: sym, limit: 12 }),
    info.data.assetClass === "equity" ? listInsiders({ ticker: sym, limit: 8 }) : null,
    lookupSymbol(sym)?.optionable ? getOptionChain(sym) : null,
    getViewer(),
  ]);
  const isEquity = info.data.assetClass === "equity" || info.data.assetClass === "etf";
  return (
    <Container className="space-y-6 py-10">
      <SymbolHeader
        info={info.data}
        quote={quote.ok ? quote.data : null}
        meta={quote.ok ? quote.meta : undefined}
        yearBars={year.ok ? year.data : []}
        actions={
          isEquity ? (
            <Button asChild variant={viewer.paid ? "primary" : "secondary"} size="md">
              <Link href={`/dashboard/symbol/${sym}`}>{viewer.paid ? "Open in Atlas" : "Atlas analysis"}</Link>
            </Button>
          ) : null
        }
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel className="overflow-hidden">
          <PanelHeader eyebrow="Chart" title={`${sym} price`} />
          <PriceChart symbol={sym} height={440} defaultIndicators={["sma20", "sma50", "volume", "rsi"]} />
        </Panel>
        <div className="space-y-4">
          <Panel>
            <PanelHeader eyebrow="ATLAS" title="Setup intelligence" />
            <PanelBody className="space-y-3">
              {viewer.paid ? (
                <>
                  <p className="text-[13px] text-steel-300">Day and swing analysis, factor breakdown, options structure and supporting news for {sym}.</p>
                  <Button asChild variant="primary" size="sm" className="w-full">
                    <Link href={`/dashboard/symbol/${sym}`}>View Atlas intelligence</Link>
                  </Button>
                </>
              ) : (
                <>
                  <p className="flex items-start gap-2 text-[13px] text-steel-400">
                    <Lock className="mt-0.5 size-3.5 shrink-0" /> Atlas score, entry and invalidation levels, options structure and AI explanation are available to members.
                  </p>
                  <Button asChild variant="primary" size="sm" className="w-full">
                    <Link href="/pricing">Join NSALGO</Link>
                  </Button>
                </>
              )}
            </PanelBody>
          </Panel>
          {chain ? (
            <Panel>
              <PanelHeader eyebrow="Options" title="Front-month snapshot" />
              {chain.ok ? (
                <PanelBody className="grid grid-cols-2 gap-4 text-[12px]">
                  <div>
                    <div className="text-steel-500">ATM implied vol</div>
                    <div className="num mt-0.5 text-[15px] text-steel-50">{fmtIv(chain.data.atmIv)}</div>
                  </div>
                  <div>
                    <div className="text-steel-500">IV rank</div>
                    <div className="num mt-0.5 text-[15px] text-steel-50">{chain.data.ivRank ?? "n/a"}</div>
                  </div>
                  <div>
                    <div className="text-steel-500">Expirations listed</div>
                    <div className="num mt-0.5 text-[15px] text-steel-50">{chain.data.expirations.length}</div>
                  </div>
                  <div>
                    <div className="text-steel-500">Front expiry</div>
                    <div className="num mt-0.5 text-[15px] text-steel-50">{chain.data.expiration}</div>
                  </div>
                </PanelBody>
              ) : (
                <UnavailableState error={chain.error} compact />
              )}
            </Panel>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader eyebrow="News" title={`Latest on ${sym}`} actions={<Link href={`/news?ticker=${sym}`} className="text-[12px] text-steel-400 hover:text-chrome">All →</Link>} />
          {news.ok ? (
            news.data.length ? (
              <div className="divide-y divide-line px-4">
                {news.data.slice(0, 5).map((a) => (
                  <NewsCard key={a.id} article={a} variant="compact" />
                ))}
              </div>
            ) : (
              <EmptyState title="No recent coverage" />
            )
          ) : (
            <UnavailableState error={news.error} compact />
          )}
        </Panel>
        <Panel className="overflow-hidden">
          <PanelHeader eyebrow="Options activity" title="Recent large prints" />
          {flow.ok ? flow.data.length ? <FlowTable rows={flow.data} compact /> : <EmptyState title="No large prints today" /> : <UnavailableState error={flow.error} compact />}
        </Panel>
      </div>
      {insiders ? (
        <Panel className="overflow-hidden">
          <PanelHeader eyebrow="Insider transactions" title={`Section 16 filings · ${sym}`} />
          {insiders.ok ? insiders.data.length ? <InsiderTable rows={insiders.data} /> : <EmptyState title="No recent filings" /> : <UnavailableState error={insiders.error} compact />}
        </Panel>
      ) : null}
      <Panel className="overflow-hidden">
        <PanelHeader eyebrow="TradingView" title="Advanced chart" />
        <LazyTradingViewChart symbol={sym} />
      </Panel>
    </Container>
  );
}
