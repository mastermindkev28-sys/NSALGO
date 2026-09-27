import "server-only";
/**
 * Unusual Whales adapters (options chains and flow, congressional trades,
 * insider transactions, economic and earnings calendars) over the REST API at
 * api.unusualwhales.com. Flow is Unusual Whales' own alert feed, so execution,
 * side and sentiment come from their trade-level data rather than heuristics.
 * Fields the API leaves out stay null.
 */
import { fetchJson, HttpError } from "@/lib/http";
import { addDays, daysBetween, isTradingDay, nyParts } from "@/lib/market-time";
import { fail, ok, type DataMeta, type DataMode, type DataResult } from "@/types/data";
import type {
  CongressionalDisclosure,
  DisclosureFilter,
  EarningsEvent,
  EconomicEvent,
  InsiderTransaction,
  InsiderTransactionType,
} from "@/types/disclosures";
import type { FlowExecution, FlowFilter, FlowSide, OptionChain, OptionContract, OptionsFlowPrint } from "@/types/options";
import { category } from "../calendar";
import { healthy, meta, unhealthy } from "../meta";
import type { CongressionalDisclosureProvider, EconomicCalendarProvider, InsiderDataProvider, OptionsDataProvider } from "../types";

const BASE = process.env.UNUSUAL_WHALES_BASE_URL ?? "https://api.unusualwhales.com";
const ID = "unusualwhales";
const LABEL = "Unusual Whales";

export class UnusualWhalesClient {
  constructor(private apiKey: string) {}
  async get<T>(path: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<T> {
    const url = new URL(path, BASE);
    for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
    const res = await fetchJson<{ data: T }>(url.toString(), {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      timeoutMs: 10_000,
      perSecond: 5,
    });
    return res.data;
  }
  meta(mode: DataMode = "live"): DataMeta {
    return meta(ID, LABEL, mode);
  }
  async health() {
    const t = Date.now();
    try {
      await this.get("/api/stock/SPY/stock-state");
      return healthy("Operational", Date.now() - t);
    } catch (e) {
      return unhealthy((e as Error).message, Date.now() - t);
    }
  }
}

function errorResult<T>(err: unknown, what: string): DataResult<T> {
  if (err instanceof HttpError) {
    if (err.status === 401 || err.status === 403) return fail("PROVIDER_NOT_CONFIGURED", "Unusual Whales rejected the API key or plan entitlement.");
    if (err.status === 404) return fail("NOT_FOUND", "Not found at Unusual Whales.");
    if (err.status === 429) return fail("RATE_LIMITED", "Unusual Whales rate limit reached.");
  }
  return fail("PROVIDER_UNAVAILABLE", `${what} temporarily unavailable.`);
}

/** Unusual Whales sends most numbers as strings. */
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

const today = () => nyParts().date;
const dteOf = (expiration: string) => Math.max(0, daysBetween(today(), expiration));

/** Parses an OCC option symbol, e.g. AAPL261016C00340000. */
export function parseOcc(symbol: string): { underlying: string; expiration: string; right: "call" | "put"; strike: number } | null {
  const m = /^([A-Z][A-Z0-9.]*?)(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/.exec(symbol.replace(/^O:/, ""));
  if (!m) return null;
  return { underlying: m[1]!, expiration: `20${m[2]}-${m[3]}-${m[4]}`, right: m[5] === "C" ? "call" : "put", strike: Number(m[6]) / 1000 };
}

// ── Options ──────────────────────────────────────────────────────────────────

interface UwContract {
  option_symbol: string;
  nbbo_bid?: string;
  nbbo_ask?: string;
  last_price?: string;
  volume?: number;
  open_interest?: number;
  implied_volatility?: string;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

export interface UwFlowAlert {
  id: string;
  ticker: string;
  type: "call" | "put";
  strike: string;
  expiry: string;
  start_time?: number;
  created_at: string;
  total_premium: string;
  total_size: number;
  total_ask_side_prem?: string;
  total_bid_side_prem?: string;
  price: string;
  underlying_price?: string;
  volume?: number;
  open_interest?: number;
  iv_end?: string;
  iv?: number;
  trade_count?: number;
  has_sweep?: boolean;
  all_opening_trades?: boolean;
}

/**
 * Maps a flow alert to a print. Side is the share of premium traded at the
 * ask or bid (60%+ either way); anything more balanced is "mid". Execution:
 * sweeps are flagged by Unusual Whales; a single 250+ contract trade is a
 * block; several fills without a sweep are a split.
 */
export function mapFlowAlert(a: UwFlowAlert): OptionsFlowPrint {
  const premium = num(a.total_premium) ?? 0;
  const ask = num(a.total_ask_side_prem) ?? 0;
  const bid = num(a.total_bid_side_prem) ?? 0;
  let side: FlowSide = null;
  if (premium > 0 && ask + bid > 0) side = ask / premium >= 0.6 ? "ask" : bid / premium >= 0.6 ? "bid" : "mid";
  const trades = a.trade_count ?? 1;
  const execution: FlowExecution = a.has_sweep ? "sweep" : trades > 1 ? "split" : a.total_size >= 250 ? "block" : "single";
  const sentiment =
    side === null ? null : side === "mid" ? "neutral" : (a.type === "call") === (side === "ask") ? "bullish" : "bearish";
  return {
    id: a.id,
    timestamp: a.start_time ? new Date(a.start_time).toISOString() : a.created_at,
    underlying: a.ticker,
    right: a.type,
    strike: num(a.strike) ?? 0,
    expiration: a.expiry,
    dte: dteOf(a.expiry),
    premium,
    contracts: a.total_size,
    price: num(a.price) ?? 0,
    spot: num(a.underlying_price),
    volume: a.volume ?? null,
    openInterest: a.open_interest ?? null,
    impliedVolatility: num(a.iv_end) ?? a.iv ?? null,
    execution,
    side,
    intent: a.all_opening_trades ? "opening" : null,
    sentiment,
    source: ID,
  };
}

export class UnusualWhalesOptionsProvider implements OptionsDataProvider {
  readonly id = ID;
  readonly label = LABEL;
  readonly isMock = false;
  constructor(private c: UnusualWhalesClient) {}
  healthCheck() {
    return this.c.health();
  }

  async getExpirations(symbol: string): Promise<DataResult<string[]>> {
    try {
      const rows = await this.c.get<{ expires: string }[]>(`/api/stock/${encodeURIComponent(symbol.toUpperCase())}/expiry-breakdown`);
      const from = today();
      return ok([...new Set(rows.map((r) => r.expires).filter((d) => d >= from))].sort(), this.c.meta());
    } catch (e) {
      return errorResult(e, "Options data");
    }
  }

  async getChain(symbol: string, expiration?: string): Promise<DataResult<OptionChain>> {
    const sym = symbol.toUpperCase();
    const exps = await this.getExpirations(sym);
    if (!exps.ok) return exps;
    const exp = expiration && exps.data.includes(expiration) ? expiration : exps.data[0];
    if (!exp) return fail("NOT_FOUND", "No listed expirations.");
    try {
      const path = `/api/stock/${encodeURIComponent(sym)}`;
      const [rows, state] = await Promise.all([
        this.c.get<UwContract[]>(`${path}/option-contracts`, { expiry: exp, limit: 500 }),
        this.c.get<{ close?: string }>(`${path}/stock-state`).catch(() => null),
      ]);
      const underlyingPrice = num(state?.close);
      const contracts: OptionContract[] = [];
      for (const r of rows) {
        const occ = parseOcc(r.option_symbol);
        if (!occ || occ.expiration !== exp) continue;
        const bid = num(r.nbbo_bid);
        const ask = num(r.nbbo_ask);
        contracts.push({
          contract: `O:${r.option_symbol}`,
          underlying: sym,
          right: occ.right,
          strike: occ.strike,
          expiration: occ.expiration,
          dte: dteOf(occ.expiration),
          bid,
          ask,
          last: num(r.last_price),
          mark: bid !== null && ask !== null ? (bid + ask) / 2 : null,
          volume: r.volume ?? null,
          openInterest: r.open_interest ?? null,
          impliedVolatility: num(r.implied_volatility),
          delta: num(r.delta),
          gamma: num(r.gamma),
          theta: num(r.theta),
          vega: num(r.vega),
        });
      }
      contracts.sort((a, b) => a.strike - b.strike);
      const calls = contracts.filter((c) => c.right === "call");
      const atm =
        underlyingPrice !== null
          ? calls.reduce<OptionContract | null>((b, c) => (!b || Math.abs(c.strike - underlyingPrice) < Math.abs(b.strike - underlyingPrice) ? c : b), null)
          : null;
      return ok(
        {
          underlying: sym,
          underlyingPrice,
          expirations: exps.data,
          expiration: exp,
          calls,
          puts: contracts.filter((c) => c.right === "put"),
          ivRank: null,
          atmIv: atm?.impliedVolatility ?? null,
        },
        this.c.meta(),
      );
    } catch (e) {
      return errorResult(e, "Options data");
    }
  }

  /** Unusual Whales flow alerts, newest first. Pages back by time (200 per call) up to the requested limit. */
  async getFlow(filter: FlowFilter): Promise<DataResult<OptionsFlowPrint[]>> {
    const limit = Math.min(filter.limit ?? 100, 1000);
    const params = {
      ticker_symbol: filter.symbol?.toUpperCase(),
      min_premium: filter.minPremium,
      is_call: filter.right === "call" ? true : undefined,
      is_put: filter.right === "put" ? true : undefined,
      is_sweep: filter.execution === "sweep" ? true : undefined,
      limit: 200,
    };
    try {
      const out: OptionsFlowPrint[] = [];
      let olderThan: string | undefined;
      for (let page = 0; page < 5 && out.length < limit; page++) {
        const rows = await this.c.get<UwFlowAlert[]>("/api/option-trades/flow-alerts", { ...params, older_than: olderThan });
        for (const p of rows.map(mapFlowAlert)) {
          if (filter.sentiment && p.sentiment !== filter.sentiment) continue;
          if (filter.execution && p.execution !== filter.execution) continue;
          out.push(p);
        }
        if (rows.length < 200) break;
        olderThan = rows[rows.length - 1]!.created_at;
      }
      out.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      return ok(out.slice(0, limit), this.c.meta());
    } catch (e) {
      return errorResult(e, "Options flow");
    }
  }
}

// ── Congress ─────────────────────────────────────────────────────────────────

export interface UwCongressTrade {
  name?: string;
  reporter?: string;
  member_type?: string;
  ticker?: string | null;
  notes?: string | null;
  issuer?: string | null;
  txn_type?: string;
  amounts?: string | null;
  transaction_date?: string;
  filed_at_date?: string;
  politician_id?: string;
}

const HOUSE_DISCLOSURES = "https://disclosures-clerk.house.gov/FinancialDisclosure";
const SENATE_DISCLOSURES = "https://efdsearch.senate.gov/search/";

function parseRange(r: string | null | undefined): { min: number | null; max: number | null } {
  if (!r) return { min: null, max: null };
  const nums = [...r.replaceAll(",", "").matchAll(/\$?(\d+)/g)].map((m) => Number(m[1]));
  return { min: nums[0] ?? null, max: nums[1] ?? null };
}

export function mapCongressTrade(r: UwCongressTrade, i: number): CongressionalDisclosure {
  const chamber = (r.member_type ?? "").toLowerCase() === "senate" ? "senate" : "house";
  const tx = (r.txn_type ?? "").toLowerCase();
  const range = parseRange(r.amounts);
  const ticker = r.ticker && r.ticker !== "-" ? r.ticker.toUpperCase() : null;
  const issuer = r.notes?.replace(/\s*\[[A-Z]+\]\s*$/, "").trim() || (r.issuer && r.issuer !== "undisclosed" ? r.issuer : null) || ticker || "Undisclosed issuer";
  return {
    id: `${r.politician_id ?? r.name}-${r.filed_at_date}-${r.transaction_date}-${ticker ?? ""}-${i}`,
    member: r.name ?? r.reporter?.replace(/^Hon\.\s*/, "") ?? "Unknown",
    chamber,
    party: null,
    state: null,
    owner: null,
    issuer,
    ticker,
    transaction: tx.includes("partial") ? "partial-sale" : tx.includes("sell") || tx.includes("sale") ? "sale" : tx.includes("exchange") ? "exchange" : "purchase",
    valueRange: r.amounts ?? "Range not reported",
    valueMin: range.min,
    valueMax: range.max,
    transactionDate: (r.transaction_date ?? "").slice(0, 10),
    disclosureDate: (r.filed_at_date ?? "").slice(0, 10),
    documentUrl: chamber === "senate" ? SENATE_DISCLOSURES : HOUSE_DISCLOSURES,
    source: ID,
  };
}

export class UnusualWhalesCongressProvider implements CongressionalDisclosureProvider {
  readonly id = ID;
  readonly label = LABEL;
  readonly isMock = false;
  constructor(private c: UnusualWhalesClient) {}
  healthCheck() {
    return this.c.health();
  }
  async list(f: DisclosureFilter): Promise<DataResult<CongressionalDisclosure[]>> {
    try {
      const rows = await this.c.get<UwCongressTrade[]>("/api/congress/recent-trades", { limit: 200, ticker: f.ticker?.toUpperCase() });
      let out = rows.map(mapCongressTrade);
      if (f.person) out = out.filter((r) => r.member.toLowerCase().includes(f.person!.toLowerCase()));
      if (f.chamber) out = out.filter((r) => r.chamber === f.chamber);
      if (f.transaction) out = out.filter((r) => r.transaction === f.transaction);
      if (f.since) out = out.filter((r) => r.disclosureDate >= f.since!);
      out.sort((a, b) => b.disclosureDate.localeCompare(a.disclosureDate));
      return ok(out.slice(0, f.limit ?? 100), this.c.meta("eod"));
    } catch (e) {
      return errorResult(e, "Congressional disclosures");
    }
  }
}

// ── Insiders ─────────────────────────────────────────────────────────────────

export interface UwInsiderTransaction {
  id: string;
  ticker: string;
  owner_name: string;
  amount: number | null;
  price: string | null;
  transaction_code: string | null;
  transaction_date: string;
  filing_date: string;
  formtype: string;
  officer_title: string | null;
  is_director?: boolean;
  is_officer?: boolean;
  is_ten_percent_owner?: boolean;
  shares_owned_after: number | null;
  reporter_cik: string | null;
}

const TX_TYPES: Record<string, InsiderTransactionType> = { P: "purchase", S: "sale", M: "option-exercise", X: "option-exercise", A: "award", G: "gift", F: "tax-withholding" };
const FORMS = new Set(["3", "4", "5", "4/A"]);

export function mapInsiderTransaction(r: UwInsiderTransaction): InsiderTransaction | null {
  if (!FORMS.has(r.formtype)) return null; // Form 144 is a notice of proposed sale, not a Section 16 transaction.
  const shares = r.amount === null ? null : Math.abs(r.amount);
  const price = num(r.price);
  const role = r.officer_title || (r.is_director ? "Director" : r.is_officer ? "Officer" : r.is_ten_percent_owner ? "10% owner" : "Insider");
  return {
    id: r.id,
    person: r.owner_name,
    company: r.ticker,
    ticker: r.ticker,
    role,
    form: r.formtype as InsiderTransaction["form"],
    transactionType: TX_TYPES[r.transaction_code ?? ""] ?? "other",
    transactionCode: r.transaction_code,
    shares,
    price,
    value: shares !== null && price !== null ? Math.round(shares * price) : null,
    sharesOwnedAfter: r.shares_owned_after,
    transactionDate: r.transaction_date,
    filingDate: r.filing_date,
    filingUrl: r.reporter_cik
      ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${r.reporter_cik}&type=4&owner=include&count=40`
      : `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(r.ticker)}&type=4&owner=include&count=40`,
    source: ID,
  };
}

export class UnusualWhalesInsiderProvider implements InsiderDataProvider {
  readonly id = ID;
  readonly label = LABEL;
  readonly isMock = false;
  constructor(private c: UnusualWhalesClient) {}
  healthCheck() {
    return this.c.health();
  }
  async list(f: DisclosureFilter): Promise<DataResult<InsiderTransaction[]>> {
    try {
      const rows = await this.c.get<UwInsiderTransaction[]>("/api/insider/transactions", {
        ticker_symbol: f.ticker?.toUpperCase(),
        owner_name: f.person,
        start_date: f.since,
        limit: 500,
      });
      let out = rows.map(mapInsiderTransaction).filter((r): r is InsiderTransaction => r !== null);
      if (f.transaction) out = out.filter((r) => r.transactionType === f.transaction);
      out.sort((a, b) => b.filingDate.localeCompare(a.filingDate));
      return ok(out.slice(0, f.limit ?? 100), this.c.meta("eod"));
    } catch (e) {
      return errorResult(e, "Insider transactions");
    }
  }
}

// ── Calendar ─────────────────────────────────────────────────────────────────

interface UwEconomicEvent {
  event: string;
  time: string;
  type: "fed-speaker" | "fomc" | "report";
  prev: string | null;
  forecast: string | null;
  reported_period?: string | null;
}

interface UwEarnings {
  symbol: string;
  full_name?: string;
  report_date: string;
  report_time?: string;
  street_mean_est?: string | null;
}

const HIGH_IMPACT = /cpi|consumer price|pce|payroll|nonfarm|unemployment|gdp|retail sales|fomc|interest rate/i;
const blank = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

export class UnusualWhalesCalendarProvider implements EconomicCalendarProvider {
  readonly id = ID;
  readonly label = LABEL;
  readonly isMock = false;
  constructor(private c: UnusualWhalesClient) {}
  healthCheck() {
    return this.c.health();
  }

  /** Unusual Whales publishes the current and next week; `actual` is not included. */
  async list(r: { from: string; to: string }): Promise<DataResult<EconomicEvent[]>> {
    try {
      const rows = await this.c.get<UwEconomicEvent[]>("/api/market/economic-calendar");
      const events = rows
        .map((x): EconomicEvent => {
          const datetime = new Date(x.time.replace(" ", "T")).toISOString();
          return {
            id: `${x.time}-${x.event}`,
            datetime,
            country: "US",
            event: x.reported_period ? `${x.event} (${x.reported_period})` : x.event,
            category: x.type === "fomc" || x.type === "fed-speaker" ? "central-bank" : category(x.event),
            importance: x.type === "fomc" || HIGH_IMPACT.test(x.event) ? "high" : x.type === "fed-speaker" ? "medium" : "low",
            previous: blank(x.prev),
            forecast: blank(x.forecast),
            actual: null,
            source: ID,
          };
        })
        .filter((e) => e.datetime.slice(0, 10) >= r.from && e.datetime.slice(0, 10) <= r.to)
        .sort((a, b) => a.datetime.localeCompare(b.datetime));
      return ok(events, this.c.meta());
    } catch (e) {
      return errorResult(e, "Economic calendar");
    }
  }

  /** Premarket and after-hours reports for each trading day in the range (capped at 15 days). */
  async earnings(r: { from: string; to: string }, symbols?: string[]): Promise<DataResult<EarningsEvent[]>> {
    const days: string[] = [];
    for (let d = r.from; d <= r.to && days.length < 15; d = addDays(d, 1)) if (isTradingDay(d)) days.push(d);
    const want = symbols?.length ? new Set(symbols.map((s) => s.toUpperCase())) : null;
    try {
      const batches = await Promise.all(
        days.flatMap((date) => [
          this.c.get<UwEarnings[]>("/api/earnings/premarket", { date, limit: 100 }),
          this.c.get<UwEarnings[]>("/api/earnings/afterhours", { date, limit: 100 }),
        ]),
      );
      const out = batches
        .flat()
        .filter((x) => !want || want.has(x.symbol.toUpperCase()))
        .map(
          (x): EarningsEvent => ({
            symbol: x.symbol.toUpperCase(),
            company: x.full_name ?? x.symbol,
            date: x.report_date,
            time: x.report_time === "premarket" ? "bmo" : x.report_time === "postmarket" ? "amc" : "unknown",
            epsEstimate: num(x.street_mean_est),
            source: ID,
          }),
        )
        .sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol));
      return ok(out, this.c.meta("eod"));
    } catch (e) {
      return errorResult(e, "Earnings calendar");
    }
  }
}
