import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MemberBody } from "@/components/member/page-header";
import { db } from "@/db";
import { Lesson } from "@/features/learn/lesson";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = await db().education.getArticleBySlug(slug);
  return { title: a?.title ?? "Lesson" };
}

export default async function MemberLessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await db().education.getArticleBySlug(slug);
  if (!a || a.status !== "published") notFound();
  return (
    <MemberBody>
      <Lesson article={a} basePath="/dashboard/learn" />
    </MemberBody>
  );
}
