import type { Metadata } from "next";
import { Container, PageHero } from "@/components/marketing/section";
import { Library } from "@/features/learn/library";
import type { Difficulty } from "@/types/domain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Learn",
  description: "The NSALGO research library: options, technical analysis, market structure, macro, risk management, trading psychology, strategy and AI in markets.",
  alternates: { canonical: "/learn" },
};

export default async function LearnPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const difficulty = ["foundational", "intermediate", "advanced"].includes(sp.difficulty ?? "") ? (sp.difficulty as Difficulty) : undefined;
  return (
    <>
      <PageHero eyebrow="Education" title="Intelligence before execution." description="Structured lessons on how markets work, how to read Atlas, and how to manage risk — written for active market participants." />
      <Container className="py-10">
        <Library basePath="/learn" category={sp.category?.slice(0, 40)} difficulty={difficulty} q={sp.q?.slice(0, 64)} />
      </Container>
    </>
  );
}
