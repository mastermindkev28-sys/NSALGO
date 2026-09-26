import type { Metadata } from "next";
import { Container, PageHero } from "@/components/marketing/section";
import { WHALE_CATEGORIES, WhaleView } from "@/features/whales/whale-view";
import type { InstitutionalCategory } from "@/types/disclosures";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Whale Activity & Public Disclosures",
  description: "Institutional activity, 13F holdings, large options and equity prints, insider transactions and congressional trading disclosures — each with source attribution.",
  alternates: { canonical: "/whales" },
};

export default async function WhalesPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const cat = WHALE_CATEGORIES.some((c) => c.id === category && c.id !== "all") ? (category as InstitutionalCategory) : undefined;
  return (
    <>
      <PageHero
        eyebrow="Whales & disclosures"
        title="Follow the large money — with sources."
        description="Institutional filings, large prints, insider transactions and congressional disclosures. A disclosure shows that a transaction occurred; it does not establish intent or imply wrongdoing."
      />
      <Container className="py-8">
        <WhaleView basePath="/whales" category={cat} limit={40} full={false} />
      </Container>
    </>
  );
}
