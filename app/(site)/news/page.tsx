import type { Metadata } from "next";
import { Container, PageHero } from "@/components/marketing/section";
import { NewsTerminal } from "@/features/news/news-terminal";
import { NEWS_CATEGORIES, type NewsCategory } from "@/types/news";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Market News",
  description: "Live stock-market, economic, Fed, earnings, technology, AI, options and macro news — organised as a financial news terminal.",
  alternates: { canonical: "/news" },
};

export default async function NewsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const category = NEWS_CATEGORIES.includes(sp.category as NewsCategory) ? (sp.category as NewsCategory) : undefined;
  const q = sp.q?.slice(0, 64) || undefined;
  const ticker = sp.ticker && /^[A-Za-z.]{1,8}$/.test(sp.ticker) ? sp.ticker.toUpperCase() : undefined;
  return (
    <>
      <PageHero eyebrow="News terminal" title="Market news, organized." description="Headlines from licensed feeds, tagged by category, ticker and market impact — with market context alongside." />
      <Container className="py-8">
        <NewsTerminal basePath="/news" category={category} q={q} ticker={ticker} />
      </Container>
    </>
  );
}
