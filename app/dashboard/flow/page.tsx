import type { Metadata } from "next";
import { MembershipGate } from "@/components/member/membership-gate";
import { MemberBody, MemberPageHeader } from "@/components/member/page-header";
import { DataSourceBadge } from "@/components/ui/data-source";
import { Panel } from "@/components/ui/panel";
import { UnavailableState } from "@/components/ui/states";
import { FlowExplorer } from "@/features/flow/flow-explorer";
import { getFlow } from "@/services/intel";
import { getViewer } from "@/services/membership";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Options Flow" };

export default async function FlowPage() {
  const viewer = await getViewer();
  if (!viewer.paid) return <MembershipGate feature="Options flow" />;
  const flow = await getFlow({ limit: 1000, minPremium: 50_000 });
  return (
    <>
      <MemberPageHeader
        eyebrow="Options intelligence"
        title="Options flow"
        description="Large options activity for the session. Sweep, block, side and opening status are derived from trade and quote data; anything that can't be determined is shown as unavailable."
        actions={<DataSourceBadge meta={flow.ok ? flow.meta : null} />}
      />
      <MemberBody>{flow.ok ? <FlowExplorer prints={flow.data} maxHeight={640} /> : <Panel><UnavailableState error={flow.error} label="Options flow" /></Panel>}</MemberBody>
    </>
  );
}
