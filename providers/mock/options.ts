/** ─── MOCK DATA — SIMULATED ─── OptionsDataProvider: Black–Scholes priced chains and synthetic flow. */
import { UNIVERSE } from "@/config/universe";
import { blackScholes, occSymbol, strikeStep } from "@/lib/options-math";
import { addDays, daysBetween, isTradingDay, nyTimeToUnix, OPEN_MIN, thirdFriday } from "@/lib/market-time";
import { gaussian, hashString, pick, range, seeded } from "@/lib/random";
import { fail, ok, type DataResult } from "@/types/data";
import type {
  FlowExecution,
  FlowFilter,
  FlowIntent,
  FlowSentiment,
  FlowSide,
  OptionChain,
  OptionContract,
  OptionRight,
  OptionsFlowPrint,
} from "@/types/options";
import { healthy, mockMeta } from "../meta";
import type { OptionsDataProvider } from "../types";
import { mockQuote } from "./market";
import { simParams, nowSessionInfo } from "./simulator";

export const OPTIONABLE = UNIVERSE.filter((u) => u.optionable).map((u) => u.symbol);

export function mockExpirations(today: string): string[] {
  const out = new Set<string>();
  let d = today;
  let fridays = 0;
  while (fridays < 7) {
    d = addDays(d, 1);
    const wd = new Date(`${d}T12:00:00Z`).getUTCDay();
    if (wd === 5) {
      let exp = d;
      if (!isTradingDay(exp)) exp = addDays(exp, -1);
      out.add(exp);
      fridays++;
    }
  }
  const [y, m] = today.split("-").map(Number) as [number, number];
  for (let i = 0; i < 7; i++) {
    const month = (m - 1 + i) % 12;
    const year = y + Math.floor((m - 1 + i) / 12);
    const tf = thirdFriday(year, month);
    if (tf > today) out.add(tf);
  }
  return [...out].sort();
}

function ivFor(symbol: string, spot: number, strike: number, dte: number, day: string): number {
  const base = simParams(symbol)?.ivBase ?? 0.3;
  const dayNoise = 1 + 0.12 * gaussian(seeded(symbol, day, "iv"));
  const m = Math.log(strike / spot);
  const smile = 1 + 2.4 * m * m - 0.45 * m;
  const term = 1 + 0.06 * Math.log1p(dte / 30);
  return Math.max(0.05, base * dayNoise * smile * term);
}

export function mockIvRank(symbol: string, day: string): number {
  return Math.round(range(seeded(symbol, day, "ivr"), 6, 94));
}

function buildContracts(symbol: string, spot: number, expiration: string, day: string, sessionFraction: number): OptionContract[] {
  const dte = Math.max(0, daysBetween(day, expiration));
  const years = Math.max(dte, 0.25) / 365;
  const step = strikeStep(spot);
  const center = Math.round(spot / step) * step;
  const width = Math.max(8, Math.min(16, Math.round((spot * 0.18) / step)));
  const avgVol = simParams(symbol)?.avgVolume ?? 5_000_000;
  const liquidity = Math.max(0.3, Math.log10(avgVol) - 5);
  const out: OptionContract[] = [];
  for (let i = -width; i <= width; i++) {
    const strike = Math.round((center + i * step) * 100) / 100;
    if (strike <= 0) continue;
    for (const right of ["call", "put"] as OptionRight[]) {
      const iv = ivFor(symbol, spot, strike, dte, day);
      const bs = blackScholes(right, spot, strike, years, iv);
      const rand = seeded(symbol, expiration, strike, right, day);
      const mny = Math.abs(Math.log(strike / spot)) / (iv * Math.sqrt(years));
      const oi = Math.round(Math.exp(-0.9 * mny) * 4000 * liquidity * range(rand, 0.4, 1.6) * (dte < 10 ? 1.3 : 1));
      const vol = Math.round(oi * range(rand, 0.02, 0.9) * sessionFraction * (dte < 8 ? 1.6 : 1));
      const mark = Math.max(0.01, bs.price);
      const halfSpread = Math.max(0.01, mark * (0.012 + 0.02 * Math.min(mny, 3)) + 0.01) / 2;
      const r2 = (n: number) => Math.round(n * 100) / 100;
      out.push({
        contract: occSymbol(symbol, expiration, right, strike),
        underlying: symbol,
        right,
        strike,
        expiration,
        dte,
        bid: r2(Math.max(0, mark - halfSpread)),
        ask: r2(mark + halfSpread),
        last: r2(mark * (1 + 0.01 * gaussian(rand))),
        mark: r2(mark),
        volume: vol,
        openInterest: oi,
        impliedVolatility: Math.round(iv * 10000) / 10000,
        delta: Math.round(bs.delta * 1000) / 1000,
        gamma: Math.round(bs.gamma * 10000) / 10000,
        theta: Math.round(bs.theta * 1000) / 1000,
        vega: Math.round(bs.vega * 1000) / 1000,
      });
    }
  }
  return out;
}

export class MockOptionsDataProvider implements OptionsDataProvider {
  readonly id = "mock";
  readonly label = "NSALGO Simulator";
  readonly isMock = true;

  async healthCheck() {
    return healthy("Simulated options chains operational (mock data)");
  }

  async getExpirations(symbol: string): Promise<DataResult<string[]>> {
    if (!OPTIONABLE.includes(symbol.toUpperCase())) return fail("NOT_FOUND", `No listed options for ${symbol}`);
    const { session } = nowSessionInfo();
    return ok(mockExpirations(session), mockMeta());
  }

  async getChain(symbol: string, expiration?: string): Promise<DataResult<OptionChain>> {
    const sym = symbol.toUpperCase();
    if (!OPTIONABLE.includes(sym)) return fail("NOT_FOUND", `No listed options for ${sym}`);
    const q = mockQuote(sym);
    if (!q?.last) return fail("PROVIDER_UNAVAILABLE", "Underlying quote unavailable");
    const { session, elapsed } = nowSessionInfo();
    const expirations = mockExpirations(session);
    const exp = expiration && expirations.includes(expiration) ? expiration : expirations[0];
    if (!exp) return fail("NOT_FOUND", "No expirations");
    const frac = Math.max(0.08, elapsed / 390);
    const contracts = buildContracts(sym, q.last, exp, session, frac);
    const atm = contracts
      .filter((c) => c.right === "call")
      .reduce<OptionContract | null>((best, c) => (!best || Math.abs(c.strike - q.last!) < Math.abs(best.strike - q.last!) ? c : best), null);
    return ok(
      {
        underlying: sym,
        underlyingPrice: q.last,
        expirations,
        expiration: exp,
        calls: contracts.filter((c) => c.right === "call"),
        puts: contracts.filter((c) => c.right === "put"),
        ivRank: mockIvRank(sym, session),
        atmIv: atm?.impliedVolatility ?? null,
      },
      mockMeta(),
    );
  }

  async getFlow(filter: FlowFilter): Promise<DataResult<OptionsFlowPrint[]>> {
    const prints = generateFlow().filter((p) => {
      if (filter.symbol && p.underlying !== filter.symbol.toUpperCase()) return false;
      if (filter.right && p.right !== filter.right) return false;
      if (filter.minPremium && p.premium < filter.minPremium) return false;
      if (filter.sentiment && p.sentiment !== filter.sentiment) return false;
      if (filter.execution && p.execution !== filter.execution) return false;
      if (filter.unusualOnly && !(p.volume && p.openInterest && p.volume > p.openInterest)) return false;
      return true;
    });
    return ok(prints.slice(0, filter.limit ?? 100), mockMeta());
  }
}

let flowCache: { key: string; prints: OptionsFlowPrint[] } | null = null;

function generateFlow(): OptionsFlowPrint[] {
  const { session, elapsed } = nowSessionInfo();
  const key = `${session}|${elapsed}`;
  if (flowCache?.key === key) return flowCache.prints;
  const expirations = mockExpirations(session);
  const prints: OptionsFlowPrint[] = [];
  for (const sym of OPTIONABLE) {
    const q = mockQuote(sym);
    if (!q?.last) continue;
    const p = simParams(sym);
    const intensity = Math.max(2, Math.round(Math.log10(p?.avgVolume ?? 1e6) * 3 - 12));
    const bias = (q.changePercent ?? 0) / 2; // flow leans with the tape
    const rand = seeded(sym, session, "flow");
    const total = Math.round(intensity * range(rand, 0.6, 1.6));
    for (let i = 0; i < total; i++) {
      const minute = Math.floor(rand() * 390);
      if (minute > elapsed) continue;
      const right: OptionRight = rand() < 0.5 + bias * 0.15 ? "call" : "put";
      const exp = pick(rand, expirations.slice(0, 6));
      const dte = daysBetween(session, exp);
      const step = strikeStep(q.last);
      const otm = Math.round(range(rand, -2, 6)) * step;
      const strike = Math.round((q.last + (right === "call" ? otm : -otm)) / step) * step;
      const iv = ivFor(sym, q.last, strike, dte, session);
      const bs = blackScholes(right, q.last, strike, Math.max(dte, 0.25) / 365, iv);
      const price = Math.max(0.05, Math.round(bs.price * 100) / 100);
      const contracts = Math.round(Math.exp(range(rand, 4.2, 8.6)));
      const premium = Math.round(contracts * price * 100);
      if (premium < 50_000) continue;
      const side: FlowSide = pick(rand, ["ask", "ask", "bid", "mid", null] as const);
      const execution: FlowExecution = pick(rand, ["sweep", "block", "split", "single", null] as const);
      const intent: FlowIntent = rand() < 0.45 ? pick(rand, ["opening", "closing"] as const) : null;
      const oi = Math.round(range(rand, 200, 30000));
      const volume = Math.round(contracts * range(rand, 1, 4));
      let sentiment: FlowSentiment = null;
      if (side === "ask") sentiment = right === "call" ? "bullish" : "bearish";
      else if (side === "bid") sentiment = right === "call" ? "bearish" : "bullish";
      else if (side === "mid") sentiment = "neutral";
      prints.push({
        id: `mock-${hashString(`${sym}${session}${i}`).toString(36)}`,
        timestamp: new Date((nyTimeToUnix(session, OPEN_MIN + minute) + Math.floor(rand() * 59)) * 1000).toISOString(),
        underlying: sym,
        right,
        strike,
        expiration: exp,
        dte,
        premium,
        contracts,
        price,
        spot: q.last,
        volume,
        openInterest: oi,
        impliedVolatility: Math.round(iv * 10000) / 10000,
        execution,
        side,
        intent,
        sentiment,
        source: "mock",
      });
    }
  }
  prints.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  flowCache = { key, prints };
  return prints;
}
