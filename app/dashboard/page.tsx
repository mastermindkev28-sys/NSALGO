import { ArrowRight, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { RegimeBadge } from "@/components/atlas/primitives";
import { AtlasSetupCard } from "@/components/atlas/setup-card";
import { FlowTable, InstitutionalTable } from "@/components/disclosures/tables";
import { TrackOnMount } from "@/components/layout/page-view-tracker";
import { MemberBody } from "@/components/member/page-header";
import { LiveQuoteGrid } from "@/components/market/live-quote-grid";
import { MoversTable } from "@/components/market/movers-table";
import { NewsCard } from "@/components/news/news-card";
import { Button } from "@/components/ui/button";
import { DataSourceBadge } from "@/components/ui/data-source";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { ScoreRing } from "@/components/ui/score-ring";
import { UnavailableState } from "@/components/ui/states";
import { db } from "@/db";
import { WatchlistSnapshot } from "@/features/dashboard/watchlist-snapshot";
import { fmtTimeET } from "@/lib/format";
import { addDays, currentSessionDate } from "@/lib/market-time";
import { cn } from "@/lib/utils";
import { getMarketContext, scan } from "@/services/atlas/engine";
import { getFlow, listEconomicEvents, listInstitutional, listNews } from "@/services/intel";
import { getMovers, getQuotes, getSparks } from "@/services/market";
import { requireUser } from "@/services/membership";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Overview" };

const INDEX = ["SPY", "QQQ", "IWM", "DIA", "VIX", "US10Y"];

function Locked({ title }: { title: string }) {
  return (
    <Panel className="flex h-full flex-col">
      <PanelHeader title={title} />
      <PanelBody className="flex flex-1 flex-col items-start justify-center gap-3">
        <p className="flex items-center gap-2 text-[12.5px] text-steel-400">
          <Lock className="size-3.5" /> Included with NSALGO membership.
        </p>
        <Button asChild variant="secondary" size="sm">
          <Link href="/signup/plan">Upgrade</Link>
        </Button>
      </PanelBody>
    </Panel>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const viewer = await requireUser("/dashboard");
  const { checkout } = await searchParams;
  const lists = await db().watchlists.list(viewer.user.id);
  const watch = (lists[0]?.items ?? []).slice(0, 8).map((i) => i.symbol);
  const session = currentSessionDate();
  const [ctx, idx, watchQ, sparks, news, events, movers, swing, day, flow, whales] = await Promise.all([
    getMarketContext(),
    getQuotes(INDEX),
    getQuotes(watch),
    getSparks(watch),
    listNews({ limit: 8 }),
    listEconomicEvents(session, addDays(session, 5)),
    getMovers("gainers", 8),
    viewer.paid ? scan("swing") : null,
    viewer.paid ? scan("day") : null,
    viewer.paid ? getFlow({ limit: 8, minPremium: 500_000 }) : null,
    viewer.paid ? listInstitutional({ limit: 6 }) : null,
  ]);
  const top = [...(day?.setups ?? []), ...(swing?.setups ?? [])].sort((a, b) => b.score.value - a.score.value);
  const breaking = news.ok ? (news.data.find((n) => n.isBreaking) ?? news.data[0]) : null;
  const name = viewer.profile?.displayName?.split(" ")[0];
  return (
    <MemberBody>
      {checkout === "success" ? <TrackOnMount name="subscription_created" properties={{ source: "checkout_redirect" }} /> : null}
      {checkout === "success" ? (
        <div className="rounded-md border border-up/25 bg-up-soft px-4 py-3 text-[13px] text-up">
          {viewer.paid ? "Welcome to NSALGO. Your membership is active." : "Payment received — your membership activates as soon as Stripe confirms it (usually within seconds). Refresh shortly."}
        </div>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">Command center</div>
          <h1 className="mt-1.5 text-[24px] font-medium tracking-[-0.015em] text-chrome">{name ? `Good to see you, ${name}.` : "Your market, organized."}</h1>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-steel-400">
          Regime <RegimeBadge regime={ctx.regime} /> <span className="capitalize">{ctx.regime.riskEnvironment}</span>
        </div>
      </div>

      <LiveQuoteGrid initial={idx} symbols={INDEX} className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="overflow-hidden">
          <PanelHeader eyebrow="Watchlist snapshot" title={lists[0]?.name ?? "No watchlist yet"} actions={<Link href="/dashboard/watchlists" className="text-[12px] text-steel-400 hover:text-chrome">Manage →</Link>} />
          <WatchlistSnapshot symbols={watch} initial={watchQ} sparks={sparks} />
        </Panel>
        {viewer.paid ? (
          <Panel>
            <PanelHeader eyebrow="Atlas" title="Highest-ranked setup" actions={<Link href="/dashboard/atlas" className="text-[12px] text-steel-400 hover:text-chrome">Open Atlas →</Link>} />
            <PanelBody>
              {top[0] ? (
                <Link href={`/dashboard/symbol/${top[0].symbol}`} className="flex items-center gap-4">
                  <ScoreRing value={top[0].score.value} size={72} coverage={top[0].score.coverage} />
                  <div>
                    <div className="font-mono text-[20px] tracking-[0.06em] text-chrome">{top[0].symbol}</div>
                    <div className="text-[12.5px] text-steel-400">
                      {top[0].direction === "long" ? "Long" : "Short"} · {top[0].mode === "day" ? "Day trade" : "Swing"} · {top[0].tradeType.replaceAll("-", " ")}
                    </div>
                    <div className="mt-1 line-clamp-2 text-[12px] text-steel-500">{top[0].explanation.whyItAppeared}</div>
                  </div>
                </Link>
              ) : (
                <p className="text-[12.5px] text-steel-500">No setups above threshold right now.</p>
              )}
              <p className="mt-4 text-[10.5px] text-steel-500">{top.length} setups above threshold. Rankings are analytical, not predictive.</p>
            </PanelBody>
          </Panel>
        ) : (
          <Locked title="Atlas score" />
        )}
        <Panel>
          <PanelHeader eyebrow={breaking?.isBreaking ? "Breaking" : "Latest"} title="Top headline" actions={<Link href="/dashboard/news" className="text-[12px] text-steel-400 hover:text-chrome">News →</Link>} />
          <PanelBody>
            {breaking ? (
              <Link href={`/dashboard/news/${encodeURIComponent(breaking.id)}`} className="group block">
                <p className={cn("text-[15px] font-medium leading-snug text-steel-50 group-hover:text-chrome")}>{breaking.headline}</p>
                <p className="mt-2 line-clamp-3 text-[12.5px] text-steel-400">{breaking.summary}</p>
                <p className="mt-2 text-[11px] text-steel-500">{breaking.publisher} · {fmtTimeET(breaking.publishedAt)}</p>
              </Link>
            ) : (
              <p className="text-[12.5px] text-steel-500">News unavailable.</p>
            )}
          </PanelBody>
        </Panel>
      </div>

      {viewer.paid ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-[11px] tracking-[0.28em] text-steel-200">TOP ATLAS SETUPS</h2>
            <Link href="/dashboard/atlas" className="inline-flex items-center gap-1 text-[12px] text-steel-400 hover:text-chrome">All setups <ArrowRight className="size-3.5" /></Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {top.slice(0, 3).map((s, i) => (
              <AtlasSetupCard key={s.id} setup={s} rank={i + 1} href={`/dashboard/symbol/${s.symbol}`} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <Panel>
          <PanelHeader eyebrow="News" title="Market headlines" actions={<DataSourceBadge meta={news.ok ? news.meta : null} showTime={false} />} />
          {news.ok ? (
            <div className="divide-y divide-line px-4">
              {news.data.slice(0, 6).map((a) => (
                <NewsCard key={a.id} article={a} variant="compact" hrefBase="/dashboard/news" />
              ))}
            </div>
          ) : (
            <UnavailableState error={news.error} compact />
          )}
        </Panel>
        <div className="space-y-4">
          <Panel>
            <PanelHeader eyebrow="Economic calendar" title="Next 5 days · ET" actions={<Link href="/dashboard/calendar" className="text-[12px] text-steel-400 hover:text-chrome">Calendar →</Link>} />
            {events.ok ? (
              <ul className="divide-y divide-line/70 px-4">
                {events.data
                  .filter((e) => Date.parse(e.datetime) > Date.now() - 3600_000)
                  .slice(0, 6)
                  .map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-[12.5px]">
                      <span className="flex items-center gap-2">
                        <span className={cn("size-1.5 rounded-full", e.importance === "high" ? "bg-warn" : "bg-steel-500")} title={`${e.importance} importance`} />
                        <span className="text-steel-100">{e.event}</span>
                      </span>
                      <span className="num shrink-0 text-[11px] text-steel-500">{new Date(e.datetime).toLocaleDateString("en-US", { weekday: "short", timeZone: "America/New_York" })} {fmtTimeET(e.datetime)}</span>
                    </li>
                  ))}
              </ul>
            ) : (
              <UnavailableState error={events.error} compact />
            )}
          </Panel>
          {flow ? (
            <Panel className="overflow-hidden">
              <PanelHeader eyebrow="Options flow" title="Large prints" actions={<Link href="/dashboard/flow" className="text-[12px] text-steel-400 hover:text-chrome">Flow →</Link>} />
              {flow.ok ? <FlowTable rows={flow.data} compact /> : <UnavailableState error={flow.error} compact />}
            </Panel>
          ) : (
            <Locked title="Options flow" />
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="overflow-hidden">
          <PanelHeader eyebrow="Market movers" title="Coverage universe" />
          <MoversTable initial={movers} limit={8} linkBase="/dashboard/symbol" />
        </Panel>
        {whales ? (
          <Panel className="overflow-hidden">
            <PanelHeader eyebrow="Whale activity" title="Institutional & large prints" actions={<Link href="/dashboard/whales" className="text-[12px] text-steel-400 hover:text-chrome">Whales →</Link>} />
            {whales.ok ? <InstitutionalTable rows={whales.data} compact /> : <UnavailableState error={whales.error} compact />}
          </Panel>
        ) : (
          <Locked title="Whale activity" />
        )}
      </div>
    </MemberBody>
  );
}
