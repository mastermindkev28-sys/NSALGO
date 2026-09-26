import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/admin/action-form";
import { AdminHeader } from "@/components/admin/admin-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/controls";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { db } from "@/db";
import { deleteCategoryAction, saveCategoryAction, toggleFeaturedAction } from "@/features/admin/actions";
import { fmtDate } from "@/lib/format";
import { requirePermission } from "@/services/membership";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Education CMS" };

export default async function EducationAdmin() {
  await requirePermission("education.manage");
  const [articles, cats] = await Promise.all([db().education.listArticles({ status: "all" }), db().education.listCategories()]);
  return (
    <>
      <AdminHeader title="Education CMS" description="Create, edit, publish and feature lessons; manage categories." actions={<Button asChild variant="primary" size="sm"><Link href="/admin/education/new">New article</Link></Button>} />
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel className="overflow-hidden">
          <PanelHeader title={`Articles (${articles.length})`} />
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-[0.12em] text-steel-500">
                <th className="px-5 py-2.5 font-normal">Title</th>
                <th className="hidden px-3 py-2.5 font-normal md:table-cell">Category</th>
                <th className="px-3 py-2.5 font-normal">Status</th>
                <th className="hidden px-3 py-2.5 font-normal md:table-cell">Updated</th>
                <th className="px-5 py-2.5 font-normal" />
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id} className="border-b border-line/60">
                  <td className="px-5 py-2.5">
                    <Link href={`/admin/education/${a.id}`} className="text-steel-50 hover:text-chrome">{a.title}</Link>
                    <div className="text-[11px] text-steel-500">/{a.slug}</div>
                  </td>
                  <td className="hidden px-3 py-2.5 text-steel-300 md:table-cell">{cats.find((c) => c.slug === a.categorySlug)?.name ?? a.categorySlug}</td>
                  <td className="px-3 py-2.5">
                    <span className="flex gap-1">
                      <Badge size="sm" variant={a.status === "published" ? "up" : "outline"}>{a.status}</Badge>
                      {a.featured ? <Badge size="sm" variant="accent">featured</Badge> : null}
                    </span>
                  </td>
                  <td className="num hidden px-3 py-2.5 text-steel-400 md:table-cell">{fmtDate(a.updatedAt, true)}</td>
                  <td className="px-5 py-2.5 text-right">
                    <form action={toggleFeaturedAction} className="inline">
                      <input type="hidden" name="id" value={a.id} />
                      <Button size="xs" variant="ghost">{a.featured ? "Unfeature" : "Feature"}</Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Categories" />
            <ul className="divide-y divide-line/60">
              {cats.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[12.5px]">
                  <span>
                    <span className="text-steel-100">{c.name}</span> <span className="text-steel-500">/{c.slug} · {articles.filter((a) => a.categorySlug === c.slug).length}</span>
                  </span>
                  <form action={deleteCategoryAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <Button size="xs" variant="ghost" disabled={articles.some((a) => a.categorySlug === c.slug)} title="Only empty categories can be deleted">Delete</Button>
                  </form>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel>
            <PanelHeader title="Add or update category" />
            <PanelBody>
              <ActionForm action={saveCategoryAction}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label htmlFor="name">Name</Label><Input id="name" name="name" required /></div>
                  <div><Label htmlFor="cslug">Slug</Label><Input id="cslug" name="slug" required /></div>
                  <div className="sm:col-span-2"><Label htmlFor="cdesc">Description</Label><Input id="cdesc" name="description" /></div>
                  <div><Label htmlFor="pos">Position</Label><Input id="pos" name="position" type="number" defaultValue={cats.length + 1} /></div>
                </div>
              </ActionForm>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </>
  );
}
