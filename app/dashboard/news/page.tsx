import type { Metadata } from "next";
import { MemberBody, MemberPageHeader } from "@/components/member/page-header";
import { NewsTerminal } from "@/features/news/news-terminal";
import { NEWS_CATEGORIES, type NewsCategory } from "@/types/news";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "News Feed" };

export default async function MemberNewsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const category = NEWS_CATEGORIES.includes(sp.category as NewsCategory) ? (sp.category as NewsCategory) : undefined;
  const ticker = sp.ticker && /^[A-Za-z.]{1,8}$/.test(sp.ticker) ? sp.ticker.toUpperCase() : undefined;
  return (
    <>
      <MemberPageHeader eyebrow="News" title="News feed" description="Licensed headlines with category, ticker, sentiment and market-impact context." />
      <MemberBody>
        <NewsTerminal basePath="/dashboard/news" category={category} q={sp.q?.slice(0, 64) || undefined} ticker={ticker} />
      </MemberBody>
    </>
  );
}
