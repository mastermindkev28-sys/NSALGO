import type { Metadata } from "next";
import { MembershipGate } from "@/components/member/membership-gate";
import { MemberBody, MemberPageHeader } from "@/components/member/page-header";
import { WHALE_CATEGORIES, WhaleView } from "@/features/whales/whale-view";
import { getViewer } from "@/services/membership";
import type { InstitutionalCategory } from "@/types/disclosures";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Whale Activity" };

export default async function MemberWhalesPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const viewer = await getViewer();
  if (!viewer.paid) return <MembershipGate feature="Whale activity" />;
  const { category } = await searchParams;
  const cat = WHALE_CATEGORIES.some((c) => c.id === category && c.id !== "all") ? (category as InstitutionalCategory) : undefined;
  return (
    <>
      <MemberPageHeader eyebrow="Flow & disclosures" title="Whale activity" description="Institutional filings, large options and equity prints, large premium and unusual volume — with source attribution and source timestamps." />
      <MemberBody>
        <WhaleView basePath="/dashboard/whales" category={cat} limit={300} full />
      </MemberBody>
    </>
  );
}
