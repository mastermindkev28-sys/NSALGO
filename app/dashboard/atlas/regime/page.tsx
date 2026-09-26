import type { Metadata } from "next";
import { RegimePanel } from "@/components/atlas/regime-panel";
import { PriceChart } from "@/components/charts/price-chart";
import { MembershipGate } from "@/components/member/membership-gate";
import { MemberBody } from "@/components/member/page-header";
import { BreadthPanel } from "@/components/market/breadth-panel";
import { SectorHeatmap } from "@/components/market/sector-heatmap";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { AtlasHeaderStrip } from "@/features/atlas/header-strip";
import { AtlasSubnav } from "@/features/atlas/atlas-subnav";
import { getMarketContext } from "@/services/atlas/engine";
import { getMarketStatus } from "@/services/market";
import { getViewer } from "@/services/membership";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Atlas · Market Regime" };

export default async function RegimePage() {
  const viewer = await getViewer();
  if (!viewer.paid) return <MembershipGate feature="Market Regime" />;
  const [ctx, status] = await Promise.all([getMarketContext(), getMarketStatus()]);
  return (
    <>
      <AtlasHeaderStrip ctx={ctx} status={status.ok ? status.data : null} />
      <AtlasSubnav />
      <MemberBody>
        <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
          <RegimePanel regime={ctx.regime} />
          <div className="space-y-4">
            <Panel className="overflow-hidden">
              <PanelHeader eyebrow="Volatility" title="VIX" />
              <PriceChart symbol="VIX" initialRange="6M" height={260} defaultIndicators={["sma20"]} />
            </Panel>
            <Panel className="overflow-hidden">
              <PanelHeader eyebrow="Trend" title="SPY with 20/50-day averages" />
              <PriceChart symbol="SPY" initialRange="1Y" height={260} defaultIndicators={["sma20", "sma50", "volume"]} />
            </Panel>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Panel>
            <PanelHeader eyebrow="Sector participation" title="Sector ETFs today" />
            <PanelBody>{ctx.sectors ? <SectorHeatmap sectors={ctx.sectors} /> : <p className="text-[12.5px] text-steel-500">Sector data unavailable.</p>}</PanelBody>
          </Panel>
          <Panel>
            <PanelHeader eyebrow="Breadth" title="Participation" />
            <PanelBody>{ctx.breadth ? <BreadthPanel breadth={ctx.breadth} /> : <p className="text-[12.5px] text-steel-500">Breadth data unavailable.</p>}</PanelBody>
          </Panel>
        </div>
      </MemberBody>
    </>
  );
}
