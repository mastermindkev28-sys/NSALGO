import { ArrowRight, BookOpen, Brain, CalendarClock, Compass, Gauge, Layers, ShieldCheck, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AtlasSetupCard } from "@/components/atlas/setup-card";
import { CompassField } from "@/components/brand/compass-field";
import { EmblemHero } from "@/components/brand/logo";
import { CongressTable, FlowTable, InsiderTable, InstitutionalTable } from "@/components/disclosures/tables";
import { LiveQuoteGrid } from "@/components/market/live-quote-grid";
import { HeroTerminal } from "@/components/marketing/hero-terminal";
import { Container, Section, SectionHeader } from "@/components/marketing/section";
import { NewsCard } from "@/components/news/news-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataSourceBadge } from "@/components/ui/data-source";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { UnavailableState } from "@/components/ui/states";
import { PULSE_SYMBOLS } from "@/config/universe";
import { db } from "@/db";
import { marketBrief, scan } from "@/services/atlas/engine";
import { getSiteContent } from "@/services/content";
import { getFlow, listCongress, listInsiders, listInstitutional, listNews } from "@/services/intel";
import { getMarketStatus, getQuotes, getSparks } from "@/services/market";
import type { NewsCategory } from "@/types/news";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "NSALGO — See the market with direction." },
  description:
    "Market intelligence, the ATLAS AI-ranked setup engine, financial news, options activity, institutional signals and public disclosures — organized in one platform.",
  alternates: { canonical: "/" },
};

const NEWS_CATS: { id: NewsCategory; label: string }[] = [
  { id: "breaking", label: "Breaking" },
  { id: "markets", label: "Markets" },
  { id: "economy", label: "Economy" },
  { id: "fed", label: "Fed" },
  { id: "earnings", label: "Earnings" },
  { id: "technology", label: "Technology" },
  { id: "ai", label: "AI" },
  { id: "options", label: "Options" },
  { id: "macro", label: "Macro" },
];

const ATLAS_FEATURES = [
  { icon: Compass, title: "Daily Opportunities", body: "Every session, the universe is scored and ranked. Only setups clearing the configured threshold and data coverage appear." },
  { icon: Layers, title: "Options", body: "Structures chosen from IV rank, delta and liquidity — with spread width, open interest and defined risk shown per leg." },
  { icon: TrendingUp, title: "Swing", body: "Trend, relative strength, structure and accumulation over a 5–15 session horizon, with earnings risk flagged." },
  { icon: Gauge, title: "Market Regime", body: "Risk-on, risk-off or mixed — derived from trend, volatility, breadth and leadership, with every input shown." },
  { icon: Brain, title: "AI Analysis", body: "Explanations are generated from the engine's structured evidence and checked against it. The model narrates; it never invents data." },
  { icon: ShieldCheck, title: "Risk Framework", body: "Entry zone, target zone and invalidation for every setup. Outcomes are tracked — including the ones that fail." },
];

export default async function HomePage() {
  const content = await getSiteContent();
  const heroSymbols = content.featuredTickers.length ? content.featuredTickers.slice(0, 9) : ["SPY", "QQQ", "NVDA", "AAPL", "TSLA", "AMD", "IWM", "DIA", "VIX"];
  const pulseSymbols = PULSE_SYMBOLS.map((p) => p.symbol);

  const [heroQuotes, sparks, pulse, status, swing, day, news, brief, education, categories, inst, insiders, congress, flow] = await Promise.all([
    getQuotes(heroSymbols),
    getSparks(heroSymbols),
    getQuotes(pulseSymbols),
    getMarketStatus(),
    scan("swing"),
    scan("day"),
    listNews({ limit: 9 }),
    marketBrief(),
    db().education.listArticles({ featured: true, limit: 4 }),
    db().education.listCategories(),
    listInstitutional({ limit: 5 }),
    listInsiders({ limit: 5 }),
    listCongress({ limit: 5 }),
    getFlow({ limit: 6, minPremium: 250_000 }),
  ]);
  const top = [...day.setups, ...swing.setups].sort((a, b) => b.score.value - a.score.value);
  const preview: typeof top = [];
  for (const s of [...swing.setups, ...day.setups]) {
    if (preview.length < 3 && !preview.some((p) => p.symbol === s.symbol)) preview.push(s);
  }

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <CompassField className="pointer-events-none absolute -right-[20%] -top-[30%] h-[1100px] w-[1100px] opacity-70 lg:-right-[8%]" />
        <div className="hairline-grid pointer-events-none absolute inset-0 opacity-40 fade-mask-b" aria-hidden />
        <div className="pointer-events-none absolute left-[10%] top-0 h-[420px] w-[620px] rounded-full bg-polar-500/[0.06] blur-3xl" aria-hidden />
        <Container className="relative grid items-center gap-12 pb-16 pt-14 sm:pt-20 lg:grid-cols-[1fr_1.12fr] lg:gap-14 lg:pb-24">
          <div className="animate-fade-up">
            <EmblemHero size={72} priority className="-ml-2 mb-5" />
            <div className="eyebrow mb-5 flex items-center gap-2">
              <span className="h-px w-6 bg-steel-500" aria-hidden />
              {content.heroEyebrow}
            </div>
            <h1 className="chrome-text text-[44px] font-semibold uppercase leading-[0.95] tracking-[-0.035em] sm:text-[64px] xl:text-[76px]">{content.heroHeadline}</h1>
            <p className="mt-6 max-w-xl text-[16.5px] leading-relaxed text-steel-300">{content.heroSubhead}</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild variant="primary" size="lg">
                <Link href="/dashboard/atlas" data-cta="hero-enter-atlas">
                  Enter Atlas <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/markets">Explore NSALGO</Link>
              </Button>
            </div>
            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-6">
              <div>
                <dt className="text-[11px] text-steel-500">Symbols ranked</dt>
                <dd className="num mt-1 text-lg text-chrome">{swing.evaluated}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-steel-500">Factors per setup</dt>
                <dd className="num mt-1 text-lg text-chrome">16</dd>
              </div>
              <div>
                <dt className="text-[11px] text-steel-500">Setups above threshold</dt>
                <dd className="num mt-1 text-lg text-chrome">{top.length}</dd>
              </div>
            </dl>
          </div>
          <div className="animate-fade-up [animation-delay:120ms]">
            <HeroTerminal quotes={heroQuotes} symbols={heroSymbols} sparks={sparks} regime={swing.regime} status={status.ok ? status.data : null} topSetup={top[0] ?? null} />
          </div>
        </Container>
      </section>

      {/* ── MARKET PULSE ─────────────────────────────────────────────────── */}
      <section className="border-y border-line bg-void/40 py-10">
        <Container>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="font-mono text-[11px] tracking-[0.32em] text-steel-200">MARKET PULSE</h2>
              <DataSourceBadge meta={pulse.ok ? pulse.meta : null} />
            </div>
            <Link href="/markets" className="text-[12.5px] text-steel-400 hover:text-chrome">
              Full market overview →
            </Link>
          </div>
          <LiveQuoteGrid initial={pulse} symbols={pulseSymbols} labels={Object.fromEntries(PULSE_SYMBOLS.map((p) => [p.symbol, p.label]))} className="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6" />
        </Container>
      </section>

      {/* ── NEWS ─────────────────────────────────────────────────────────── */}
      <Section>
        <SectionHeader eyebrow="Latest market news" title="What is moving, and why." href="/news" hrefLabel="Open the news terminal" />
        <div className="mb-6 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {NEWS_CATS.map((c) => (
            <Link key={c.id} href={`/news?category=${c.id}`} className="shrink-0 rounded-sm border border-line px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-steel-300 transition-colors hover:border-line-strong hover:text-chrome">
              {c.label}
            </Link>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Panel>
            <PanelHeader title="Headlines" actions={<DataSourceBadge meta={news.ok ? news.meta : null} />} />
            {news.ok ? (
              <div className="divide-y divide-line px-4 sm:px-5">
                {news.data.slice(0, 6).map((a) => (
                  <NewsCard key={a.id} article={a} />
                ))}
              </div>
            ) : (
              <UnavailableState error={news.error} label="News" />
            )}
          </Panel>
          <div className="flex flex-col gap-6">
            <Panel>
              <PanelHeader eyebrow="Intelligence brief" title={brief.narrative.headline} actions={<Badge size="sm" variant="accent">AI</Badge>} />
              <PanelBody>
                <p className="text-[13.5px] leading-relaxed text-steel-300">{brief.narrative.summary}</p>
                {brief.narrative.watch.length ? (
                  <div className="mt-4">
                    <div className="eyebrow mb-2">On watch</div>
                    <ul className="space-y-1.5 text-[12.5px] text-steel-200">
                      {brief.narrative.watch.map((w) => (
                        <li key={w} className="flex gap-2">
                          <CalendarClock className="mt-0.5 size-3.5 shrink-0 text-steel-500" /> {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <p className="mt-4 text-[10.5px] text-steel-500">Generated by {brief.generatedBy} from the structured market digest. May contain errors.</p>
              </PanelBody>
            </Panel>
            {news.ok ? (
              <Panel>
                <PanelHeader title="Also reported" />
                <div className="divide-y divide-line px-4 sm:px-5">
                  {news.data.slice(6, 9).map((a) => (
                    <NewsCard key={a.id} article={a} variant="compact" />
                  ))}
                </div>
              </Panel>
            ) : null}
          </div>
        </div>
      </Section>

      {/* ── ATLAS ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-y border-line bg-void py-16 sm:py-24">
        <CompassField className="pointer-events-none absolute -left-[25%] top-1/2 h-[1000px] w-[1000px] -translate-y-1/2 opacity-50" />
        <Container className="relative">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <div className="font-mono text-[11px] tracking-[0.5em] text-steel-300">ATLAS</div>
              <h2 className="mt-4 text-[34px] font-medium uppercase leading-[1.02] tracking-[-0.025em] text-chrome sm:text-[46px]">The market moves. Atlas maps it.</h2>
              <p className="mt-5 max-w-lg text-[15.5px] leading-relaxed text-steel-400">
                ATLAS is NSALGO&apos;s intelligence engine. It evaluates trend, momentum, volume, relative strength, volatility, options activity, catalysts and market
                regime — then ranks what deserves attention and shows exactly why.
              </p>
              <div className="mt-9 grid gap-x-8 gap-y-6 sm:grid-cols-2">
                {ATLAS_FEATURES.map((f) => (
                  <div key={f.title}>
                    <div className="flex items-center gap-2 text-[13px] font-medium text-steel-50">
                      <f.icon className="size-4 text-polar-400" /> {f.title}
                    </div>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-steel-400">{f.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button asChild variant="primary" size="lg">
                  <Link href="/dashboard/atlas">
                    Enter Atlas <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="lg">
                  <Link href="/atlas">How Atlas works</Link>
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="eyebrow">Today&apos;s top setups · preview</span>
                <span className="text-[11px] text-steel-500">Scores are analytical rankings, not predictions.</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {preview.map((s, i) => (
                  <AtlasSetupCard key={s.id} setup={s} rank={i + 1} locked className={i === 0 ? "md:col-span-2" : undefined} />
                ))}
                {!preview.length ? (
                  <Panel className="md:col-span-2">
                    <PanelBody className="text-[13px] text-steel-400">No setups currently clear the Atlas threshold. That is information too.</PanelBody>
                  </Panel>
                ) : null}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── WHAT MEMBERS SEE ─────────────────────────────────────────────── */}
      <Section>
        <SectionHeader eyebrow="What members see" title="One platform. The data that matters." description="Live modules from the member platform, shown here with the same data sources and labels members see." />
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel className="overflow-hidden">
            <PanelHeader eyebrow="Options flow" title="Large prints, classified where the provider supports it" actions={<DataSourceBadge meta={flow.ok ? flow.meta : null} showTime={false} />} />
            {flow.ok ? <FlowTable rows={flow.data} compact /> : <UnavailableState error={flow.error} compact />}
          </Panel>
          <Panel className="overflow-hidden">
            <PanelHeader eyebrow="Insider transactions" title="Section 16 filings (Forms 3/4/5)" actions={<DataSourceBadge meta={insiders.ok ? insiders.meta : null} showTime={false} />} />
            {insiders.ok ? <InsiderTable rows={insiders.data} compact /> : <UnavailableState error={insiders.error} compact />}
          </Panel>
        </div>
      </Section>

      {/* ── WHALE / DISCLOSURE INTELLIGENCE ──────────────────────────────── */}
      <section className="border-y border-line bg-void/40 py-16 sm:py-24">
        <Container>
          <SectionHeader
            eyebrow="Whale & disclosure intelligence"
            title="Institutional activity and public disclosures."
            description="Institutional activity, insider transactions, 13F holdings, options activity and congressional trading disclosures — each with its source. A disclosure records that a transaction occurred; it does not imply wrongdoing."
            href="/whales"
            hrefLabel="Explore whale activity"
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel className="overflow-hidden">
              <PanelHeader eyebrow="Institutional activity & 13F" title="Holdings changes and large prints" actions={<DataSourceBadge meta={inst.ok ? inst.meta : null} showTime={false} />} />
              {inst.ok ? <InstitutionalTable rows={inst.data} compact /> : <UnavailableState error={inst.error} compact />}
            </Panel>
            <Panel className="overflow-hidden">
              <PanelHeader eyebrow="Congressional disclosures" title="Periodic Transaction Reports (STOCK Act)" actions={<DataSourceBadge meta={congress.ok ? congress.meta : null} showTime={false} />} />
              {congress.ok ? <CongressTable rows={congress.data} compact /> : <UnavailableState error={congress.error} compact />}
            </Panel>
          </div>
        </Container>
      </section>

      {/* ── EDUCATION ────────────────────────────────────────────────────── */}
      <Section>
        <SectionHeader eyebrow="Education" title="Intelligence before execution." description="A growing research library on options, market structure, macro, risk and how to read AI-assisted analysis responsibly." href="/learn" hrefLabel="Browse the library" />
        <div className="mb-6 flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <Link key={c.slug} href={`/learn?category=${c.slug}`} className="rounded-sm border border-line px-3 py-1.5 text-[12px] text-steel-300 transition-colors hover:border-line-strong hover:text-chrome">
              {c.name}
            </Link>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {education.map((a) => (
            <Link key={a.id} href={`/learn/${a.slug}`} className="panel group flex flex-col p-5 transition-colors hover:border-line-strong">
              <div className="flex items-center justify-between">
                <span className="eyebrow">{categories.find((c) => c.slug === a.categorySlug)?.name ?? a.categorySlug}</span>
                <BookOpen className="size-3.5 text-steel-500" />
              </div>
              <h3 className="mt-6 text-[15px] font-medium leading-snug text-steel-50 group-hover:text-chrome">{a.title}</h3>
              <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-steel-400">{a.description}</p>
              <div className="mt-auto pt-5 text-[11px] text-steel-500">
                {a.difficulty[0]!.toUpperCase() + a.difficulty.slice(1)} · {a.readMinutes} min read
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* ── MEMBERSHIP CTA ───────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6">
        <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-lg border border-line-strong bg-[radial-gradient(ellipse_at_top,#5d8ef51a,transparent_60%),linear-gradient(180deg,#121419,#0a0b0e)] px-6 py-16 text-center sm:py-20">
          <CompassField className="pointer-events-none absolute left-1/2 top-0 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/3 opacity-60" />
          <div className="relative">
            <EmblemHero size={132} reflection className="mb-4" />
            <h2 className="chrome-text mx-auto max-w-3xl text-[30px] font-semibold uppercase leading-[1.02] tracking-[-0.025em] sm:text-[48px]">Markets move quickly. Your intelligence should too.</h2>
            <p className="mx-auto mt-5 max-w-xl text-[15px] text-steel-400">ATLAS, options intelligence, the news terminal, whale activity and public disclosures — in one membership.</p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Button asChild variant="primary" size="lg">
                <Link href="/pricing">Join NSALGO</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/atlas">See how Atlas works</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
