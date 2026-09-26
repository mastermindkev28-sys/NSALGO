import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/marketing/section";
import { db } from "@/db";
import { Lesson } from "@/features/learn/lesson";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = await db().education.getArticleBySlug(slug);
  if (!a || a.status !== "published") return { title: "Lesson not found" };
  return {
    title: a.title,
    description: a.description,
    alternates: { canonical: `/learn/${a.slug}` },
    openGraph: { type: "article", title: a.title, description: a.description, publishedTime: a.publishedAt ?? undefined, authors: [a.authorName] },
    twitter: { card: "summary_large_image", title: a.title, description: a.description },
  };
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await db().education.getArticleBySlug(slug);
  if (!a || a.status !== "published") notFound();
  return (
    <Container className="py-10">
      <Lesson article={a} basePath="/learn" />
    </Container>
  );
}
