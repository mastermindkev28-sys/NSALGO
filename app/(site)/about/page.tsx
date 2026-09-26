import type { Metadata } from "next";
import Link from "next/link";
import { CompassField } from "@/components/brand/compass-field";
import { Container, Section, SectionHeader } from "@/components/marketing/section";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About",
  description: "NSALGO organizes financial information into a unified intelligence experience — technology, market data, AI, research and education.",
  alternates: { canonical: "/about" },
};

const PRINCIPLES = [
  { t: "Every number has a source", d: "Each module shows its provider, delay and timestamp. Unavailable data is labelled unavailable — never estimated or filled." },
  { t: "The engine computes; AI explains", d: "Signals come from deterministic, configurable models. Language models narrate structured evidence and are checked against it." },
  { t: "Rankings, not promises", d: "ATLAS ranks alignment with criteria. It does not predict outcomes, and every setup carries its invalidation." },
  { t: "Outcomes are kept", d: "Setups are tracked to resolution and remain in history — including the ones that fail." },
  { t: "Disclosures without insinuation", d: "Public filings are shown with their documents. A disclosure is a record, not an accusation." },
  { t: "Providers are replaceable", d: "Every vendor sits behind an interface. Better data can be adopted without rebuilding the product." },
];

export default function AboutPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <CompassField className="pointer-events-none absolute -right-60 -top-60 h-[1000px] w-[1000px] opacity-70" />
        <Container className="relative py-20 sm:py-28">
          <div className="eyebrow">About NSALGO</div>
          <h1 className="chrome-text mt-5 max-w-4xl text-[40px] font-semibold uppercase leading-[0.98] tracking-[-0.03em] sm:text-[60px]">Financial intelligence, organized.</h1>
          <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-steel-300">
            Markets generate more information than any person can follow: prices, filings, headlines, options activity, macro releases. NSALGO is designed to organize that
            information into a single intelligence experience — so the path from data to context to decision support is short, clear and honest about uncertainty.
          </p>
        </Container>
      </section>
      <Section>
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeader eyebrow="What we build" title="Technology, data, research." />
            <div className="space-y-5 text-[14.5px] leading-relaxed text-steel-400">
              <p><span className="text-steel-100">Market intelligence.</span> Licensed market data, news and public filings, normalised into one model and presented with provenance.</p>
              <p><span className="text-steel-100">ATLAS.</span> A modular scoring engine that evaluates trend, momentum, volume, relative strength, volatility, options activity, catalysts and regime — and explains every ranking.</p>
              <p><span className="text-steel-100">AI.</span> Models that summarise and explain structured evidence, constrained so they cannot introduce data of their own.</p>
              <p><span className="text-steel-100">Research & education.</span> A library that teaches how markets and the tools themselves work — including their limits.</p>
            </div>
          </div>
          <div>
            <SectionHeader eyebrow="Principles" title="How we operate." />
            <dl className="grid gap-6 sm:grid-cols-2">
              {PRINCIPLES.map((p) => (
                <div key={p.t} className="border-t border-line pt-4">
                  <dt className="text-[14px] font-medium text-steel-50">{p.t}</dt>
                  <dd className="mt-1.5 text-[13px] leading-relaxed text-steel-400">{p.d}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <div className="mt-16 flex flex-wrap gap-3">
          <Button asChild variant="primary" size="lg">
            <Link href="/atlas">Explore Atlas</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/contact">Contact</Link>
          </Button>
        </div>
      </Section>
    </>
  );
}
