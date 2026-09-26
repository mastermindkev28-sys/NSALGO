import "server-only";
/**
 * ATLAS engine pipeline:
 *
 *   DATA → NORMALISATION → FEATURE ENGINEERING → MARKET REGIME → TECHNICAL
 *   ANALYSIS → OPTIONS ANALYSIS → NEWS/CATALYST ANALYSIS → SCORING MODEL →
 *   AI EXPLANATION → ATLAS SETUP → (persisted, lifecycle-tracked) → UI
 *
 * Signals are computed deterministically from provider data. The AI layer
 * only narrates them. Anything unavailable is reported as unavailable.
 */
import { lookupSymbol } from "@/config/universe";
import { db } from "@/db";
import { cached } from "@/lib/cache";
import { log } from "@/lib/logger";
import {
  addDays,
  CLOSE_MIN,
  currentSessionDate,
  daysBetween,
  isTradingDay,
  nextTradingDay,
  nyParts,
  nyTimeToUnix,
  sessionMinutesElapsed,
  sessionState,
  tradingDaysBack,
} from "@/lib/market-time";
import { hashString } from "@/lib/random";
import { providers } from "@/providers/registry";
import { explainSetup, summarizeMarket } from "@/services/ai";
import type { SetupDigest } from "@/services/ai/types";
import { getBreadth, getHistory, getQuotes, getSectors, getMovers } from "@/services/market";
import { getExpirations, getFlow, getOptionChain, listEarnings, listEconomicEvents, listNews } from "@/services/intel";
import type { AtlasConfig, AtlasMode, AtlasSetup, Catalyst, MarketRegime } from "@/types/atlas";
import type { EarningsEvent, EconomicEvent } from "@/types/disclosures";
import type { Bar, BreadthSnapshot, Quote, SectorPerformance } from "@/types/market";
import type { NewsArticle } from "@/types/news";
import type { OptionChain, OptionsFlowPrint } from "@/types/options";
import { getAtlasConfig } from "./config-store";
import { inferDirection, type ChainSummary, type FactorContext, type FlowSummary, type NewsSummary } from "./factors";
import { computeFeatures, type Features } from "./features";
import { pctReturn } from "./indicators";
import { evaluateLifecycle } from "./lifecycle";
import { computeRegime } from "./regime";
import { scoreSetup } from "./scoring";
import { buildLevels, buildOptionsPlan, pickExpiration, qualitative } from "./setup-builder";

export interface MarketContext {
  session: string;
  /** Session day-trade setups are planned for: today while open, otherwise the next session. */
  planningSession: string;
  marketOpen: boolean;
  sessionFraction: number;
  regime: MarketRegime;
  sectors: SectorPerformance[] | null;
  breadth: BreadthSnapshot | null;
  spyDaily: Bar[] | null;
  flow: OptionsFlowPrint[] | null;
  news: NewsArticle[] | null;
  earnings: EarningsEvent[] | null;
  econ: EconomicEvent[] | null;
  quotes: Quote[];
  dataMode: AtlasSetup["dataMode"];
  unavailable: string[];
}

const bars = async (symbol: string, range: "1M" | "1Y", interval: "1d") => {
  const r = await getHistory(symbol, range, interval);
  return r.ok && r.data.length ? r.data : null;
};

/* ── Stage 1–4: data, normalisation and market regime ─────────────────────── */
export async function getMarketContext(): Promise<MarketContext> {
  const r = await cached("atlas:ctx", 60_000, async () => {
    const session = currentSessionDate();
    const [spy, qqq, iwm, vixHist, quotesR, breadthR, sectorsR, flowR, newsR, earnR, econR] = await Promise.all([
      bars("SPY", "1Y", "1d"),
      bars("QQQ", "1Y", "1d"),
      bars("IWM", "1Y", "1d"),
      bars("VIX", "1M", "1d"),
      getQuotes(["SPY", "QQQ", "IWM", "DIA", "VIX", "US10Y"]),
      getBreadth(),
      getSectors(),
      getFlow({ limit: 2000 }),
      listNews({ limit: 100 }),
      listEarnings(session, addDays(session, 21)),
      listEconomicEvents(addDays(session, -1), addDays(session, 3)),
    ]);
    const quotes = quotesR.ok ? quotesR.data : [];
    const vix = quotes.find((q) => q.symbol === "VIX");
    const tnx = quotes.find((q) => q.symbol === "US10Y");
    const regime = computeRegime({
      spy,
      qqq,
      iwm,
      vix: vix ? { last: vix.last, changePercent: vix.changePercent, fiveDayChange: vixHist ? pctReturn(vixHist.map((b) => b.close), 5) : null } : null,
      breadth: breadthR.ok ? breadthR.data : null,
      sectors: sectorsR.ok ? sectorsR.data : null,
      tenYearChange: tnx?.change != null ? Math.round(tnx.change * 100) : null,
    });
    const unavailable: string[] = [];
    if (!flowR.ok) unavailable.push("options flow");
    if (!newsR.ok) unavailable.push("news");
    if (!earnR.ok) unavailable.push("earnings calendar");
    if (!econR.ok) unavailable.push("economic calendar");
    if (!breadthR.ok) unavailable.push("breadth");
    const mode = quotesR.ok ? quotesR.meta.mode : "live";
    const state = sessionState();
    const todayNy = nyParts().date;
    const planningSession = state === "open" ? session : isTradingDay(todayNy) && state === "pre" ? todayNy : nextTradingDay(todayNy);
    return {
      session,
      planningSession,
      marketOpen: state === "open",
      sessionFraction: sessionMinutesElapsed(session) / 390,
      regime,
      sectors: sectorsR.ok ? sectorsR.data : null,
      breadth: breadthR.ok ? breadthR.data : null,
      spyDaily: spy,
      flow: flowR.ok ? flowR.data : null,
      news: newsR.ok ? newsR.data : null,
      earnings: earnR.ok ? earnR.data : null,
      econ: econR.ok ? econR.data : null,
      quotes,
      dataMode: (mode === "mock" ? "mock" : mode === "delayed" ? "delayed" : "live") as AtlasSetup["dataMode"],
      unavailable,
    } satisfies MarketContext;
  });
  return r.value;
}

export async function getRegime(): Promise<MarketRegime> {
  return (await getMarketContext()).regime;
}

/* ── Stage 5–7 helpers ────────────────────────────────────────────────────── */
function flowSummary(ctx: MarketContext, symbol: string): FlowSummary | null {
  if (!ctx.flow) return null;
  const prints = ctx.flow.filter((p) => p.underlying === symbol);
  let bull = 0;
  let bear = 0;
  let classified = 0;
  for (const p of prints) {
    if (p.sentiment === "bullish") (bull += p.premium), classified++;
    else if (p.sentiment === "bearish") (bear += p.premium), classified++;
  }
  return { bullishPremium: bull, bearishPremium: bear, classified, total: prints.length };
}

function newsSummary(ctx: MarketContext, symbol: string): { summary: NewsSummary | null; articles: NewsArticle[] } {
  if (!ctx.news) return { summary: null, articles: [] };
  const articles = ctx.news.filter((a) => a.tickers.includes(symbol));
  const withS = articles.filter((a) => a.sentiment);
  return {
    summary: { count: articles.length, positive: withS.filter((a) => a.sentiment === "positive").length, negative: withS.filter((a) => a.sentiment === "negative").length, withSentiment: withS.length },
    articles,
  };
}

function chainSummary(chain: OptionChain | null): ChainSummary | null {
  if (!chain) return null;
  const sum = (xs: { openInterest: number | null }[]) => (xs.some((c) => c.openInterest !== null) ? xs.reduce((a, c) => a + (c.openInterest ?? 0), 0) : null);
  const spot = chain.underlyingPrice;
  const atm = spot !== null ? chain.calls.reduce<(typeof chain.calls)[number] | null>((b, c) => (!b || Math.abs(c.strike - spot) < Math.abs(b.strike - spot) ? c : b), null) : null;
  const spread = atm && atm.bid !== null && atm.ask !== null && atm.ask + atm.bid > 0 ? ((atm.ask - atm.bid) / ((atm.ask + atm.bid) / 2)) * 100 : null;
  return { callOi: sum(chain.calls), putOi: sum(chain.puts), atmSpreadPct: spread, ivRank: chain.ivRank, atmIv: chain.atmIv };
}

function buildCatalysts(ctx: MarketContext, symbol: string, f: Features, direction: "long" | "short", articles: NewsArticle[], flow: FlowSummary | null, mode: AtlasMode): Catalyst[] {
  const out: Catalyst[] = [];
  const e = ctx.earnings?.find((x) => x.symbol === symbol && x.date >= ctx.session);
  if (e && daysBetween(ctx.session, e.date) <= (mode === "day" ? 2 : 14)) {
    out.push({ kind: "earnings", label: `Earnings ${e.date}${e.time !== "unknown" ? ` (${e.time === "bmo" ? "before open" : "after close"})` : ""}`, date: e.date, reference: null });
  }
  for (const ev of (ctx.econ ?? []).filter((x) => x.importance === "high" && Date.parse(x.datetime) > Date.now()).slice(0, 2)) {
    out.push({ kind: "economic-event", label: `${ev.event} · ${ev.datetime.slice(0, 10)}`, date: ev.datetime, reference: ev.id });
  }
  for (const a of articles.slice(0, 2)) out.push({ kind: "news", label: a.headline, date: a.publishedAt, reference: a.id });
  const sector = lookupSymbol(symbol)?.sector;
  const sp = sector ? ctx.sectors?.find((s) => s.sector === sector) : undefined;
  if (sp?.relativeStrength != null && Math.abs(sp.relativeStrength) >= 0.75 && Math.sign(sp.relativeStrength) === (direction === "long" ? 1 : -1)) {
    out.push({ kind: "sector-move", label: `${sp.sector} ${sp.relativeStrength > 0 ? "outperforming" : "underperforming"} the S&P 500 by ${Math.abs(sp.relativeStrength).toFixed(2)} pts`, date: null, reference: sp.etf });
  }
  if ((direction === "long" && f.breakout20) || (direction === "short" && f.breakdown20)) {
    out.push({ kind: "technical-breakout", label: direction === "long" ? `Break above 20-session high ${f.high20?.toFixed(2)}` : `Break below 20-session low ${f.low20?.toFixed(2)}`, date: null, reference: null });
  }
  if (flow && flow.classified > 0) {
    const dirPrem = direction === "long" ? flow.bullishPremium : flow.bearishPremium;
    if (dirPrem >= 1_000_000) out.push({ kind: "options-activity", label: `$${(dirPrem / 1e6).toFixed(1)}M ${direction === "long" ? "bullish" : "bearish"}-classified options premium today`, date: null, reference: null });
  }
  return out;
}

export interface AnalyzeOptions {
  withOptions: boolean;
  withExplanation: boolean;
}

export interface Analysis {
  setup: AtlasSetup;
  features: Features;
  articles: NewsArticle[];
  qualifies: boolean;
}

/* ── Stages 5–10 for one symbol ───────────────────────────────────────────── */
export async function analyzeSymbol(symbol: string, mode: AtlasMode, ctx: MarketContext, cfg: AtlasConfig, opts: AnalyzeOptions): Promise<Analysis | null> {
  const sym = symbol.toUpperCase();
  const info = lookupSymbol(sym);
  if (info && info.assetClass !== "equity" && info.assetClass !== "etf") return null;
  const daily = await bars(sym, "1Y", "1d");
  if (!daily) return null;
  let intraday: Bar[] | undefined;
  if (mode === "day") {
    const r = await getHistory(sym, "1D", "5m");
    intraday = r.ok ? r.data : undefined;
  }
  const f = computeFeatures({ daily, intraday, benchmark: ctx.spyDaily ?? undefined, sessionFraction: ctx.sessionFraction || 1 });
  if (!f) return null;

  const { direction } = inferDirection(f);
  const flow = flowSummary(ctx, sym);
  const { summary: news, articles } = newsSummary(ctx, sym);
  const nextEarnings = ctx.earnings?.find((x) => x.symbol === sym && x.date >= ctx.session);
  const earningsInDays = ctx.earnings === null ? undefined : nextEarnings ? daysBetween(ctx.session, nextEarnings.date) : null;
  const horizonEnd = Date.now() + (mode === "day" ? 1 : 2) * 86_400_000;
  const macroEventsSoon = ctx.econ === null ? undefined : ctx.econ.filter((e) => e.importance === "high" && Date.parse(e.datetime) > Date.now() && Date.parse(e.datetime) < horizonEnd).length;
  const sectorPerf = info?.sector ? (ctx.sectors?.find((s) => s.sector === info.sector) ?? null) : null;

  let chain: OptionChain | null = null;
  if (opts.withOptions && info?.optionable) {
    const exps = await getExpirations(sym);
    const exp = exps.ok ? pickExpiration(exps.data, mode, ctx.session) : null;
    if (exp) {
      const c = await getOptionChain(sym, exp);
      chain = c.ok ? c.data : null;
    }
  }
  const catalysts = buildCatalysts(ctx, sym, f, direction, articles, flow, mode);
  const fctx: FactorContext = {
    mode,
    direction,
    f,
    regime: ctx.regime,
    sector: sectorPerf,
    breadth: ctx.breadth,
    flow,
    chain: chainSummary(chain),
    news,
    earningsInDays,
    macroEventsSoon,
    catalysts,
  };
  const score = scoreSetup(fctx, cfg);
  const levels = buildLevels(f, direction, mode);
  const optionsBuilt = chain ? buildOptionsPlan(chain, direction, mode, cfg.thresholds) : { tradeType: "stock" as const, plan: null, note: opts.withOptions ? "Options chain unavailable — shares-only framework shown." : "" };
  const q = qualitative(f, direction);
  const regimeAligned = ctx.regime.risk === "mixed" ? "neutral" : (ctx.regime.risk === "risk-on") === (direction === "long") ? "aligned" : "counter";

  const confirmations = [
    { label: direction === "long" ? "Price above 20-day average" : "Price below 20-day average", met: f.sma20 !== null && (direction === "long" ? f.price > f.sma20 : f.price < f.sma20), detail: f.sma20 !== null ? `20-day ${f.sma20.toFixed(2)} · last ${f.price.toFixed(2)}` : "Data unavailable" },
    { label: "Relative volume ≥ 1.3×", met: (f.rvol ?? 0) >= 1.3, detail: f.rvol !== null ? `${f.rvol.toFixed(2)}×` : "Data unavailable" },
    { label: direction === "long" ? "MACD histogram positive" : "MACD histogram negative", met: f.macdHist !== null && (direction === "long" ? f.macdHist > 0 : f.macdHist < 0), detail: f.macdHist !== null ? f.macdHist.toFixed(3) : "Data unavailable" },
    { label: direction === "long" ? "Outperforming SPY (20 sessions)" : "Underperforming SPY (20 sessions)", met: f.rs20 !== null && (direction === "long" ? f.rs20 > 0 : f.rs20 < 0), detail: f.rs20 !== null ? `${f.rs20 >= 0 ? "+" : ""}${f.rs20.toFixed(2)} pts` : "Data unavailable" },
    { label: "Market regime aligned", met: regimeAligned === "aligned", detail: `${ctx.regime.risk}` },
    ...(mode === "day" ? [{ label: direction === "long" ? "Holding above VWAP" : "Holding below VWAP", met: f.aboveVwap !== null && f.aboveVwap === (direction === "long"), detail: f.vwap !== null ? `VWAP ${f.vwap.toFixed(2)}` : "Data unavailable" }] : []),
    { label: "Options liquidity adequate", met: optionsBuilt.plan !== null, detail: optionsBuilt.plan ? `Spread ${optionsBuilt.plan.spreadPct ?? "—"}%` : optionsBuilt.note || "Not evaluated" },
  ];

  const keySession = mode === "day" ? ctx.planningSession : ctx.session;
  const id = `${mode}-${sym}-${keySession}-${direction}-${hashString(`${sym}|${mode}|${keySession}|${direction}`).toString(36)}`;
  const generatedAt = new Date().toISOString();
  const expiresAt =
    mode === "day"
      ? new Date(nyTimeToUnix(ctx.planningSession, CLOSE_MIN) * 1000).toISOString()
      : new Date(nyTimeToUnix(addDays(ctx.session, 21), CLOSE_MIN) * 1000).toISOString();

  const digest: SetupDigest = {
    symbol: sym,
    name: info?.name ?? sym,
    mode,
    direction,
    tradeType: optionsBuilt.tradeType,
    atlasScore: score.value,
    coverage: score.coverage,
    price: Math.round(f.price * 100) / 100,
    entry: levels.entry,
    target: levels.target,
    invalidation: levels.invalidation,
    riskReward: levels.riskReward,
    regime: `${ctx.regime.risk} (${ctx.regime.summary})`,
    factors: score.components.filter((c) => c.weight > 0).map((c) => ({ factor: c.label, score: c.score, evidence: c.evidence })),
    catalysts: catalysts.map((c) => c.label),
    confirmations: confirmations.map((c) => ({ label: c.label, met: c.met })),
    options: optionsBuilt.plan
      ? { structure: optionsBuilt.tradeType, ivRank: optionsBuilt.plan.ivRank, legs: optionsBuilt.plan.legs.map((l) => `${l.action} ${l.expiration} ${l.strike} ${l.right} (Δ ${l.delta ?? "n/a"})`) }
      : null,
  };
  const explained = opts.withExplanation ? await explainSetup(digest, `${id}:${score.value}`) : { narrative: (await import("@/services/ai/template")).templateSetupNarrative(digest), generatedBy: "template" };

  const setup: AtlasSetup = {
    id,
    symbol: sym,
    name: info?.name ?? sym,
    assetClass: info?.assetClass === "etf" ? "etf" : "equity",
    sector: info?.sector ?? null,
    mode,
    direction,
    tradeType: optionsBuilt.tradeType,
    score,
    ...q,
    marketAlignment: regimeAligned,
    price: Math.round(f.price * 100) / 100,
    entry: levels.entry,
    target: levels.target,
    invalidation: levels.invalidation,
    riskReward: levels.riskReward,
    holdingHorizon: levels.holdingHorizon,
    options: optionsBuilt.plan,
    catalysts,
    confirmations,
    explanation: { ...explained.narrative, generatedBy: explained.generatedBy, inputsDigest: digest as unknown as Record<string, unknown>, generatedAt },
    status: "generated",
    statusHistory: [{ status: "generated", at: generatedAt, price: Math.round(f.price * 100) / 100 }],
    generatedAt,
    expiresAt,
    dataMode: ctx.dataMode,
  };
  const qualifies = score.value >= cfg.thresholds.minScore && score.coverage >= cfg.thresholds.minCoverage;
  return { setup, features: f, articles, qualifies };
}

/* ── Lifecycle + persistence ──────────────────────────────────────────────── */
async function barsSinceGeneration(setup: AtlasSetup): Promise<Bar[]> {
  if (setup.mode === "day") {
    const r = await getHistory(setup.symbol, "1D", "5m");
    return r.ok ? r.data : [];
  }
  const r = await getHistory(setup.symbol, "3M", "1d");
  if (!r.ok) return [];
  const genDay = setup.generatedAt.slice(0, 10);
  return r.data.filter((b) => new Date(b.time * 1000).toISOString().slice(0, 10) > genDay).map((b) => ({ ...b, time: b.time + 20 * 3600 }));
}

export async function trackSetup(fresh: AtlasSetup): Promise<AtlasSetup> {
  const repo = db().atlas;
  const existing = await repo.getSetup(fresh.id);
  // Generation-time facts (levels, score, structure, explanation) are immutable;
  // only the lifecycle advances. Later scans never rewrite a recorded setup.
  const base: AtlasSetup = existing ?? fresh;
  const lc = evaluateLifecycle(base, await barsSinceGeneration(base));
  return repo.upsertSetup({ ...base, status: lc.status, statusHistory: lc.statusHistory });
}

/** Re-evaluates open setups that are no longer in the live scan (scheduled job). */
export async function refreshOpenSetups(limit = 300): Promise<number> {
  const open = await db().atlas.listSetups({ status: "open", limit });
  let changed = 0;
  for (const s of open) {
    const lc = evaluateLifecycle(s, await barsSinceGeneration(s));
    if (lc.status !== s.status || lc.statusHistory.length !== s.statusHistory.length) {
      await db().atlas.upsertSetup({ ...s, status: lc.status, statusHistory: lc.statusHistory });
      changed++;
    }
  }
  return changed;
}

/* ── Scan: the ranked opportunity list ────────────────────────────────────── */
export interface ScanResult {
  mode: AtlasMode;
  setups: AtlasSetup[];
  evaluated: number;
  regime: MarketRegime;
  configVersion: string;
  generatedAt: string;
  unavailable: string[];
}

export async function scan(mode: AtlasMode, opts: { persist?: boolean } = {}): Promise<ScanResult> {
  const cfg = await getAtlasConfig();
  const ctx = await getMarketContext();
  const ttl = mode === "day" ? 3 * 60_000 : 15 * 60_000;
  const r = await cached(`atlas:scan:${mode}:${ctx.session}:${cfg.version}`, ttl, async () => {
    const prelim = (
      await Promise.all(cfg.universe.map((s) => analyzeSymbol(s, mode, ctx, cfg, { withOptions: false, withExplanation: false }).catch(() => null)))
    ).filter((a): a is Analysis => a !== null);
    const candidates = prelim
      .filter((a) => a.setup.score.value >= cfg.thresholds.minScore - 6)
      .sort((a, b) => b.setup.score.value - a.setup.score.value)
      .slice(0, Math.ceil(cfg.thresholds.maxSetupsPerRun * 1.5));
    const detailed = (
      await Promise.all(candidates.map((a) => analyzeSymbol(a.setup.symbol, mode, ctx, cfg, { withOptions: true, withExplanation: true }).catch(() => null)))
    ).filter((a): a is Analysis => a !== null && a.qualifies);
    const top = detailed.sort((a, b) => b.setup.score.value - a.setup.score.value).slice(0, cfg.thresholds.maxSetupsPerRun);
    let setups = top.map((a) => a.setup);
    if (opts.persist !== false) {
      try {
        setups = (await Promise.all(setups.map(trackSetup))).sort((a, b) => b.score.value - a.score.value);
      } catch (e) {
        log.error("atlas", "Failed to persist setups", { error: (e as Error).message });
      }
    }
    return { mode, setups, evaluated: prelim.length, regime: ctx.regime, configVersion: cfg.version, generatedAt: new Date().toISOString(), unavailable: ctx.unavailable } satisfies ScanResult;
  });
  return r.value;
}

/** Full intelligence for one symbol in both modes (not thresholded). */
export async function symbolIntelligence(symbol: string) {
  const cfg = await getAtlasConfig();
  const ctx = await getMarketContext();
  const r = await cached(`atlas:sym:${symbol.toUpperCase()}:${ctx.session}:${cfg.version}`, 90_000, async () => {
    const [day, swing] = await Promise.all([
      analyzeSymbol(symbol, "day", ctx, cfg, { withOptions: true, withExplanation: true }),
      analyzeSymbol(symbol, "swing", ctx, cfg, { withOptions: true, withExplanation: true }),
    ]);
    return { day, swing, regime: ctx.regime, unavailable: ctx.unavailable };
  });
  return r.value;
}

/** AI market brief grounded in the current context. */
export async function marketBrief() {
  const ctx = await getMarketContext();
  const [gain, lose] = await Promise.all([getMovers("gainers", 5), getMovers("losers", 5)]);
  const digest = {
    regime: { label: ctx.regime.risk === "risk-on" ? "Risk-On" : ctx.regime.risk === "risk-off" ? "Risk-Off" : "Mixed", summary: ctx.regime.summary, signals: ctx.regime.signals.map((s) => ({ label: s.label, value: s.value })) },
    indices: ctx.quotes.filter((q) => ["SPY", "QQQ", "IWM", "DIA"].includes(q.symbol)).map((q) => ({ symbol: q.symbol, changePercent: q.changePercent })),
    leaders: gain.ok ? gain.data.map((q) => ({ symbol: q.symbol, changePercent: q.changePercent })) : [],
    laggards: lose.ok ? lose.data.map((q) => ({ symbol: q.symbol, changePercent: q.changePercent })) : [],
    headlines: (ctx.news ?? []).slice(0, 6).map((n) => n.headline),
    upcomingEvents: (ctx.econ ?? []).filter((e) => Date.parse(e.datetime) > Date.now() && e.importance === "high").slice(0, 3).map((e) => `${e.event} (${e.datetime.slice(0, 10)})`),
  };
  const out = await summarizeMarket(digest, `${ctx.session}:${Math.floor(Date.now() / 600_000)}`);
  return { ...out, digest, regime: ctx.regime };
}

/* ── Simulated history backfill (DATA_MODE=mock only) ─────────────────────── */
/**
 * Replays the swing engine point-in-time over past simulated sessions and
 * records every qualifying setup with its eventual outcome — winners and
 * losers alike — so the History view can be exercised. Only technical factors
 * are available historically, which is reflected in each setup's coverage.
 */
export async function backfillSimulatedHistory(sessions = 30): Promise<number> {
  if (!providers().market.isMock) return 0;
  const repo = db().atlas;
  const existing = await repo.listSetups({ mode: "swing", limit: 5000 });
  if (existing.some((s) => s.id.endsWith("-bf"))) return 0;
  const cfg = await getAtlasConfig();
  const today = currentSessionDate();
  const dates = tradingDaysBack(today, sessions + 1).slice(0, -1);
  const spyFull = (await bars("SPY", "1Y", "1d")) ?? [];
  const dayOf = (b: Bar) => new Date(b.time * 1000).toISOString().slice(0, 10);
  let n = 0;
  for (const date of dates) {
    const spy = spyFull.filter((b) => dayOf(b) <= date);
    const regime = computeRegime({ spy, qqq: null, iwm: null, vix: null, breadth: null, sectors: null, tenYearChange: null });
    const results: AtlasSetup[] = [];
    for (const sym of cfg.universe) {
      const full = await bars(sym, "1Y", "1d");
      if (!full) continue;
      const hist = full.filter((b) => dayOf(b) <= date);
      const f = computeFeatures({ daily: hist, benchmark: spy });
      if (!f) continue;
      const { direction } = inferDirection(f);
      const fctx: FactorContext = { mode: "swing", direction, f, regime, sector: null, breadth: null, flow: null, chain: null, news: null, earningsInDays: undefined, macroEventsSoon: undefined, catalysts: [] };
      const score = scoreSetup(fctx, cfg);
      if (score.value < cfg.thresholds.minScore) continue;
      const levels = buildLevels(f, direction, "swing");
      const genAt = new Date(nyTimeToUnix(date, CLOSE_MIN) * 1000).toISOString();
      const expiresAt = new Date(nyTimeToUnix(addDays(date, 21), CLOSE_MIN) * 1000).toISOString();
      const base: AtlasSetup = {
        id: `swing-${sym}-${date}-${direction}-bf`,
        symbol: sym,
        name: lookupSymbol(sym)?.name ?? sym,
        assetClass: lookupSymbol(sym)?.assetClass === "etf" ? "etf" : "equity",
        sector: lookupSymbol(sym)?.sector ?? null,
        mode: "swing",
        direction,
        tradeType: "stock",
        score,
        ...qualitative(f, direction),
        marketAlignment: regime.risk === "mixed" ? "neutral" : (regime.risk === "risk-on") === (direction === "long") ? "aligned" : "counter",
        price: Math.round(f.price * 100) / 100,
        ...levels,
        options: null,
        catalysts: [],
        confirmations: [],
        explanation: {
          whyItAppeared: "Point-in-time replay on simulated data using technical factors only.",
          risks: `Invalidation ${levels.invalidation}.`,
          catalystSummary: "Not evaluated in replay.",
          thesis: "Simulated backfill record.",
          generatedBy: "template (simulated backfill)",
          inputsDigest: { date, score: score.value, coverage: score.coverage },
          generatedAt: genAt,
        },
        status: "generated",
        statusHistory: [{ status: "generated", at: genAt, price: Math.round(f.price * 100) / 100 }],
        generatedAt: genAt,
        expiresAt,
        dataMode: "mock",
      };
      const after = full.filter((b) => dayOf(b) > date).map((b) => ({ ...b, time: b.time + 20 * 3600 }));
      const lc = evaluateLifecycle(base, after);
      results.push({ ...base, status: lc.status, statusHistory: lc.statusHistory });
    }
    for (const s of results.sort((a, b) => b.score.value - a.score.value).slice(0, 3)) {
      await repo.upsertSetup(s);
      n++;
    }
  }
  return n;
}
