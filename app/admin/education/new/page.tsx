import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/admin-header";
import { Panel, PanelBody } from "@/components/ui/panel";
import { db } from "@/db";
import { ArticleEditor } from "@/features/admin/article-editor";
import { requirePermission } from "@/services/membership";

export const metadata: Metadata = { title: "New article" };

export default async function NewArticle() {
  await requirePermission("education.manage");
  const cats = await db().education.listCategories();
  return (
    <>
      <AdminHeader title="New article" />
      <Panel><PanelBody><ArticleEditor categories={cats} /></PanelBody></Panel>
    </>
  );
}
