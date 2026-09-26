import { BookOpen, Search } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/states";
import { db } from "@/db";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Difficulty } from "@/types/domain";

const DIFFS: { id: Difficulty; label: string }[] = [
  { id: "foundational", label: "Foundational" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];

/** Education library — search, categories and difficulty filters. Content is fully CMS-managed. */
export async function Library({ basePath, category, difficulty, q }: { basePath: string; category?: string; difficulty?: Difficulty; q?: string }) {
  const [cats, articles, featured] = await Promise.all([
    db().education.listCategories(),
    db().education.listArticles({ category, difficulty, q }),
    !category && !difficulty && !q ? db().education.listArticles({ featured: true, limit: 2 }) : Promise.resolve([]),
  ]);
  const href = (p: Record<string, string | undefined>) => {
    const sp = new URLSearchParams(Object.entries({ category, difficulty, q, ...p }).filter(([, v]) => v) as [string, string][]);
    return `${basePath}${sp.toString() ? `?${sp}` : ""}`;
  };
  const catName = (slug: string) => cats.find((c) => c.slug === slug)?.name ?? slug;

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
        <form action={basePath} className="relative">
          {category ? <input type="hidden" name="category" value={category} /> : null}
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-steel-500" />
          <input name="q" defaultValue={q} placeholder="Search lessons" maxLength={64} className="h-10 w-full rounded-md border border-line-strong bg-graphite-900 pl-9 pr-3 text-sm text-steel-50 placeholder:text-steel-500 focus:border-polar-500/60 focus:outline-none" />
        </form>
        <div>
          <div className="eyebrow mb-2">Categories</div>
          <nav className="flex flex-wrap gap-1 lg:flex-col lg:gap-0.5">
            <Link href={href({ category: undefined })} className={cn("rounded-sm px-3 py-1.5 text-[13px]", !category ? "bg-white/[0.06] text-chrome" : "text-steel-400 hover:text-steel-100")}>
              All categories
            </Link>
            {cats.map((c) => (
              <Link key={c.slug} href={href({ category: c.slug })} className={cn("rounded-sm px-3 py-1.5 text-[13px]", category === c.slug ? "bg-white/[0.06] text-chrome" : "text-steel-400 hover:text-steel-100")}>
                {c.name}
              </Link>
            ))}
          </nav>
        </div>
        <div>
          <div className="eyebrow mb-2">Difficulty</div>
          <div className="flex flex-wrap gap-1.5">
            {DIFFS.map((d) => (
              <Link key={d.id} href={href({ difficulty: difficulty === d.id ? undefined : d.id })} className={cn("rounded-sm border px-2.5 py-1 text-[12px]", difficulty === d.id ? "border-polar-500/50 bg-polar-500/10 text-polar-300" : "border-line text-steel-400 hover:text-steel-100")}>
                {d.label}
              </Link>
            ))}
          </div>
        </div>
      </aside>
      <div className="min-w-0 space-y-8">
        {featured.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {featured.map((a) => (
              <Link key={a.id} href={`${basePath}/${a.slug}`} className="panel group relative overflow-hidden p-6 transition-colors hover:border-line-strong">
                <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-polar-500/[0.07] blur-2xl" aria-hidden />
                <div className="eyebrow">Featured · {catName(a.categorySlug)}</div>
                <h2 className="mt-8 text-[22px] font-medium leading-tight tracking-[-0.01em] text-chrome">{a.title}</h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-steel-400">{a.description}</p>
                <div className="mt-6 text-[11.5px] text-steel-500">
                  {a.authorName} · {a.readMinutes} min read
                </div>
              </Link>
            ))}
          </div>
        ) : null}
        {!articles.length ? (
          <EmptyState icon={<BookOpen className="size-4" />} title="No lessons match" description="Try another category, difficulty or search term." />
        ) : (
          <div className="divide-y divide-line border-y border-line">
            {articles.map((a) => (
              <Link key={a.id} href={`${basePath}/${a.slug}`} className="group grid gap-2 py-5 sm:grid-cols-[1fr_auto] sm:gap-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-steel-500">
                    <span className="font-mono uppercase tracking-[0.14em] text-steel-400">{catName(a.categorySlug)}</span>
                    <span>·</span>
                    <span>{a.difficulty[0]!.toUpperCase() + a.difficulty.slice(1)}</span>
                  </div>
                  <h3 className="mt-1.5 text-[16px] font-medium text-steel-50 group-hover:text-chrome">{a.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-steel-400">{a.description}</p>
                </div>
                <div className="text-[11.5px] text-steel-500 sm:text-right">
                  <div>{fmtDate(a.publishedAt, true)}</div>
                  <div>{a.readMinutes} min read</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
