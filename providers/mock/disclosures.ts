/**
 * ─── MOCK DATA — SIMULATED ───
 * Public-disclosure records for development. To avoid attributing fabricated
 * transactions to real people or firms, every person and entity here is
 * fictional and explicitly marked "(simulated)". Tickers are real symbols so
 * the rest of the product (charts, Atlas) can link through.
 */
import { EQUITY_UNIVERSE, lookupSymbol } from "@/config/universe";
import { addDays, daysBetween, previousTradingDay } from "@/lib/market-time";
import { hashString, pick, range, seeded } from "@/lib/random";
import { ok, type DataResult } from "@/types/data";
import type {
  CongressionalDisclosure,
  DisclosureFilter,
  EarningsEvent,
  EconomicEvent,
  InsiderTransaction,
  InsiderTransactionType,
  InstitutionalActivity,
  InstitutionalCategory,
} from "@/types/disclosures";
import { healthy, mockMeta } from "../meta";
import type {
  CongressionalDisclosureProvider,
  EconomicCalendarProvider,
  InsiderDataProvider,
  InstitutionalDataProvider,
} from "../types";
import { mockQuote } from "./market";
import { nowSessionInfo } from "./simulator";

const FIRST = ["Alex", "Jordan", "Morgan", "Taylor", "Casey", "Riley", "Avery", "Quinn", "Reese", "Harper", "Rowan", "Emerson"];
const LAST = ["Hale", "Whitmore", "Castellan", "Okafor", "Lindqvist", "Marlowe", "Sato", "Delacroix", "Brennan", "Vasquez", "Ashford", "Kerr"];
const ROLES = ["Chief Executive Officer", "Chief Financial Officer", "Director", "EVP, Operations", "General Counsel", "10% Owner", "Chief Technology Officer"];
const FUNDS = ["Meridian Ridge Capital", "Northwall Partners", "Halcyon Point Advisors", "Granite Arc Management", "Silverline Global", "Tidewater Quant", "Obsidian Bay Capital"];
const MEMBERS: { name: string; chamber: "house" | "senate"; party: "D" | "R" | "I"; state: string }[] = [
  { name: "Rep. Dana Whitfield", chamber: "house", party: "D", state: "CA" },
  { name: "Rep. Marcus Hollen", chamber: "house", party: "R", state: "TX" },
  { name: "Rep. Elena Voss", chamber: "house", party: "D", state: "NY" },
  { name: "Rep. Grant Ellery", chamber: "house", party: "R", state: "FL" },
  { name: "Sen. Patricia Lorne", chamber: "senate", party: "R", state: "OH" },
  { name: "Sen. Victor Amani", chamber: "senate", party: "D", state: "IL" },
  { name: "Sen. Claire Donnelly", chamber: "senate", party: "I", state: "VT" },
];
const RANGES: { label: string; min: number; max: number | null }[] = [
  { label: "$1,001 – $15,000", min: 1001, max: 15000 },
  { label: "$15,001 – $50,000", min: 15001, max: 50000 },
  { label: "$50,001 – $100,000", min: 50001, max: 100000 },
  { label: "$100,001 – $250,000", min: 100001, max: 250000 },
  { label: "$250,001 – $500,000", min: 250001, max: 500000 },
  { label: "$500,001 – $1,000,000", min: 500001, max: 1000000 },
  { label: "$1,000,001 – $5,000,000", min: 1000001, max: 5000000 },
];

const SIM = " (simulated)";

function days(n: number): string[] {
  const { session } = nowSessionInfo();
  const out: string[] = [];
  let d = session;
  for (let i = 0; i < n; i++) {
    out.push(d);
    d = previousTradingDay(d);
  }
  return out;
}

let insiderCache: { key: string; rows: InsiderTransaction[] } | null = null;
function insiders(): InsiderTransaction[] {
  const dates = days(45);
  const key = dates[0] ?? "";
  if (insiderCache?.key === key) return insiderCache.rows;
  const rows: InsiderTransaction[] = [];
  dates.forEach((date, di) => {
    const rand = seeded("insider", date);
    const n = 2 + Math.floor(rand() * 4);
    for (let i = 0; i < n; i++) {
      const ticker = pick(rand, EQUITY_UNIVERSE);
      const info = lookupSymbol(ticker);
      const px = mockQuote(ticker)?.last ?? 100;
      const type = pick(rand, ["sale", "sale", "sale", "purchase", "option-exercise", "award", "tax-withholding"] as InsiderTransactionType[]);
      const code = { sale: "S", purchase: "P", "option-exercise": "M", award: "A", gift: "G", "tax-withholding": "F", other: "J" }[type];
      const shares = Math.round(Math.exp(range(rand, 6.5, 11.5)));
      const price = type === "award" ? 0 : Math.round(px * range(rand, 0.93, 1.05) * 100) / 100;
      const txDate = previousTradingDay(date);
      rows.push({
        id: `sim-ins-${hashString(`${date}${i}`).toString(36)}`,
        person: `${pick(rand, FIRST)} ${pick(rand, LAST)}${SIM}`,
        company: info?.name ?? ticker,
        ticker,
        role: pick(rand, ROLES),
        form: "4",
        transactionType: type,
        transactionCode: code,
        shares,
        price,
        value: price ? Math.round(shares * price) : null,
        sharesOwnedAfter: Math.round(shares * range(rand, 2, 40)),
        transactionDate: txDate,
        filingDate: di === 0 ? date : date,
        filingUrl: "",
        source: "mock",
      });
    }
  });
  insiderCache = { key, rows };
  return rows;
}

let instCache: { key: string; rows: InstitutionalActivity[] } | null = null;
function institutional(): InstitutionalActivity[] {
  const dates = days(30);
  const key = dates[0] ?? "";
  if (instCache?.key === key) return instCache.rows;
  const rows: InstitutionalActivity[] = [];
  dates.forEach((date) => {
    const rand = seeded("inst", date);
    const n = 3 + Math.floor(rand() * 4);
    for (let i = 0; i < n; i++) {
      const ticker = pick(rand, EQUITY_UNIVERSE);
      const category = pick(rand, ["13f", "13f", "large-equity", "large-options", "large-premium", "unusual-options-volume"] as InstitutionalCategory[]);
      const px = mockQuote(ticker)?.last ?? 100;
      const shares = Math.round(Math.exp(range(rand, 11, 15)));
      const isOpt = category !== "13f" && category !== "large-equity";
      const value = isOpt ? Math.round(Math.exp(range(rand, 13.5, 16.5))) : Math.round(shares * px);
      const change = Math.round(range(rand, -60, 140));
      const transaction =
        category === "13f"
          ? change >= 0
            ? `Increased position ${change}% (quarter-over-quarter)`
            : `Reduced position ${Math.abs(change)}% (quarter-over-quarter)`
          : category === "large-equity"
            ? pick(rand, ["Block trade — buyer initiated", "Block trade — seller initiated", "Block trade — side unavailable"])
            : pick(rand, ["Call sweep above ask", "Put block at bid", "Call block at mid", "Put sweep at ask"]);
      rows.push({
        id: `sim-inst-${hashString(`${date}${i}`).toString(36)}`,
        category,
        entity: category === "13f" ? `${pick(rand, FUNDS)}${SIM}` : category === "large-equity" ? "Unattributed (exchange print)" : "Unattributed (options tape)",
        ticker,
        asset: isOpt ? "Options" : "Common stock",
        transaction,
        estimatedValue: value,
        shares: isOpt ? null : shares,
        changePercent: category === "13f" ? change : null,
        date,
        source: "mock",
        sourceUrl: null,
        sourceTimestamp: new Date(`${date}T21:00:00Z`).toISOString(),
      });
    }
  });
  instCache = { key, rows };
  return rows;
}

let congressCache: { key: string; rows: CongressionalDisclosure[] } | null = null;
function congress(): CongressionalDisclosure[] {
  const dates = days(60);
  const key = dates[0] ?? "";
  if (congressCache?.key === key) return congressCache.rows;
  const rows: CongressionalDisclosure[] = [];
  dates.forEach((date) => {
    const rand = seeded("congress", date);
    if (rand() < 0.45) return;
    const n = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const m = pick(rand, MEMBERS);
      const ticker = pick(rand, EQUITY_UNIVERSE);
      const info = lookupSymbol(ticker);
      const r = pick(rand, RANGES);
      const lag = 5 + Math.floor(rand() * 38); // STOCK Act allows up to 45 days
      rows.push({
        id: `sim-cg-${hashString(`${date}${i}`).toString(36)}`,
        member: `${m.name}${SIM}`,
        chamber: m.chamber,
        party: m.party,
        state: m.state,
        owner: pick(rand, ["self", "spouse", "joint", "spouse"] as const),
        issuer: info?.name ?? ticker,
        ticker,
        transaction: pick(rand, ["purchase", "purchase", "sale", "partial-sale"] as const),
        valueRange: r.label,
        valueMin: r.min,
        valueMax: r.max,
        transactionDate: addDays(date, -lag),
        disclosureDate: date,
        documentUrl: "",
        source: "mock",
      });
    }
  });
  congressCache = { key, rows };
  return rows;
}

function applyFilter<T extends { ticker?: string | null }>(rows: T[], f: DisclosureFilter, personOf?: (r: T) => string, dateOf?: (r: T) => string) {
  let out = rows;
  if (f.ticker) out = out.filter((r) => r.ticker === f.ticker!.toUpperCase());
  if (f.person && personOf) out = out.filter((r) => personOf(r).toLowerCase().includes(f.person!.toLowerCase()));
  if (f.since && dateOf) out = out.filter((r) => dateOf(r) >= f.since!);
  return out;
}

export class MockInsiderProvider implements InsiderDataProvider {
  readonly id = "mock";
  readonly label = "NSALGO Simulator";
  readonly isMock = true;
  async healthCheck() {
    return healthy("Simulated Form 4 feed (mock data)");
  }
  async list(f: DisclosureFilter): Promise<DataResult<InsiderTransaction[]>> {
    let rows = applyFilter(insiders(), f, (r) => r.person, (r) => r.filingDate);
    if (f.transaction) rows = rows.filter((r) => r.transactionType === f.transaction);
    return ok(rows.slice(0, f.limit ?? 100), mockMeta());
  }
}

export class MockInstitutionalProvider implements InstitutionalDataProvider {
  readonly id = "mock";
  readonly label = "NSALGO Simulator";
  readonly isMock = true;
  async healthCheck() {
    return healthy("Simulated institutional feed (mock data)");
  }
  async list(f: DisclosureFilter): Promise<DataResult<InstitutionalActivity[]>> {
    let rows = applyFilter(institutional(), f, (r) => r.entity, (r) => r.date);
    if (f.category) rows = rows.filter((r) => r.category === f.category);
    return ok(rows.slice(0, f.limit ?? 100), mockMeta());
  }
}

export class MockCongressProvider implements CongressionalDisclosureProvider {
  readonly id = "mock";
  readonly label = "NSALGO Simulator";
  readonly isMock = true;
  async healthCheck() {
    return healthy("Simulated disclosure feed (mock data)");
  }
  async list(f: DisclosureFilter): Promise<DataResult<CongressionalDisclosure[]>> {
    let rows = applyFilter(congress(), f, (r) => r.member, (r) => r.disclosureDate);
    if (f.chamber) rows = rows.filter((r) => r.chamber === f.chamber);
    if (f.transaction) rows = rows.filter((r) => r.transaction === f.transaction);
    return ok(rows.slice(0, f.limit ?? 100), mockMeta());
  }
}

/* ── Economic calendar ─────────────────────────────────────────────────────── */

const EVENT_TEMPLATES: { event: string; category: EconomicEvent["category"]; importance: EconomicEvent["importance"]; time: string; weekday?: number; unit: string; base: number; spread: number }[] = [
  { event: "CPI (YoY)", category: "inflation", importance: "high", time: "08:30", unit: "%", base: 2.9, spread: 0.3 },
  { event: "Core CPI (MoM)", category: "inflation", importance: "high", time: "08:30", unit: "%", base: 0.3, spread: 0.1 },
  { event: "Core PCE Price Index (MoM)", category: "inflation", importance: "high", time: "08:30", unit: "%", base: 0.25, spread: 0.1 },
  { event: "Nonfarm Payrolls", category: "employment", importance: "high", time: "08:30", unit: "K", base: 120, spread: 80 },
  { event: "Unemployment Rate", category: "employment", importance: "high", time: "08:30", unit: "%", base: 4.3, spread: 0.2 },
  { event: "Initial Jobless Claims", category: "employment", importance: "medium", time: "08:30", unit: "K", base: 228, spread: 15 },
  { event: "GDP Growth Rate (QoQ, annualised)", category: "growth", importance: "high", time: "08:30", unit: "%", base: 2.0, spread: 1.0 },
  { event: "Retail Sales (MoM)", category: "consumer", importance: "medium", time: "08:30", unit: "%", base: 0.3, spread: 0.5 },
  { event: "ISM Manufacturing PMI", category: "manufacturing", importance: "medium", time: "10:00", unit: "", base: 49.5, spread: 1.5 },
  { event: "S&P Global Services PMI", category: "manufacturing", importance: "low", time: "09:45", unit: "", base: 53.5, spread: 1.5 },
  { event: "Conference Board Consumer Confidence", category: "consumer", importance: "medium", time: "10:00", unit: "", base: 97, spread: 5 },
  { event: "FOMC Rate Decision", category: "central-bank", importance: "high", time: "14:00", unit: "%", base: 3.75, spread: 0 },
  { event: "Fed Chair Press Conference", category: "central-bank", importance: "high", time: "14:30", unit: "", base: 0, spread: 0 },
  { event: "Fed Governor Remarks", category: "central-bank", importance: "low", time: "12:00", unit: "", base: 0, spread: 0 },
  { event: "10-Year Note Auction", category: "treasury", importance: "medium", time: "13:00", unit: "%", base: 4.15, spread: 0.1 },
  { event: "Existing Home Sales", category: "housing", importance: "low", time: "10:00", unit: "M", base: 4.0, spread: 0.2 },
];

function fmtVal(v: number, unit: string, decimals: number) {
  if (unit === "K") return `${Math.round(v)}K`;
  if (unit === "M") return `${v.toFixed(2)}M`;
  return `${v.toFixed(decimals)}${unit}`;
}

export class MockCalendarProvider implements EconomicCalendarProvider {
  readonly id = "mock";
  readonly label = "NSALGO Simulator";
  readonly isMock = true;
  async healthCheck() {
    return healthy("Simulated economic calendar (mock data)");
  }
  async list(r: { from: string; to: string }): Promise<DataResult<EconomicEvent[]>> {
    const events: EconomicEvent[] = [];
    const now = Date.now();
    const total = Math.max(0, daysBetween(r.from, r.to));
    for (let i = 0; i <= total; i++) {
      const date = addDays(r.from, i);
      const wd = new Date(`${date}T12:00:00Z`).getUTCDay();
      if (wd === 0 || wd === 6) continue;
      const rand = seeded("econ", date);
      const count = 1 + Math.floor(rand() * 3);
      const used = new Set<number>();
      for (let k = 0; k < count; k++) {
        const idx = Math.floor(rand() * EVENT_TEMPLATES.length);
        if (used.has(idx)) continue;
        used.add(idx);
        const t = EVENT_TEMPLATES[idx]!;
        const [hh, mm] = t.time.split(":").map(Number) as [number, number];
        const dt = new Date(`${date}T${String(hh + 4).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00Z`);
        const decimals = t.unit === "%" ? (t.base < 1 ? 1 : 1) : 1;
        const hasValues = t.base !== 0;
        const prev = t.base + (rand() - 0.5) * t.spread;
        const fc = t.base + (rand() - 0.5) * t.spread;
        const act = fc + (rand() - 0.5) * t.spread * 0.8;
        const released = dt.getTime() < now;
        events.push({
          id: `sim-ev-${hashString(`${date}${idx}`).toString(36)}`,
          datetime: dt.toISOString(),
          country: "US",
          event: t.event,
          category: t.category,
          importance: t.importance,
          previous: hasValues ? fmtVal(prev, t.unit, decimals) : null,
          forecast: hasValues ? fmtVal(fc, t.unit, decimals) : null,
          actual: hasValues && released ? fmtVal(act, t.unit, decimals) : null,
          source: "mock",
        });
      }
    }
    events.sort((a, b) => a.datetime.localeCompare(b.datetime));
    return ok(events, mockMeta());
  }

  async earnings(r: { from: string; to: string }, symbols?: string[]): Promise<DataResult<EarningsEvent[]>> {
    const universe = symbols?.length ? symbols : EQUITY_UNIVERSE;
    const out: EarningsEvent[] = [];
    for (const sym of universe) {
      // each symbol reports once per ~63 trading days at a deterministic offset
      const offset = hashString(sym) % 63;
      const base = Date.parse("2026-01-12T12:00:00Z");
      for (let q = 0; q < 8; q++) {
        const d = new Date(base + (offset + q * 91) * 86_400_000).toISOString().slice(0, 10);
        if (d >= r.from && d <= r.to) {
          const info = lookupSymbol(sym);
          out.push({ symbol: sym, company: info?.name ?? sym, date: d, time: hashString(sym + q) % 2 ? "amc" : "bmo", epsEstimate: null, source: "mock" });
        }
      }
    }
    out.sort((a, b) => a.date.localeCompare(b.date));
    return ok(out, mockMeta());
  }
}
