import type { Metadata } from "next";
import { MemberBody, MemberPageHeader } from "@/components/member/page-header";
import { db } from "@/db";
import { AlertsManager } from "@/features/watchlists/alerts-manager";
import { requireUser } from "@/services/membership";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Alerts" };

export default async function AlertsPage() {
  const viewer = await requireUser("/dashboard/alerts");
  const [alerts, notifications] = await Promise.all([db().alerts.list(viewer.user.id), db().notifications.list(viewer.user.id, 30)]);
  return (
    <>
      <MemberPageHeader eyebrow="Personal" title="Alerts & notifications" description="Price, Atlas score, options flow, news, earnings, unusual volume and insider alerts — delivered in-app. Email and push delivery are planned." />
      <MemberBody>
        <AlertsManager alerts={alerts} notifications={notifications} />
      </MemberBody>
    </>
  );
}
