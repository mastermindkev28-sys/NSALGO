import type { Metadata } from "next";
import { Container, PageHero } from "@/components/marketing/section";
import { MarketOverview } from "@/features/markets/market-overview";
import { getMarketStatus } from "@/services/market";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Markets",
  description: "Major indices, futures, sectors, rates, commodities, FX, crypto, market breadth, volatility and movers — from NSALGO.",
  alternates: { canonical: "/markets" },
};

export default async function MarketsPage() {
  const status = await getMarketStatus();
  return (
    <>
      <PageHero
        eyebrow={status.ok ? status.data.label : "Markets"}
        title="The market, at a glance."
        description="Indices, futures, sectors, rates, commodities, FX, crypto, breadth and volatility — every figure labelled with its source and delay."
      />
      <Container className="py-10">
        <MarketOverview />
      </Container>
    </>
  );
}
