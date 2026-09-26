import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody } from "@/components/ui/panel";
import { db } from "@/db";
import { deleteArticleAction } from "@/features/admin/actions";
import { ArticleEditor } from "@/features/admin/article-editor";
import { requirePermission } from "@/services/membership";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit article" };

export default async function EditArticle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  await requirePermission("education.manage");
  const { id } = await params;
  const { created } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [a, cats] = await Promise.all([db().education.getArticleById(id), db().education.listCategories()]);
  if (!a) notFound();
  return (
    <>
      <AdminHeader
        title={a.title}
        description={`/learn/${a.slug}`}
        actions={
          <div className="flex gap-2">
            {a.status === "published" ? <Button asChild size="sm" variant="ghost"><Link href={`/learn/${a.slug}`} target="_blank">View live ↗</Link></Button> : null}
            <form action={deleteArticleAction}>
              <input type="hidden" name="id" value={a.id} />
              <Button size="sm" variant="danger">Delete</Button>
            </form>
          </div>
        }
      />
      {created ? <p className="rounded-md border border-up/25 bg-up-soft px-4 py-2.5 text-[13px] text-up">Article created.</p> : null}
      <Panel><PanelBody><ArticleEditor article={a} categories={cats} /></PanelBody></Panel>
    </>
  );
}
