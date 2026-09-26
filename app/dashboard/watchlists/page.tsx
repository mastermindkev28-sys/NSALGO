import type { Metadata } from "next";
import { MemberBody, MemberPageHeader } from "@/components/member/page-header";
import { db } from "@/db";
import { WatchlistManager } from "@/features/watchlists/watchlist-manager";
import { requireUser } from "@/services/membership";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Watchlists" };

export default async function WatchlistsPage() {
  const viewer = await requireUser("/dashboard/watchlists");
  const lists = await db().watchlists.list(viewer.user.id);
  return (
    <>
      <MemberPageHeader eyebrow="Personal" title="Watchlists" description="Multiple watchlists, persisted to your account. Open any symbol in Atlas or TradingView, or set an alert." />
      <MemberBody>
        <WatchlistManager initial={lists} />
      </MemberBody>
    </>
  );
}
