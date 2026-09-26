import type { Metadata } from "next";
import { MemberBody, MemberPageHeader } from "@/components/member/page-header";
import { MarketOverview } from "@/features/markets/market-overview";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Market Data" };

export default function MemberMarketsPage() {
  return (
    <>
      <MemberPageHeader eyebrow="Markets" title="Market data" description="Indices, futures, rates, commodities, FX, crypto, sectors, breadth and movers — every figure labelled with its source and delay." />
      <MemberBody>
        <MarketOverview memberLinks />
      </MemberBody>
    </>
  );
}
