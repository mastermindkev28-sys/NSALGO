import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/marketing/section";
import { ArticleView } from "@/features/news/article-view";
import { getArticle } from "@/services/intel";
import { getViewer } from "@/services/membership";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const r = await getArticle(decodeURIComponent(id));
  if (!r.ok) return { title: "Article not found" };
  return {
    title: r.data.headline,
    description: r.data.summary ?? `${r.data.publisher} — ${r.data.headline}`,
    alternates: { canonical: `/news/${encodeURIComponent(r.data.id)}` },
    openGraph: { type: "article", title: r.data.headline, description: r.data.summary ?? undefined, publishedTime: r.data.publishedAt },
    robots: r.meta.mode === "mock" ? { index: false } : undefined,
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r, viewer] = await Promise.all([getArticle(decodeURIComponent(id)), getViewer()]);
  if (!r.ok) notFound();
  return (
    <Container className="py-10">
      <ArticleView article={r.data} meta={r.meta} basePath="/news" member={viewer.paid} />
    </Container>
  );
}
