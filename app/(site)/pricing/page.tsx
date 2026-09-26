import type { Metadata } from "next";
import { CompassField } from "@/components/brand/compass-field";
import { Container, Section, SectionHeader } from "@/components/marketing/section";
import { planFeatures } from "@/config/site";
import { PlanPicker } from "@/features/pricing/plan-picker";
import { getPlans } from "@/services/billing";
import { getViewer } from "@/services/membership";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing",
  description: "One membership: ATLAS, options intelligence, swing analysis, financial news, whale activity, insider and congressional disclosures, education, watchlists and alerts.",
  alternates: { canonical: "/pricing" },
};

const BENEFITS = [
  { t: "Live Market Intelligence", d: "Quotes, breadth, sectors and movers from licensed providers, labelled with delay." },
  { t: "ATLAS", d: "Daily AI-ranked day and swing setups with transparent factor scores." },
  { t: "Options Intelligence", d: "Chains, scanner presets, IV context and classified flow where supported." },
  { t: "Swing Analysis", d: "Trend, relative strength and structure with a ranked swing watchlist." },
  { t: "Financial News", d: "A news terminal with category, ticker and market-impact context." },
  { t: "Whale Activity", d: "13F filings and large-print activity with source attribution." },
  { t: "Insider Disclosures", d: "Forms 3/4/5 and congressional PTRs linked to original documents." },
  { t: "Education", d: "A growing research library, from greeks to regime analysis." },
  { t: "Watchlists & Alerts", d: "Multiple watchlists, Atlas score and price alerts in-app." },
];

const FAQ = [
  { q: "Is market data real-time?", a: "It depends on the licensed provider and exchange entitlements configured for NSALGO. Every module shows whether its data is live, delayed (and by how much) or end-of-day." },
  { q: "Does NSALGO give investment advice?", a: "No. NSALGO provides market information, analytics and AI-generated analysis for informational and educational purposes. Nothing constitutes individualized advice or a guarantee of performance." },
  { q: "What does the Atlas score mean?", a: "It is an analytical ranking of how well current data aligns with a setup's criteria — not a probability or a prediction. Every score shows its factor breakdown and data coverage." },
  { q: "Can I cancel?", a: "Yes. Manage or cancel your membership from Billing at any time; access continues until the end of the paid period." },
];

export default async function PricingPage() {
  const [plans, viewer] = await Promise.all([getPlans(), getViewer()]);
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <CompassField className="pointer-events-none absolute left-1/2 top-[-480px] h-[1100px] w-[1100px] -translate-x-1/2 opacity-70" />
        <Container className="relative py-16 sm:py-24">
          <div className="text-center">
            <div className="eyebrow">Membership</div>
            <h1 className="chrome-text mx-auto mt-5 max-w-3xl text-[38px] font-semibold uppercase leading-[0.98] tracking-[-0.03em] sm:text-[58px]">One market. One intelligence layer.</h1>
            <p className="mx-auto mt-5 max-w-xl text-[15.5px] text-steel-400">Everything in NSALGO, in a single membership.</p>
          </div>
          <div className="mt-12">
            <PlanPicker plans={plans} signedIn={!!viewer.user} paid={viewer.paid && viewer.state !== "admin"} features={planFeatures} />
          </div>
        </Container>
      </section>
      <Section>
        <SectionHeader eyebrow="Included" title="What membership includes." />
        <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.t} className="bg-graphite-900 p-6">
              <div className="text-[14px] font-medium text-steel-50">{b.t}</div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-steel-400">{b.d}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section className="pt-0">
        <SectionHeader eyebrow="Questions" title="Before you join." />
        <dl className="grid gap-x-12 gap-y-8 md:grid-cols-2">
          {FAQ.map((f) => (
            <div key={f.q}>
              <dt className="text-[14.5px] font-medium text-steel-50">{f.q}</dt>
              <dd className="mt-2 text-[13.5px] leading-relaxed text-steel-400">{f.a}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </>
  );
}
