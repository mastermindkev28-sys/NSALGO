import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/action-form";
import { AdminHeader } from "@/components/admin/admin-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/controls";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { db } from "@/db";
import { deleteCommentaryAction, saveCommentaryAction } from "@/features/admin/actions";
import { fmtDateTimeET } from "@/lib/format";
import { requirePermission } from "@/services/membership";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Commentary" };

export default async function NewsAdmin({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const v = await requirePermission("commentary.manage");
  const { edit } = await searchParams;
  const items = await db().commentary.list({ status: "all" });
  const current = edit ? items.find((i) => i.id === edit) : undefined;
  return (
    <>
      <AdminHeader title="News management" description="NSALGO desk commentary published alongside licensed news. Third-party article content is never copied here." />
      <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <Panel>
          <PanelHeader title={current ? "Edit commentary" : "New commentary"} />
          <PanelBody>
            <ActionForm action={saveCommentaryAction} key={current?.id ?? "new"}>
              {current ? <input type="hidden" name="id" value={current.id} /> : null}
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" defaultValue={current?.title} required maxLength={160} />
                </div>
                <div>
                  <Label htmlFor="body">Body</Label>
                  <Textarea id="body" name="body" defaultValue={current?.body} required rows={8} maxLength={8000} />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="authorName">Author</Label>
                    <Input id="authorName" name="authorName" defaultValue={current?.authorName ?? "NSALGO Research"} required />
                  </div>
                  <div>
                    <Label htmlFor="tickers">Tickers</Label>
                    <Input id="tickers" name="tickers" defaultValue={current?.tickers.join(", ")} placeholder="SPY, QQQ" />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select id="status" name="status" defaultValue={current?.status ?? "draft"}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </Select>
                  </div>
                </div>
                <p className="text-[11.5px] text-steel-500">Commentary is informational. Avoid recommendations, price predictions or certainty language. Signed in as {v.user.email}.</p>
              </div>
            </ActionForm>
          </PanelBody>
        </Panel>
        <Panel className="overflow-hidden">
          <PanelHeader title="All commentary" />
          {items.length ? (
            <ul className="divide-y divide-line">
              {items.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge size="sm" variant={c.status === "published" ? "up" : "outline"}>{c.status}</Badge>
                      <span className="truncate text-[13.5px] text-steel-50">{c.title}</span>
                    </div>
                    <div className="mt-1 text-[11.5px] text-steel-500">{c.authorName} · {fmtDateTimeET(c.publishedAt ?? c.updatedAt)}{c.tickers.length ? ` · ${c.tickers.join(", ")}` : ""}</div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button asChild size="xs" variant="ghost"><a href={`/admin/news?edit=${c.id}`}>Edit</a></Button>
                    <form action={deleteCommentaryAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <Button size="xs" variant="ghost" className="text-down">Delete</Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No commentary yet" />
          )}
        </Panel>
      </div>
    </>
  );
}
