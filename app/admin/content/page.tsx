import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/action-form";
import { AdminHeader } from "@/components/admin/admin-header";
import { Input, Label, Textarea } from "@/components/ui/controls";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { saveSiteContentAction } from "@/features/admin/actions";
import { fmtDateTimeET } from "@/lib/format";
import { getSiteContent } from "@/services/content";
import { requirePermission } from "@/services/membership";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Homepage" };

export default async function ContentAdmin() {
  await requirePermission("content.manage");
  const c = await getSiteContent();
  return (
    <>
      <AdminHeader title="Homepage content" description="Hero copy, site-wide announcement and featured tickers. Changes publish immediately." />
      <Panel>
        <PanelHeader title="Homepage" description={`Last updated ${fmtDateTimeET(c.updatedAt)}`} />
        <PanelBody>
          <ActionForm action={saveSiteContentAction} submitLabel="Publish">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="heroEyebrow">Hero eyebrow</Label>
                <Input id="heroEyebrow" name="heroEyebrow" defaultValue={c.heroEyebrow} maxLength={60} required />
              </div>
              <div>
                <Label htmlFor="heroHeadline">Hero headline</Label>
                <Input id="heroHeadline" name="heroHeadline" defaultValue={c.heroHeadline} maxLength={80} required />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="heroSubhead">Hero supporting copy</Label>
                <Textarea id="heroSubhead" name="heroSubhead" defaultValue={c.heroSubhead} maxLength={300} rows={3} required />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="featuredTickers">Featured tickers (hero terminal, 3–9, comma-separated)</Label>
                <Input id="featuredTickers" name="featuredTickers" defaultValue={c.featuredTickers.join(", ")} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="announcement">Announcement bar (optional)</Label>
                <Input id="announcement" name="announcement" defaultValue={c.announcement ?? ""} maxLength={200} placeholder="Shown above the navigation on every public page" />
              </div>
            </div>
          </ActionForm>
        </PanelBody>
      </Panel>
    </>
  );
}
