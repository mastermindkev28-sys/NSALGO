import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MemberBody } from "@/components/member/page-header";
import { ArticleView } from "@/features/news/article-view";
import { getArticle } from "@/services/intel";
import { getViewer } from "@/services/membership";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const r = await getArticle(decodeURIComponent(id));
  return { title: r.ok ? r.data.headline : "Article" };
}

export default async function MemberArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r, viewer] = await Promise.all([getArticle(decodeURIComponent(id)), getViewer()]);
  if (!r.ok) notFound();
  return (
    <MemberBody>
      <ArticleView article={r.data} meta={r.meta} basePath="/dashboard/news" member={viewer.paid} />
    </MemberBody>
  );
}
