import { ArrowRight, Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FactorBars, RegimeBadge, StatusPill } from "@/components/atlas/primitives";
import { RegimePanel } from "@/components/atlas/regime-panel";
import { CompassField } from "@/components/brand/compass-field";
import { Container, Section, SectionHeader } from "@/components/marketing/section";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { ScoreRing } from "@/components/ui/score-ring";
import { FACTOR_LABELS, SCORE_DISCLAIMER } from "@/config/atlas";
import { getAtlasConfig } from "@/services/atlas/config-store";
import { scan } from "@/services/atlas/engine";
import { FACTOR_KEYS, type SetupStatus } from "@/types/atlas";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ATLAS — Market Intelligence Engine",
  description:
    "ATLAS ranks day-trade and swing setups across a 16-factor model — trend, momentum, volume, relative strength, options activity, catalysts and market regime — and explains every ranking.",
  alternates: { canonical: "/atlas" },
};

const PIPELINE = [
  { k: "Data", d: "Licensed quotes, history, options chains, news, filings and calendars — each tagged with source and delay." },
  { k: "Normalization", d: "One schema for every vendor. Missing fields stay missing." },
  { k: "Feature engineering", d: "Moving averages, RSI, MACD, ATR, VWAP, relative volume, relative strength, structure." },
  { k: "Market regime", d: "Trend, volatility, breadth, leadership and rates classify the tape." },
  { k: "Technical analysis", d: "Trend, momentum, volatility and structure factors scored for direction." },
  { k: "Options analysis", d: "Open interest, IV rank, liquidity and classified flow where supplied." },
  { k: "News & catalysts", d: "Symbol-tagged coverage, sentiment, earnings and macro events." },
  { k: "Scoring model", d: "Configurable weights; unavailable factors re-normalised and reported as coverage." },
  { k: "AI explanation", d: "Narrates the structured evidence. Numeric claims are verified against it." },
  { k: "Atlas setup", d: "Entry, target, invalidation, options structure — then tracked through its lifecycle." },
];

const LIFECYCLE: SetupStatus[] = ["generated", "active", "triggered", "target-reached", "invalidated", "expired"];

export default async function AtlasLandingPage() {
  const [swing, cfg] = await Promise.all([scan("swing"), getAtlasConfig()]);
  const example = swing.setups[0];
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <CompassField className="pointer-events-none absolute left-1/2 top-[-420px] h-[1200px] w-[1200px] -translate-x-1/2 opacity-80" />
        <Container className="relative py-20 text-center sm:py-28">
          <div className="font-mono text-[12px] tracking-[0.6em] text-steel-300">ATLAS</div>
          <h1 className="chrome-text mx-auto mt-6 max-w-4xl text-[40px] font-semibold uppercase leading-[0.98] tracking-[-0.03em] sm:text-[64px]">Intelligence before execution.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-steel-300">
            ATLAS is the intelligence engine inside NSALGO. It scores every symbol in its universe across sixteen factors, ranks the setups that clear its
            threshold, and shows the evidence behind every ranking — including what could make it wrong.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild variant="primary" size="lg">
              <Link href="/dashboard/atlas">
                Enter Atlas <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/pricing">Membership</Link>
            </Button>
          </div>
          <p className="mx-auto mt-8 max-w-xl text-[12px] text-steel-500">{SCORE_DISCLAIMER}</p>
        </Container>
      </section>

      <Section>
        <SectionHeader eyebrow="Engine architecture" title="From data to decision support." description="Each stage is an independent module. The AI layer explains signals; it never manufactures them." />
        <ol className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
          {PIPELINE.map((p, i) => (
            <li key={p.k} className="relative bg-graphite-900 p-5">
              <div className="num text-[11px] text-steel-500">{String(i + 1).padStart(2, "0")}</div>
              <div className="mt-3 text-[14px] font-medium text-steel-50">{p.k}</div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-steel-400">{p.d}</p>
            </li>
          ))}
        </ol>
      </Section>

      <section className="border-y border-line bg-void py-16 sm:py-24">
        <Container>
          <SectionHeader eyebrow="Anatomy of a setup" title="Transparent by construction." description="Every setup carries its factor scores, the evidence behind each one, the conditions that triggered it and the level that invalidates it." />
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            {example ? (
              <Panel>
                <PanelHeader
                  eyebrow="Live example · today's top swing setup"
                  title={
                    <span className="flex items-center gap-2">
                      <span className="font-mono tracking-[0.06em]">{example.symbol}</span>
                      <span className="text-steel-400">{example.name}</span>
                    </span>
                  }
                  actions={<ScoreRing value={example.score.value} size={52} coverage={example.score.coverage} />}
                />
                <PanelBody className="space-y-5">
                  <FactorBars components={example.score.components} showWeights />
                  <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
                    {example.confirmations.slice(0, 6).map((c) => (
                      <div key={c.label} className="flex items-start gap-2 text-[12px]">
                        <span className={c.met ? "text-up" : "text-steel-500"}>{c.met ? "✓" : "○"}</span>
                        <span className={c.met ? "text-steel-200" : "text-steel-500"}>{c.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11.5px] text-steel-500">Levels, options structure and the full explanation are available to members.</p>
                </PanelBody>
              </Panel>
            ) : (
              <Panel>
                <PanelBody className="text-[13px] text-steel-400">No setup currently clears the threshold.</PanelBody>
              </Panel>
            )}
            <div className="grid gap-4">
              {[
                { t: "Why it appeared", d: "A structured explanation of the measured conditions that ranked the setup — e.g. momentum accelerating above the 20-day structure while relative volume expanded." },
                { t: "Risks", d: "The primary invalidation level and every factor reading against the setup. Low data coverage is stated plainly." },
                { t: "Catalysts", d: "Earnings, economic releases, symbol news, sector moves, technical breakouts and options activity — each linked to its source." },
                { t: "Confirmation", d: "The explicit checklist of conditions — met or not — that the setup was built on." },
              ].map((b) => (
                <Panel key={b.t}>
                  <PanelBody>
                    <div className="flex items-center gap-2 text-[13.5px] font-medium text-steel-50">
                      <Check className="size-4 text-polar-400" /> {b.t}
                    </div>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-steel-400">{b.d}</p>
                  </PanelBody>
                </Panel>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <Section>
        <SectionHeader eyebrow="Scoring model" title="Sixteen factors. Configurable weights." description={`Day-trade and swing modes weight the same evidence differently. Active configuration: ${cfg.version}.`} />
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="px-5 py-3 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-steel-500">Factor</th>
                <th className="px-5 py-3 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-steel-500">What it measures</th>
                <th className="px-5 py-3 text-right font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-steel-500">Day weight</th>
                <th className="px-5 py-3 text-right font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-steel-500">Swing weight</th>
              </tr>
            </thead>
            <tbody>
              {FACTOR_KEYS.map((k) => {
                const dt = FACTOR_KEYS.reduce((a, x) => a + cfg.weights.day[x], 0);
                const st = FACTOR_KEYS.reduce((a, x) => a + cfg.weights.swing[x], 0);
                return (
                  <tr key={k} className="border-b border-line/60">
                    <td className="px-5 py-2.5 text-steel-50">{FACTOR_LABELS[k].label}</td>
                    <td className="px-5 py-2.5 text-steel-400">{FACTOR_LABELS[k].description}</td>
                    <td className="num px-5 py-2.5 text-right text-steel-200">{((cfg.weights.day[k] / dt) * 100).toFixed(0)}%</td>
                    <td className="num px-5 py-2.5 text-right text-steel-200">{((cfg.weights.swing[k] / st) * 100).toFixed(0)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      </Section>

      <section className="border-y border-line bg-void/40 py-16 sm:py-24">
        <Container className="grid gap-8 lg:grid-cols-2">
          <div>
            <SectionHeader eyebrow="Market regime" title="Context before conviction." description="Setups aligned with the regime are ranked higher; counter-regime setups are shown but penalised — and labelled." />
            <div className="flex items-center gap-2 text-[13px] text-steel-300">
              Current regime: <RegimeBadge regime={swing.regime} />
            </div>
          </div>
          <RegimePanel regime={swing.regime} />
        </Container>
      </section>

      <Section>
        <SectionHeader eyebrow="Setup lifecycle & history" title="Every outcome recorded." description="Setups are tracked from generation to resolution. Invalidated setups stay in the history — performance is never curated." />
        <div className="flex flex-wrap items-center gap-3">
          {LIFECYCLE.map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <span className="panel px-4 py-2.5">
                <StatusPill status={s} className="text-[13px]" />
              </span>
              {i < 2 ? <ArrowRight className="size-3.5 text-steel-500" /> : i === 2 ? <span className="text-steel-500">→</span> : null}
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap gap-3">
          <Button asChild variant="primary" size="lg">
            <Link href="/dashboard/atlas">
              Enter Atlas <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/learn/reading-the-atlas-score">Reading the Atlas score</Link>
          </Button>
        </div>
      </Section>
    </>
  );
}
