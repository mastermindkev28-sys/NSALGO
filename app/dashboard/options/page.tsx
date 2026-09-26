import type { Metadata } from "next";
import Link from "next/link";
import { MembershipGate } from "@/components/member/membership-gate";
import { MemberBody, MemberPageHeader } from "@/components/member/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { OptionsChainView } from "@/features/options/options-chain";
import { OptionsScanner } from "@/features/options/options-scanner";
import { getOptionChain } from "@/services/intel";
import { getViewer } from "@/services/membership";
import { scanOptions } from "@/services/options-scanner";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Options Scanner" };

export default async function OptionsPage() {
  const viewer = await getViewer();
  if (!viewer.paid) return <MembershipGate feature="Options intelligence" />;
  const [scan, chain] = await Promise.all([scanOptions({ preset: "most-active" }, 200), getOptionChain("SPY")]);
  return (
    <>
      <MemberPageHeader
        eyebrow="Options intelligence"
        title="Options scanner"
        description="Scan near-dated chains across the optionable universe by DTE, delta, IV, volume, open interest, vol/OI, spread and premium — or start from a preset."
        actions={<Link href="/dashboard/flow" className="text-[12.5px] text-steel-400 hover:text-chrome">Options flow →</Link>}
      />
      <MemberBody>
        <Panel className="overflow-hidden">
          <PanelHeader eyebrow="Scanner" title="Contracts" description="Computed fields (vol/OI, spread, premium traded) derive only from provider-supplied quotes." />
          <OptionsScanner initial={scan} />
        </Panel>
        <Panel className="overflow-hidden">
          <PanelHeader eyebrow="Chain" title="Options chain" description="In-the-money strikes shaded; at-the-money strike outlined." />
          <OptionsChainView initial={chain} initialSymbol="SPY" />
        </Panel>
      </MemberBody>
    </>
  );
}
