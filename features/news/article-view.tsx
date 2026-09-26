import { ArrowLeft, ExternalLink, Lock } from "lucide-react";
import Link from "next/link";
import { ImpactTag, NewsCard } from "@/components/news/news-card";
import { TrackOnMount } from "@/components/layout/page-view-tracker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Change } from "@/components/ui/change";
import { DataSourceBadge } from "@/components/ui/data-source";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { ScoreRing } from "@/components/ui/score-ring";
import { fmtDateTimeET, fmtPrice, titleCase } from "@/lib/format";
import { symbolIntelligence } from "@/services/atlas/engine";
import { listNews } from "@/services/intel";
import { getQuotes } from "@/services/market";
import type { DataMeta } from "@/types/data";
import type { NewsArticle } from "@/types/news";

/** Article page: headline, permitted summary, publisher link, and the Atlas context for each tagged symbol. */
export async function ArticleView({ article, meta, basePath, member }: { article: NewsArticle; meta: DataMeta; basePath: string; member: boolean }) {
  const tickers = article.tickers.filter((t) => /^[A-Z]{1,5}$/.test(t)).slice(0, 4);
  const [quotes, related, intel] = await Promise.all([
    getQuotes(tickers),
    tickers[0] ? listNews({ ticker: tickers[0], limit: 6 }) : null,
    member && tickers[0] ? symbolIntelligence(tickers[0]) : null,
  ]);
  const swing = intel?.swing?.setup;
  return (
    <div className="mx-auto grid max-w-[1200px] gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <TrackOnMount name="news_article_opened" properties={{ id: article.id, tickers: article.tickers.slice(0, 3) }} />
      <article>
        <Link href={basePath} className="inline-flex items-center gap-1.5 text-[12.5px] text-steel-400 hover:text-chrome">
          <ArrowLeft className="size-3.5" /> News
        </Link>
        <div className="mt-6 flex flex-wrap items-center gap-2 text-[12px] text-steel-500">
          {article.isBreaking ? <Badge variant="down" size="sm">Breaking</Badge> : null}
          {article.categories.filter((c) => c !== "breaking").map((c) => (
            <span key={c} className="font-mono uppercase tracking-[0.12em] text-steel-400">{c === "ai" ? "AI" : titleCase(c)}</span>
          ))}
          <ImpactTag impact={article.impact} />
        </div>
        <h1 className="mt-3 text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-chrome sm:text-[36px]">{article.headline}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-steel-400">
          <span className="text-steel-200">{article.publisher}</span>
          <span aria-hidden>·</span>
          <time dateTime={article.publishedAt}>{fmtDateTimeET(article.publishedAt)}</time>
          <span aria-hidden>·</span>
          <span>via {article.source === "mock" ? "simulated feed" : article.source}</span>
          <DataSourceBadge meta={meta} showTime={false} />
        </div>
        {article.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- publisher-hosted image
          <img src={article.imageUrl} alt="" className="mt-8 aspect-[16/8] w-full rounded-lg border border-line object-cover" />
        ) : null}
        {article.summary ? <p className="mt-8 text-[17px] leading-relaxed text-steel-200">{article.summary}</p> : <p className="mt-8 text-[15px] text-steel-400">The provider supplied no summary for this story.</p>}
        <div className="mt-8 flex flex-wrap items-center gap-3 border-y border-line py-5">
          {article.url ? (
            <Button asChild variant="primary" size="md">
              <a href={article.url} target="_blank" rel="noopener noreferrer nofollow">
                Read the full story at {article.publisher} <ExternalLink />
              </a>
            </Button>
          ) : (
            <span className="text-[13px] text-steel-500">Simulated article — there is no publisher story.</span>
          )}
          <span className="text-[11.5px] text-steel-500">NSALGO displays only the headline and summary permitted by the news licence.</span>
        </div>
        {related?.ok && related.data.filter((r) => r.id !== article.id).length ? (
          <section className="mt-10">
            <h2 className="eyebrow mb-2">More on {tickers[0]}</h2>
            <div className="divide-y divide-line">
              {related.data.filter((r) => r.id !== article.id).slice(0, 4).map((r) => (
                <NewsCard key={r.id} article={r} hrefBase={basePath} />
              ))}
            </div>
          </section>
        ) : null}
      </article>
      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Panel>
          <PanelHeader title="Symbols in this story" />
          {quotes.ok && quotes.data.length ? (
            <ul className="divide-y divide-line/70 px-4 py-1">
              {quotes.data.map((q) => (
                <li key={q.symbol} className="flex items-center justify-between py-2.5">
                  <Link href={member ? `/dashboard/symbol/${q.symbol}` : `/symbols/${q.symbol}`} className="min-w-0">
                    <div className="font-mono text-[13px] tracking-wider text-chrome">{q.symbol}</div>
                    <div className="truncate text-[11px] text-steel-500">{q.name}</div>
                  </Link>
                  <div className="text-right">
                    <div className="num text-[13px] text-steel-50">{fmtPrice(q.last)}</div>
                    <Change percent={q.changePercent} size="xs" />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <PanelBody className="text-[12.5px] text-steel-500">No tradable symbols tagged.</PanelBody>
          )}
        </Panel>
        <Panel>
          <PanelHeader eyebrow="Atlas context" title={tickers[0] ? `${tickers[0]} intelligence` : "Atlas"} />
          <PanelBody>
            {!tickers[0] ? (
              <p className="text-[12.5px] text-steel-500">No symbol to analyse.</p>
            ) : member && swing ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <ScoreRing value={swing.score.value} size={48} coverage={swing.score.coverage} />
                  <div className="text-[12px] text-steel-300">
                    Swing {swing.direction} · coverage {Math.round(swing.score.coverage * 100)}%
                    <div className="text-steel-500">Market regime: {intel?.regime.risk}</div>
                  </div>
                </div>
                <p className="text-[12.5px] leading-relaxed text-steel-300">{swing.explanation.catalystSummary}</p>
                <Button asChild variant="secondary" size="sm" className="w-full">
                  <Link href={`/dashboard/symbol/${tickers[0]}`}>View supporting intelligence</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-[12.5px] text-steel-400">
                  <Lock className="size-3.5" /> Atlas score, catalysts and news-impact context are available to members.
                </p>
                <Button asChild variant="primary" size="sm" className="w-full">
                  <Link href="/pricing">Join NSALGO</Link>
                </Button>
              </div>
            )}
          </PanelBody>
        </Panel>
      </aside>
    </div>
  );
}
