import type { Metadata } from "next";
import { MembershipGate } from "@/components/member/membership-gate";
import { MemberBody, MemberPageHeader } from "@/components/member/page-header";
import { AtlasSubnav } from "@/features/atlas/atlas-subnav";
import { ScannerView } from "@/features/atlas/scanner-view";
import { runScanner } from "@/services/atlas/scanner";
import { getViewer } from "@/services/membership";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Market Scanner" };

export default async function ScannerPage() {
  const viewer = await getViewer();
  if (!viewer.paid) return <MembershipGate feature="Market Scanner" />;
  const initial = await runScanner("swing");
  return (
    <>
      <MemberPageHeader eyebrow="Atlas" title="Market scanner" description="The full Atlas universe scored in real time. Filter by sector, bias, score, relative volume, liquidity and price; open any row for the complete analysis." />
      <AtlasSubnav />
      <MemberBody>
        <ScannerView initial={initial} />
      </MemberBody>
    </>
  );
}
