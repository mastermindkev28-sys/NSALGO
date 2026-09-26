import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TrackOnMount } from "@/components/layout/page-view-tracker";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { db } from "@/db";
import { fmtDate } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import type { EducationArticle } from "@/types/domain";
import { SITE } from "@/config/site";

export async function Lesson({ article, basePath }: { article: EducationArticle; basePath: string }) {
  const [cats, related] = await Promise.all([
    db().education.listCategories(),
    Promise.all(article.relatedSlugs.map((s) => db().education.getArticleBySlug(s))).then((r) => r.filter((x): x is EducationArticle => !!x && x.status === "published")),
  ]);
  const more = related.length ? related : await db().education.listArticles({ category: article.categorySlug, limit: 4 }).then((r) => r.filter((x) => x.id !== article.id).slice(0, 3));
  const cat = cats.find((c) => c.slug === article.categorySlug);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    author: { "@type": "Organization", name: article.authorName },
    publisher: { "@type": "Organization", name: "NSALGO" },
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    mainEntityOfPage: `${SITE.url}/learn/${article.slug}`,
    articleSection: cat?.name,
  };
  return (
    <div className="mx-auto grid max-w-[1100px] gap-10 lg:grid-cols-[minmax(0,1fr)_260px]">
      <TrackOnMount name="education_article_opened" properties={{ slug: article.slug, category: article.categorySlug }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <article className="min-w-0">
        <Link href={basePath} className="inline-flex items-center gap-1.5 text-[12.5px] text-steel-400 hover:text-chrome">
          <ArrowLeft className="size-3.5" /> Library
        </Link>
        <div className="eyebrow mt-8">{cat?.name ?? article.categorySlug} · {article.difficulty}</div>
        <h1 className="mt-3 text-[32px] font-medium leading-[1.1] tracking-[-0.02em] text-chrome sm:text-[42px]">{article.title}</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-steel-300">{article.description}</p>
        <div className="mt-6 flex flex-wrap gap-x-3 gap-y-1 border-b border-line pb-6 text-[12.5px] text-steel-500">
          <span className="text-steel-300">{article.authorName}</span>
          <span>·</span>
          <span>{fmtDate(article.publishedAt, true)}</span>
          <span>·</span>
          <span>{article.readMinutes} min read</span>
        </div>
        {article.featuredImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- CMS-provided image URL
          <img src={article.featuredImage} alt="" className="mt-8 w-full rounded-lg border border-line" />
        ) : null}
        <div className="prose-nsalgo mt-6">{renderMarkdown(article.content)}</div>
        <p className="mt-12 border-t border-line pt-6 text-[12px] leading-relaxed text-steel-500">
          Educational content only — not investment advice. Examples are illustrative and do not describe any specific recommendation.
        </p>
      </article>
      <aside className="lg:sticky lg:top-20 lg:self-start">
        {more.length ? (
          <Panel>
            <PanelHeader title="Related content" />
            <ul className="divide-y divide-line/70 px-4">
              {more.map((r) => (
                <li key={r.id}>
                  <Link href={`${basePath}/${r.slug}`} className="block py-3">
                    <div className="text-[13px] font-medium leading-snug text-steel-100 hover:text-chrome">{r.title}</div>
                    <div className="mt-0.5 text-[11px] text-steel-500">{r.readMinutes} min read</div>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}
      </aside>
    </div>
  );
}
