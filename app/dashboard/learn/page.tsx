import type { Metadata } from "next";
import { MemberBody, MemberPageHeader } from "@/components/member/page-header";
import { Library } from "@/features/learn/library";
import type { Difficulty } from "@/types/domain";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Education" };

export default async function MemberLearnPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const difficulty = ["foundational", "intermediate", "advanced"].includes(sp.difficulty ?? "") ? (sp.difficulty as Difficulty) : undefined;
  return (
    <>
      <MemberPageHeader eyebrow="Education" title="Research library" description="Lessons on options, structure, macro, risk and reading Atlas." />
      <MemberBody>
        <Library basePath="/dashboard/learn" category={sp.category?.slice(0, 40)} difficulty={difficulty} q={sp.q?.slice(0, 64)} />
      </MemberBody>
    </>
  );
}
