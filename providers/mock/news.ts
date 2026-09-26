/**
 * ─── MOCK DATA — SIMULATED ───
 * Headlines are generated from the simulator's own price moves so they stay
 * consistent with simulated quotes. They are attributed to "NSALGO Simulated
 * Wire" — never to a real publisher — and carry no outbound link.
 */
import { EQUITY_UNIVERSE, lookupSymbol } from "@/config/universe";
import { hashString, pick, seeded } from "@/lib/random";
import { fail, ok, type DataResult } from "@/types/data";
import type { MarketImpact, NewsArticle, NewsCategory, NewsFilter, Sentiment } from "@/types/news";
import { healthy, mockMeta } from "../meta";
import type { NewsProvider } from "../types";
import { mockQuote } from "./market";
import { nowSessionInfo } from "./simulator";

const PUBLISHER = "NSALGO Simulated Wire";

interface Draft {
  headline: string;
  summary: string;
  tickers: string[];
  categories: NewsCategory[];
  impact: MarketImpact;
  sentiment: Sentiment;
  breaking?: boolean;
}

function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(Math.abs(n) < 1 ? 2 : 1)}%`;
}

function drafts(): Draft[] {
  const out: Draft[] = [];
  const quotes = EQUITY_UNIVERSE.map((s) => mockQuote(s)).filter((q) => q && q.changePercent !== null);
  const sorted = [...quotes].sort((a, b) => (b!.changePercent ?? 0) - (a!.changePercent ?? 0));
  const spy = mockQuote("SPY");
  const qqq = mockQuote("QQQ");
  const vix = mockQuote("VIX");
  const tnx = mockQuote("US10Y");
  const btc = mockQuote("BTCUSD");
  const cl = mockQuote("CL");

  const spyCp = spy?.changePercent ?? 0;
  out.push({
    headline:
      Math.abs(spyCp) < 0.15
        ? `Stocks hold near flat; S&P 500 ${fmtPct(spyCp)}, Nasdaq ${fmtPct(qqq?.changePercent ?? 0)}`
        : `Stocks ${spyCp > 0 ? "advance" : "retreat"} as S&P 500 moves ${fmtPct(spyCp)}; Nasdaq ${fmtPct(qqq?.changePercent ?? 0)}`,
    summary: `Broad U.S. equity benchmarks ${Math.abs(spyCp) < 0.15 ? "were little changed" : spyCp > 0 ? "moved higher" : "moved lower"} in the session, with technology ${
      (qqq?.changePercent ?? 0) > spyCp ? "leading" : "lagging"
    } the wider market. Breadth and sector participation are summarised in the Markets view.`,
    tickers: ["SPY", "QQQ"],
    categories: ["markets"],
    impact: Math.abs(spyCp) > 1 ? "high" : "medium",
    sentiment: spyCp > 0.2 ? "positive" : spyCp < -0.2 ? "negative" : "neutral",
    breaking: Math.abs(spyCp) > 1.2,
  });

  const vixCp = vix?.changePercent ?? 0;
  out.push({
    headline: `Volatility index ${vixCp >= 0 ? "rises" : "eases"} to ${vix?.last?.toFixed(2) ?? "—"} as options demand ${vixCp >= 0 ? "picks up" : "cools"}`,
    summary: "Implied volatility on S&P 500 options shifted during the session. Traders watch the level relative to its recent range for signs of changing risk appetite.",
    tickers: ["VIX", "SPY"],
    categories: ["options", "markets"],
    impact: Math.abs(vixCp) > 6 ? "high" : "low",
    sentiment: vixCp > 3 ? "negative" : vixCp < -3 ? "positive" : "neutral",
  });

  const tnxCh = tnx?.change ?? 0;
  out.push({
    headline: `Treasury 10-year yield ${tnxCh >= 0 ? "climbs" : "slips"} to ${tnx?.last?.toFixed(2) ?? "—"}% ahead of inflation data`,
    summary: "Rates markets repositioned ahead of the next scheduled inflation release. Rate-sensitive sectors are tracking the move in yields.",
    tickers: ["US10Y", "XLRE", "XLU"],
    categories: ["economy", "fed", "macro"],
    impact: "medium",
    sentiment: "neutral",
  });

  out.push({
    headline: "Fed officials reiterate data-dependent approach in scheduled remarks",
    summary: "Policymakers emphasised that upcoming inflation and labour-market releases will guide the path of policy. No new policy decisions were announced.",
    tickers: ["SPY", "US2Y"],
    categories: ["fed", "economy"],
    impact: "medium",
    sentiment: "neutral",
  });

  out.push({
    headline: `Crude ${(cl?.changePercent ?? 0) >= 0 ? "gains" : "falls"} ${fmtPct(cl?.changePercent ?? 0)}; energy shares ${(cl?.changePercent ?? 0) >= 0 ? "firm" : "soften"}`,
    summary: "Oil futures moved with supply headlines and dollar strength. Integrated energy names tracked the commodity.",
    tickers: ["CL", "XOM", "CVX", "XLE"],
    categories: ["macro", "markets"],
    impact: "low",
    sentiment: (cl?.changePercent ?? 0) >= 0 ? "positive" : "negative",
  });

  out.push({
    headline: `Bitcoin ${(btc?.changePercent ?? 0) >= 0 ? "extends gains" : "pulls back"} ${fmtPct(btc?.changePercent ?? 0)}; crypto-linked equities follow`,
    summary: "Digital-asset prices moved over the past 24 hours, with exchange and miner equities tracking the underlying.",
    tickers: ["BTCUSD", "COIN"],
    categories: ["crypto"],
    impact: "low",
    sentiment: (btc?.changePercent ?? 0) >= 0 ? "positive" : "negative",
  });

  const leaders = sorted.slice(0, 5);
  const laggards = sorted.slice(-4).reverse();
  for (const q of leaders) {
    if (!q) continue;
    const info = lookupSymbol(q.symbol);
    const rand = seeded(q.symbol, "news");
    const ai = info?.industry === "Semiconductors" || ["MSFT", "GOOGL", "META", "PLTR", "ORCL"].includes(q.symbol);
    const reason = ai
      ? pick(rand, ["AI infrastructure demand remains in focus", "data-center spending commentary lifts sentiment", "AI product roadmap draws attention"])
      : pick(rand, ["analyst revisions turn higher", "sector rotation favours the group", "product update draws investor attention"]);
    out.push({
      headline: `${info?.name ?? q.symbol} shares rise ${fmtPct(q.changePercent ?? 0)} as ${reason}`,
      summary: `${q.symbol} traded higher on ${q.volume && q.avgVolume && q.volume > q.avgVolume * 0.6 ? "above-average" : "steady"} volume. The move places the stock among the session's leaders in the NSALGO coverage universe.`,
      tickers: [q.symbol],
      categories: ai ? ["technology", "ai"] : ["markets"],
      impact: (q.changePercent ?? 0) > 3 ? "high" : "medium",
      sentiment: "positive",
    });
  }
  for (const q of laggards) {
    if (!q) continue;
    const info = lookupSymbol(q.symbol);
    const rand = seeded(q.symbol, "news-down");
    out.push({
      headline: `${info?.name ?? q.symbol} slides ${fmtPct(q.changePercent ?? 0)} as ${pick(rand, ["investors digest guidance", "sector peers weaken", "valuation concerns resurface", "profit-taking follows a strong run"])}`,
      summary: `${q.symbol} underperformed the broader market. Atlas monitors whether the move breaks key trend levels or reverts intraday.`,
      tickers: [q.symbol],
      categories: ["markets"],
      impact: (q.changePercent ?? 0) < -3 ? "high" : "medium",
      sentiment: "negative",
    });
  }

  const earningsNames = ["NFLX", "JPM", "TSLA", "AAPL", "MSFT", "NVDA", "AMD"];
  const { session } = nowSessionInfo();
  const er = seeded(session, "earn");
  for (let i = 0; i < 3; i++) {
    const sym = pick(er, earningsNames);
    const info = lookupSymbol(sym);
    out.push({
      headline: `${info?.name ?? sym} earnings preview: options market implies elevated move`,
      summary: `Ahead of the scheduled report, implied volatility in near-dated ${sym} options sits above its recent average. Atlas surfaces implied-move context on the symbol page.`,
      tickers: [sym],
      categories: ["earnings", "options"],
      impact: "medium",
      sentiment: "neutral",
    });
  }

  out.push({
    headline: "Semiconductor index outperforms as AI capex narrative persists",
    summary: "Chipmakers traded as a group with investors weighing data-center demand against valuation.",
    tickers: ["SMH", "NVDA", "AMD", "AVGO"],
    categories: ["technology", "ai"],
    impact: "medium",
    sentiment: "positive",
  });
  out.push({
    headline: "Consumer spending data in focus as retail sales release approaches",
    summary: "Economists will watch control-group sales for signals on consumer resilience. Figures are shown in the economic calendar once published.",
    tickers: ["XLY", "WMT", "COST"],
    categories: ["economy"],
    impact: "medium",
    sentiment: "neutral",
  });
  out.push({
    headline: "Large-cap tech options see heavy near-dated call volume",
    summary: "Short-dated contracts accounted for a significant share of index and mega-cap options activity. See Options Flow for prints and classifications where available.",
    tickers: ["QQQ", "NVDA", "TSLA"],
    categories: ["options"],
    impact: "low",
    sentiment: "neutral",
  });
  return out;
}

let cache: { key: string; items: NewsArticle[] } | null = null;

function articles(): NewsArticle[] {
  const { session, elapsed } = nowSessionInfo();
  const key = `${session}|${Math.floor(elapsed / 10)}`;
  if (cache?.key === key) return cache.items;
  const now = Date.now();
  const items = drafts().map((d, i) => {
    const id = `sim-${hashString(`${session}|${d.headline.slice(0, 40)}|${i}`).toString(36)}`;
    const ageMin = Math.round(4 + i * 37 + (hashString(id) % 29));
    return {
      id,
      headline: d.headline,
      summary: d.summary,
      source: "mock",
      publisher: PUBLISHER,
      url: "",
      imageUrl: null,
      tickers: d.tickers,
      categories: d.breaking ? (["breaking", ...d.categories] as NewsCategory[]) : d.categories,
      publishedAt: new Date(now - ageMin * 60_000).toISOString(),
      fetchedAt: new Date(now).toISOString(),
      impact: d.impact,
      sentiment: d.sentiment,
      isBreaking: Boolean(d.breaking),
    } satisfies NewsArticle;
  });
  items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  cache = { key, items };
  return items;
}

export class MockNewsProvider implements NewsProvider {
  readonly id = "mock";
  readonly label = "NSALGO Simulated Wire";
  readonly isMock = true;

  async healthCheck() {
    return healthy("Simulated news feed operational (mock data)");
  }

  async list(filter: NewsFilter): Promise<DataResult<NewsArticle[]>> {
    let items = articles();
    if (filter.category) items = items.filter((a) => a.categories.includes(filter.category!) || (filter.category === "breaking" && a.isBreaking));
    if (filter.ticker) items = items.filter((a) => a.tickers.includes(filter.ticker!.toUpperCase()));
    if (filter.q) {
      const q = filter.q.toLowerCase();
      items = items.filter((a) => a.headline.toLowerCase().includes(q) || a.tickers.some((t) => t.toLowerCase() === q));
    }
    if (filter.before) items = items.filter((a) => a.publishedAt < filter.before!);
    return ok(items.slice(0, filter.limit ?? 50), mockMeta());
  }

  async get(id: string): Promise<DataResult<NewsArticle>> {
    const a = articles().find((x) => x.id === id);
    return a ? ok(a, mockMeta()) : fail("NOT_FOUND", "Article not found");
  }
}
