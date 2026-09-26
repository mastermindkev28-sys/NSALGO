import { Search } from "lucide-react";
import Link from "next/link";
import { NewsCard } from "@/components/news/news-card";
import { Badge } from "@/components/ui/badge";
import { Change } from "@/components/ui/change";
import { DataSourceBadge, StaleNotice } from "@/components/ui/data-source";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState, UnavailableState } from "@/components/ui/states";
import { db } from "@/db";
import { addDays, currentSessionDate } from "@/lib/market-time";
import { fmtPrice, fmtTimeET, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listEconomicEvents, listNews } from "@/services/intel";
import { getQuotes } from "@/services/market";
import { NEWS_CATEGORIES, type NewsCategory } from "@/types/news";

const LABELS: Record<NewsCategory, string> = {
  breaking: "Breaking",
  markets: "Markets",
  economy: "Economy",
  fed: "Fed",
  earnings: "Earnings",
  technology: "Technology",
  ai: "AI",
  options: "Options",
  macro: "Macro",
  crypto: "Crypto",
};

/** Premium news terminal (public /news and member /dashboard/news share it). */
export async function NewsTerminal({ basePath, category, q, ticker }: { basePath: string; category?: NewsCategory; q?: string; ticker?: string }) {
  const session = currentSessionDate();
  const [feed, all, pulse, events, commentary] = await Promise.all([
    listNews({ category, q, ticker, limit: 40 }),
    listNews({ limit: 100 }),
    getQuotes(["SPY", "QQQ", "IWM", "VIX", "US10Y", "DXY", "GC", "CL", "BTCUSD"]),
    listEconomicEvents(session, addDays(session, 7)),
    db().commentary.list({ status: "published", limit: 2 }),
  ]);

  const mentions = new Map<string, number>();
  const recentMentions = new Map<string, number>();
  if (all.ok) {
    for (const a of all.data) {
      const recent = Date.now() - Date.parse(a.publishedAt) < 6 * 3600_000;
      for (const t of a.tickers) {
        mentions.set(t, (mentions.get(t) ?? 0) + 1);
        if (recent) recentMentions.set(t, (recentMentions.get(t) ?? 0) + 1);
      }
    }
  }
  const trending = [...recentMentions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const mostMentioned = [...mentions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const trendQuotes = await getQuotes(trending.map(([s]) => s));
  const tq = new Map(trendQuotes.ok ? trendQuotes.data.map((x) => [x.symbol, x]) : []);
  const href = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
    return `${basePath}${sp.toString() ? `?${sp}` : ""}`;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[190px_minmax(0,1fr)_300px]">
      {/* LEFT — categories */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="eyebrow mb-2 hidden lg:block">Categories</div>
        <nav className="flex gap-1 overflow-x-auto pb-1 scrollbar-none lg:flex-col lg:gap-0.5" aria-label="News categories">
          <CatLink href={href({ q, ticker })} active={!category} label="All news" />
          {NEWS_CATEGORIES.map((c) => (
            <CatLink key={c} href={href({ category: c, q, ticker })} active={category === c} label={LABELS[c]} dot={c === "breaking"} />
          ))}
        </nav>
      </aside>

      {/* CENTER — feed */}
      <div className="min-w-0 space-y-4">
        <form action={basePath} className="relative">
          {category ? <input type="hidden" name="category" value={category} /> : null}
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-steel-500" />
          <input
            name="q"
            defaultValue={q ?? ticker ?? ""}
            placeholder="Filter headlines or a ticker — e.g. NVDA, Fed, earnings"
            className="h-11 w-full rounded-md border border-line-strong bg-graphite-900 pl-9 pr-3 text-sm text-steel-50 placeholder:text-steel-500 focus:border-polar-500/60 focus:outline-none"
            maxLength={64}
          />
        </form>
        {commentary.length && !category && !q ? (
          <Panel className="border-polar-500/20">
            <PanelHeader eyebrow="NSALGO desk" title={commentary[0]!.title} actions={<Badge size="sm" variant="accent">Commentary</Badge>} />
            <PanelBody className="text-[13.5px] leading-relaxed text-steel-300">
              <p>{commentary[0]!.body}</p>
              <p className="mt-3 text-[11.5px] text-steel-500">
                {commentary[0]!.authorName} · <span suppressHydrationWarning>{timeAgo(commentary[0]!.publishedAt)}</span>
              </p>
            </PanelBody>
          </Panel>
        ) : null}
        <Panel>
          <PanelHeader
            title={category ? LABELS[category] : q ? `Results for “${q}”` : ticker ? `${ticker} news` : "Headline feed"}
            description={feed.ok ? `${feed.data.length} articles · summaries as licensed by the provider; full stories at the publisher` : undefined}
            actions={<DataSourceBadge meta={feed.ok ? feed.meta : null} />}
          />
          {feed.ok ? <StaleNotice meta={feed.meta} /> : null}
          {!feed.ok ? (
            <UnavailableState error={feed.error} label="News provider" />
          ) : !feed.data.length ? (
            <EmptyState title="No articles match" description="Try another category or clear the filter." action={<Link href={basePath} className="text-[13px] text-polar-400">Reset filters</Link>} />
          ) : (
            <div className="divide-y divide-line px-4 sm:px-5">
              {feed.data.map((a) => (
                <NewsCard key={a.id} article={a} hrefBase={basePath} />
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* RIGHT — context */}
      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Panel>
          <PanelHeader title="Market pulse" actions={<DataSourceBadge meta={pulse.ok ? pulse.meta : null} showTime={false} />} />
          {pulse.ok ? (
            <ul className="divide-y divide-line/70 px-4 py-1">
              {pulse.data.map((p) => (
                <li key={p.symbol} className="flex items-center justify-between py-2 text-[12px]">
                  <Link href={`/symbols/${p.symbol}`} className="font-mono tracking-wider text-steel-200 hover:text-chrome">
                    {p.symbol}
                  </Link>
                  <span className="flex items-center gap-3">
                    <span className="num text-steel-100">{p.unit === "pct" ? `${p.last?.toFixed(3)}%` : fmtPrice(p.last)}</span>
                    <Change percent={p.unit === "pct" ? undefined : p.changePercent} value={p.unit === "pct" && p.change !== null ? p.change * 100 : undefined} decimals={p.unit === "pct" ? 1 : 2} size="xs" className={cn("w-20 justify-end", p.unit === "pct" && "after:content-['_bp']")} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <UnavailableState error={pulse.error} compact />
          )}
        </Panel>
        <Panel>
          <PanelHeader title="Trending tickers" description="Most mentioned in the last 6 hours" />
          <ul className="grid grid-cols-2 gap-px bg-line">
            {trending.length ? (
              trending.map(([s, n]) => (
                <li key={s} className="bg-graphite-900">
                  <Link href={href({ ticker: s })} className="flex items-center justify-between px-4 py-2.5 text-[12px] hover:bg-white/[0.02]">
                    <span className="font-mono tracking-wider text-chrome">{s}</span>
                    <span className="flex flex-col items-end">
                      <Change percent={tq.get(s)?.changePercent ?? null} size="xs" />
                      <span className="text-[10px] text-steel-500">{n} mentions</span>
                    </span>
                  </Link>
                </li>
              ))
            ) : (
              <li className="col-span-2 bg-graphite-900 px-4 py-3 text-[12px] text-steel-500">No recent mentions.</li>
            )}
          </ul>
        </Panel>
        <Panel>
          <PanelHeader title="Most mentioned symbols" />
          <PanelBody className="flex flex-wrap gap-1.5">
            {mostMentioned.map(([s, n]) => (
              <Link key={s} href={href({ ticker: s })} className="rounded-xs border border-line px-2 py-1 font-mono text-[11px] text-steel-200 hover:border-line-strong hover:text-chrome">
                {s} <span className="text-steel-500">{n}</span>
              </Link>
            ))}
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHeader title="Economic calendar" description="Next 7 days · ET" actions={<DataSourceBadge meta={events.ok ? events.meta : null} showTime={false} />} />
          {events.ok ? (
            <ul className="divide-y divide-line/70 px-4 py-1">
              {events.data
                .filter((e) => Date.parse(e.datetime) > Date.now() - 3600_000)
                .slice(0, 7)
                .map((e) => (
                  <li key={e.id} className="py-2.5 text-[12px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-steel-100">{e.event}</span>
                      <span className={cn("size-1.5 shrink-0 rounded-full", e.importance === "high" ? "bg-warn" : e.importance === "medium" ? "bg-steel-400" : "bg-graphite-500")} title={`${e.importance} importance`} />
                    </div>
                    <div className="num mt-0.5 text-[11px] text-steel-500">
                      {new Date(e.datetime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/New_York" })} · {fmtTimeET(e.datetime)}
                      {e.forecast ? ` · fcst ${e.forecast}` : ""}
                    </div>
                  </li>
                ))}
            </ul>
          ) : (
            <UnavailableState error={events.error} compact />
          )}
        </Panel>
      </aside>
    </div>
  );
}

function CatLink({ href, active, label, dot }: { href: string; active: boolean; label: string; dot?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-sm px-3 py-2 text-[13px] transition-colors lg:py-1.5",
        active ? "bg-white/[0.06] text-chrome" : "text-steel-400 hover:bg-white/[0.03] hover:text-steel-100",
      )}
    >
      {dot ? <span className="size-1.5 animate-pulse-soft rounded-full bg-down" aria-hidden /> : null}
      {label}
    </Link>
  );
}
