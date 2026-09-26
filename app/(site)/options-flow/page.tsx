import { Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageHero } from "@/components/marketing/section";
import { Button } from "@/components/ui/button";
import { DataSourceBadge } from "@/components/ui/data-source";
import { Panel, PanelBody } from "@/components/ui/panel";
import { UnavailableState } from "@/components/ui/states";
import { FlowExplorer } from "@/features/flow/flow-explorer";
import { getFlow } from "@/services/intel";
import { getViewer } from "@/services/membership";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Options Flow",
  description: "Large options activity — premium, strike, expiration, spot, volume, open interest and sweep/block classification where the data provider supplies it.",
  alternates: { canonical: "/options-flow" },
};

export default async function OptionsFlowPage() {
  const viewer = await getViewer();
  const flow = await getFlow({ limit: viewer.paid ? 600 : 60, minPremium: 100_000 });
  return (
    <>
      <PageHero
        eyebrow="Options flow"
        title="Where the premium is going."
        description="Large options prints with premium, contracts, spot, volume and open interest. Sweep/block, side and opening/closing classifications are shown only when the provider supplies them — never inferred."
      >
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <DataSourceBadge meta={flow.ok ? flow.meta : null} />
        </div>
      </PageHero>
      <Container className="space-y-6 py-8">
        {flow.ok ? <FlowExplorer prints={flow.data} /> : <Panel><UnavailableState error={flow.error} label="Options flow" /></Panel>}
        {!viewer.paid ? (
          <Panel>
            <PanelBody className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <p className="flex items-center gap-2 text-[13px] text-steel-300">
                <Lock className="size-4 text-steel-500" /> Visitors see the most recent large prints. Members get the full session tape, flow alerts and Atlas integration.
              </p>
              <Button asChild variant="primary" size="sm">
                <Link href="/pricing">Join NSALGO</Link>
              </Button>
            </PanelBody>
          </Panel>
        ) : null}
      </Container>
    </>
  );
}
