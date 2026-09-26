import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { fmtTimeET, timeAgo, titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NewsArticle } from "@/types/news";

export function ImpactTag({ impact }: { impact: NewsArticle["impact"] }) {
  if (!impact) return null;
  return (
    <Badge variant={impact === "high" ? "warn" : "outline"} size="sm" title="Market impact tag (where available)">
      {impact} impact
    </Badge>
  );
}

/** NewsCard. Links to the NSALGO article page (headline + permitted summary + publisher link). */
export function NewsCard({ article, variant = "row", className, hrefBase = "/news" }: { article: NewsArticle; variant?: "row" | "compact" | "feature"; className?: string; hrefBase?: string }) {
  const href = `${hrefBase}/${encodeURIComponent(article.id)}`;
  if (variant === "compact") {
    return (
      <Link href={href} className={cn("group block py-3", className)}>
        <div className="flex items-center gap-2 text-[11px] text-steel-500">
          {article.isBreaking ? <span className="font-mono uppercase tracking-wider text-down">Breaking</span> : null}
          <span>{article.publisher}</span>
          <span aria-hidden>·</span>
          <time dateTime={article.publishedAt} suppressHydrationWarning>
            {timeAgo(article.publishedAt)}
          </time>
        </div>
        <p className="mt-1 text-[13.5px] leading-snug text-steel-100 transition-colors group-hover:text-chrome">{article.headline}</p>
        {article.tickers.length ? <div className="mt-1.5 flex gap-1.5 font-mono text-[10.5px] text-polar-400">{article.tickers.slice(0, 4).join(" · ")}</div> : null}
      </Link>
    );
  }
  return (
    <article className={cn("group grid gap-4 py-5", variant === "feature" ? "sm:grid-cols-1" : "sm:grid-cols-[1fr_auto]", className)}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-steel-500">
          {article.isBreaking ? <Badge variant="down" size="sm">Breaking</Badge> : null}
          {article.categories
            .filter((c) => c !== "breaking")
            .slice(0, 2)
            .map((c) => (
              <span key={c} className="font-mono uppercase tracking-[0.12em] text-steel-400">
                {c === "ai" ? "AI" : titleCase(c)}
              </span>
            ))}
          <span aria-hidden>·</span>
          <span className="text-steel-300">{article.publisher}</span>
          <span aria-hidden>·</span>
          <time dateTime={article.publishedAt} title={fmtTimeET(article.publishedAt)} suppressHydrationWarning>
            {timeAgo(article.publishedAt)}
          </time>
        </div>
        <Link href={href} className="mt-1.5 block">
          <h3 className={cn("text-steel-50 transition-colors group-hover:text-chrome", variant === "feature" ? "text-xl font-medium leading-snug tracking-[-0.01em]" : "text-[15px] font-medium leading-snug")}>{article.headline}</h3>
        </Link>
        {article.summary ? <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-steel-400">{article.summary}</p> : null}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {article.tickers.slice(0, 5).map((t) => (
            <Link key={t} href={`/symbols/${t}`} className="rounded-xs border border-line px-1.5 py-0.5 font-mono text-[10.5px] text-polar-300 hover:border-polar-500/40">
              {t}
            </Link>
          ))}
          <ImpactTag impact={article.impact} />
          {article.sentiment ? <span className={cn("text-[11px]", article.sentiment === "positive" ? "text-up" : article.sentiment === "negative" ? "text-down" : "text-steel-500")}>{titleCase(article.sentiment)} tone</span> : null}
          {article.url ? (
            <a href={article.url} target="_blank" rel="noopener noreferrer nofollow" className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-steel-400 hover:text-chrome">
              Read at {article.publisher} <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
      </div>
      {article.imageUrl && variant === "row" ? (
        // eslint-disable-next-line @next/next/no-img-element -- publisher-hosted image, dimensions unknown
        <img src={article.imageUrl} alt="" loading="lazy" className="hidden h-20 w-32 rounded-md border border-line object-cover sm:block" />
      ) : null}
    </article>
  );
}
