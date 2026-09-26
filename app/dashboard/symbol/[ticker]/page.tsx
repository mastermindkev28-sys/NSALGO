import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FlowTable, InsiderTable } from "@/components/disclosures/tables";
import { DirectionBadge, RegimeBadge } from "@/components/atlas/primitives";
import { AlertButton } from "@/components/member/alert-button";
import { MembershipGate } from "@/components/member/membership-gate";
import { MemberBody } from "@/components/member/page-header";
import { WatchButton } from "@/components/member/watch-button";
import { NewsCard } from "@/components/news/news-card";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { ScoreRing } from "@/components/ui/score-ring";
import { EmptyState, UnavailableState } from "@/components/ui/states";
import { SymbolModeTabs } from "@/features/symbol/mode-tabs";
import { SymbolHeader } from "@/features/symbol/symbol-header";
import { fmtDate } from "@/lib/format";
import { addDays } from "@/lib/market-time";
import { cn } from "@/lib/utils";
import { symbolIntelligence, type Analysis } from "@/services/atlas/engine";
import { getFlow, listEarnings, listInsiders, listNews } from "@/services/intel";
import { getHistory, getQuote, getSymbolInfo } from "@/services/market";
import { getViewer } from "@/services/membership";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ ticker: string }> }): Promise<Metadata> {
  const { ticker } = await params;
  return { title: `${ticker.toUpperCase()} · Atlas intelligence` };
}

function Reading({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "good" | "bad" | "neutral" }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-[12.5px]">
      <span className="text-steel-400">{label}</span>
      <span className={cn("text-right capitalize", tone === "good" ? "text-up" : tone === "bad" ? "text-down" : "text-steel-100")}>{value}</span>
    </div>
  );
}

function ModeSummary({ a, label }: { a: Analysis | null; label: string }) {
  if (!a) return <Panel><PanelBody className="text-[12.5px] text-steel-500">{label}: analysis unavailable for this symbol.</PanelBody></Panel>;
  const s = a.setup;
  const f = (k: string) => s.score.components.find((c) => c.key === k);
  const word = (k: string) => {
    const c = f(k);
    if (!c || c.score === null) return { v: "Data unavailable", t: "neutral" as const };
    return c.score >= 67 ? { v: "Strong", t: "good" as const } : c.score >= 50 ? { v: "Moderate", t: "neutral" as const } : { v: "Weak", t: "bad" as const };
  };
  const opt = f("optionsFlow");
  return (
    <Panel>
      <PanelHeader
        eyebrow={label}
        title={
          <span className="flex items-center gap-2">
            <DirectionBadge direction={s.direction} />
            {a.qualifies ? <Badge size="sm" variant="accent">Above threshold</Badge> : <Badge size="sm" variant="outline">Below threshold</Badge>}
          </span>
        }
        actions={<ScoreRing value={s.score.value} size={52} coverage={s.score.coverage} />}
      />
      <PanelBody className="divide-y divide-line/60 py-2">
        <Reading label="Momentum" value={word("momentum").v} tone={word("momentum").t} />
        <Reading label="Volume" value={s.volumeState} tone={s.volumeState === "elevated" ? "good" : "neutral"} />
        <Reading label="Sector strength" value={word("sectorStrength").v} tone={word("sectorStrength").t} />
        <Reading label="Options activity" value={opt?.score == null ? "Data unavailable" : opt.score >= 60 ? "Elevated, supportive" : opt.score <= 40 ? "Leaning against" : "Balanced"} tone={opt?.score == null ? "neutral" : opt.score >= 60 ? "good" : opt.score <= 40 ? "bad" : "neutral"} />
        <Reading label="Catalyst" value={<span className="normal-case">{s.catalysts.filter((c) => c.kind !== "economic-event")[0]?.label ?? "None identified"}</span>} />
        <Reading label="Market alignment" value={s.marketAlignment} tone={s.marketAlignment === "aligned" ? "good" : s.marketAlignment === "counter" ? "bad" : "neutral"} />
      </PanelBody>
    </Panel>
  );
}

export default async function SymbolIntelPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  if (!/^[A-Za-z0-9.^-]{1,12}$/.test(ticker)) notFound();
  const sym = ticker.toUpperCase();
  const viewer = await getViewer();
  const info = await getSymbolInfo(sym);
  if (!info.ok) notFound();
  const [quote, year] = await Promise.all([getQuote(sym), getHistory(sym, "1Y", "1d")]);
  const header = (
    <SymbolHeader
      info={info.data}
      quote={quote.ok ? quote.data : null}
      meta={quote.ok ? quote.meta : undefined}
      yearBars={year.ok ? year.data : []}
      actions={
        <>
          <WatchButton symbol={sym} />
          {viewer.paid ? <AlertButton symbol={sym} price={quote.ok ? quote.data.last : null} /> : null}
        </>
      }
    />
  );
  if (!viewer.paid) {
    return (
      <MemberBody>
        {header}
        <MembershipGate feature={`Atlas intelligence for ${sym}`} />
      </MemberBody>
    );
  }
  const today = new Date().toISOString().slice(0, 10);
  const [intel, news, flow, insiders, earnings] = await Promise.all([
    symbolIntelligence(sym),
    listNews({ ticker: sym, limit: 12 }),
    getFlow({ symbol: sym, limit: 30 }),
    info.data.assetClass === "equity" ? listInsiders({ ticker: sym, limit: 12 }) : null,
    listEarnings(today, addDays(today, 60), [sym]),
  ]);
  return (
    <MemberBody>
      {header}
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_320px]">
        <ModeSummary a={intel.swing} label="Swing analysis" />
        <ModeSummary a={intel.day} label="Day-trade analysis" />
        <Panel>
          <PanelHeader eyebrow="Context" title="Market & events" />
          <PanelBody className="space-y-3 text-[12.5px]">
            <div className="flex items-center justify-between">
              <span className="text-steel-400">Market regime</span>
              <RegimeBadge regime={intel.regime} />
            </div>
            <p className="text-steel-400">{intel.regime.summary}</p>
            <div className="border-t border-line pt-3">
              <div className="mb-1 text-steel-400">Next earnings</div>
              {earnings.ok ? (
                earnings.data[0] ? (
                  <div className="text-steel-100">
                    {fmtDate(earnings.data[0].date, true)} · {earnings.data[0].time === "bmo" ? "before open" : earnings.data[0].time === "amc" ? "after close" : "time TBA"}
                  </div>
                ) : (
                  <div className="text-steel-500">None scheduled in the next 60 days</div>
                )
              ) : (
                <div className="text-steel-500">Earnings calendar unavailable</div>
              )}
            </div>
          </PanelBody>
        </Panel>
      </div>
      <SymbolModeTabs swing={intel.swing?.setup ?? null} day={intel.day?.setup ?? null} />
      <h2 id="supporting" className="pt-2 font-mono text-[11px] tracking-[0.28em] text-steel-200">SUPPORTING INTELLIGENCE</h2>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <PanelHeader eyebrow="Relevant news" title={`Coverage tagged ${sym}`} />
          {news.ok ? (
            news.data.length ? (
              <div className="divide-y divide-line px-4">
                {news.data.slice(0, 6).map((a) => (
                  <NewsCard key={a.id} article={a} variant="compact" hrefBase="/dashboard/news" />
                ))}
              </div>
            ) : (
              <EmptyState title="No recent coverage" className="py-8" />
            )
          ) : (
            <UnavailableState error={news.error} compact />
          )}
        </Panel>
        <Panel className="overflow-hidden">
          <PanelHeader eyebrow="Options flow" title={`${sym} large prints`} />
          {flow.ok ? flow.data.length ? <FlowTable rows={flow.data} compact maxHeight={420} /> : <EmptyState title="No large prints today" className="py-8" /> : <UnavailableState error={flow.error} compact />}
        </Panel>
      </div>
      {insiders ? (
        <Panel className="overflow-hidden">
          <PanelHeader eyebrow="Insider activity" title={`Forms 3/4/5 · ${sym}`} />
          {insiders.ok ? insiders.data.length ? <InsiderTable rows={insiders.data} /> : <EmptyState title="No recent insider filings" className="py-8" /> : <UnavailableState error={insiders.error} compact />}
        </Panel>
      ) : null}
    </MemberBody>
  );
}
