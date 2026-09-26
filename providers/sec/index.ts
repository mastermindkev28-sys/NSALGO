import "server-only";
/**
 * SEC EDGAR adapters — official public data.
 *  - Insider transactions from Forms 3/4/5 (Section 16) primary XML documents.
 *  - Institutional 13F-HR filing activity for configured filer CIKs.
 * Fair access: a descriptive User-Agent is mandatory and request rate is
 * throttled below the SEC's 10 requests/second ceiling. Responses are cached.
 */
import { EQUITY_UNIVERSE } from "@/config/universe";
import { cached } from "@/lib/cache";
import { fetchJson, fetchText } from "@/lib/http";
import { fail, ok, type DataResult } from "@/types/data";
import type { DisclosureFilter, InsiderTransaction, InsiderTransactionType, InstitutionalActivity } from "@/types/disclosures";
import { healthy, meta, unhealthy } from "../meta";
import type { InsiderDataProvider, InstitutionalDataProvider } from "../types";

export interface SecConfig {
  userAgent: string;
  maxRequestsPerSecond: number;
  trackedInstitutionCiks: string[];
}

const LABEL = "SEC EDGAR";

interface Submissions {
  cik: string;
  name: string;
  tickers?: string[];
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      form: string[];
      primaryDocument: string[];
    };
  };
}

class SecClient {
  constructor(private cfg: SecConfig) {}
  private headers() {
    return { "User-Agent": this.cfg.userAgent, "Accept-Encoding": "gzip, deflate" };
  }
  json<T>(url: string) {
    return fetchJson<T>(url, { headers: this.headers(), perSecond: this.cfg.maxRequestsPerSecond, timeoutMs: 10_000 });
  }
  text(url: string) {
    return fetchText(url, { headers: this.headers(), perSecond: this.cfg.maxRequestsPerSecond, timeoutMs: 10_000 });
  }
  async tickerMap(): Promise<Map<string, { cik: string; title: string }>> {
    const r = await cached("sec:tickers", 24 * 3600_000, async () =>
      this.json<Record<string, { cik_str: number; ticker: string; title: string }>>("https://www.sec.gov/files/company_tickers.json"),
    );
    return new Map(Object.values(r.value).map((v) => [v.ticker.toUpperCase(), { cik: String(v.cik_str).padStart(10, "0"), title: v.title }]));
  }
  async submissions(cik: string): Promise<Submissions> {
    const padded = cik.padStart(10, "0");
    const r = await cached(`sec:sub:${padded}`, 20 * 60_000, () => this.json<Submissions>(`https://data.sec.gov/submissions/CIK${padded}.json`));
    return r.value;
  }
}

/* ── Minimal XML helpers for Form 4 (no external parser) ─────────────────── */
function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}>\\s*([\\s\\S]*?)\\s*</${name}>`, "i"));
  return m ? m[1]!.trim() : null;
}
function valueOf(xml: string, name: string): string | null {
  const block = tag(xml, name);
  if (block === null) return null;
  const v = tag(block, "value");
  return v ?? (block.includes("<") ? null : block);
}
function blocks(xml: string, name: string): string[] {
  return [...xml.matchAll(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "gi"))].map((m) => m[1]!);
}
function decode(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

const CODE_MAP: Record<string, InsiderTransactionType> = {
  P: "purchase",
  S: "sale",
  M: "option-exercise",
  X: "option-exercise",
  C: "option-exercise",
  A: "award",
  G: "gift",
  F: "tax-withholding",
};

export function parseForm4(xml: string, meta: { ticker: string; company: string; filingDate: string; filingUrl: string; form: string; accession: string }): InsiderTransaction[] {
  const owner = decode(tag(tag(xml, "reportingOwnerId") ?? "", "rptOwnerName") ?? "Unknown reporting owner");
  const rel = tag(xml, "reportingOwnerRelationship") ?? "";
  const roles: string[] = [];
  if (/<isDirector>\s*(1|true)/i.test(rel)) roles.push("Director");
  if (/<isOfficer>\s*(1|true)/i.test(rel)) roles.push(decode(tag(rel, "officerTitle") ?? "Officer"));
  if (/<isTenPercentOwner>\s*(1|true)/i.test(rel)) roles.push("10% Owner");
  if (/<isOther>\s*(1|true)/i.test(rel)) roles.push(decode(tag(rel, "otherText") ?? "Other"));
  const role = roles.join(", ") || "Reporting person";
  const out: InsiderTransaction[] = [];
  const txs = [...blocks(xml, "nonDerivativeTransaction"), ...blocks(xml, "derivativeTransaction")];
  txs.forEach((t, i) => {
    const code = tag(tag(t, "transactionCoding") ?? "", "transactionCode");
    const shares = Number(valueOf(t, "transactionShares"));
    const priceRaw = valueOf(t, "transactionPricePerShare");
    const price = priceRaw !== null && priceRaw !== "" ? Number(priceRaw) : null;
    const owned = Number(valueOf(t, "sharesOwnedFollowingTransaction"));
    const date = valueOf(t, "transactionDate") ?? meta.filingDate;
    out.push({
      id: `${meta.accession}-${i}`,
      person: owner,
      company: meta.company,
      ticker: meta.ticker,
      role,
      form: (meta.form === "4/A" ? "4/A" : meta.form) as InsiderTransaction["form"],
      transactionType: (code && CODE_MAP[code]) || "other",
      transactionCode: code,
      shares: Number.isFinite(shares) ? shares : null,
      price: price !== null && Number.isFinite(price) ? price : null,
      value: Number.isFinite(shares) && price ? Math.round(shares * price) : null,
      sharesOwnedAfter: Number.isFinite(owned) ? owned : null,
      transactionDate: date.slice(0, 10),
      filingDate: meta.filingDate,
      filingUrl: meta.filingUrl,
      source: "sec-edgar",
    });
  });
  return out;
}

export class SecInsiderProvider implements InsiderDataProvider {
  readonly id = "sec-edgar";
  readonly label = LABEL;
  readonly isMock = false;
  private c: SecClient;
  constructor(cfg: SecConfig) {
    this.c = new SecClient(cfg);
  }
  async healthCheck() {
    const t = Date.now();
    try {
      await this.c.submissions("0000320193");
      return healthy("Operational", Date.now() - t);
    } catch (e) {
      return unhealthy((e as Error).message, Date.now() - t);
    }
  }

  private async forTicker(ticker: string, maxFilings: number): Promise<InsiderTransaction[]> {
    const map = await this.c.tickerMap();
    const entry = map.get(ticker.toUpperCase());
    if (!entry) return [];
    const sub = await this.c.submissions(entry.cik);
    const r = sub.filings.recent;
    const out: InsiderTransaction[] = [];
    let n = 0;
    for (let i = 0; i < r.form.length && n < maxFilings; i++) {
      const form = r.form[i]!;
      if (!["3", "4", "5", "4/A"].includes(form)) continue;
      n++;
      const acc = r.accessionNumber[i]!;
      const accNo = acc.replaceAll("-", "");
      const primary = (r.primaryDocument[i] ?? "").replace(/^xslF345X\d+\//, "");
      const cikNum = String(Number(entry.cik));
      const xmlUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNo}/${primary}`;
      const filingUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNo}/${acc}-index.htm`;
      try {
        const xml = (await cached(`sec:xml:${acc}`, 7 * 24 * 3600_000, () => this.c.text(xmlUrl))).value;
        out.push(...parseForm4(xml, { ticker: ticker.toUpperCase(), company: sub.name, filingDate: r.filingDate[i]!, filingUrl, form, accession: acc }));
      } catch {
        // Skip individual documents that fail; the filing link remains authoritative.
      }
    }
    return out;
  }

  async list(f: DisclosureFilter): Promise<DataResult<InsiderTransaction[]>> {
    try {
      const tickers = f.ticker ? [f.ticker] : EQUITY_UNIVERSE.slice(0, 12);
      const perTicker = f.ticker ? 25 : 4;
      const all = (await Promise.all(tickers.map((t) => this.forTicker(t, perTicker)))).flat();
      let rows = all.sort((a, b) => b.filingDate.localeCompare(a.filingDate));
      if (f.person) rows = rows.filter((r) => r.person.toLowerCase().includes(f.person!.toLowerCase()));
      if (f.transaction) rows = rows.filter((r) => r.transactionType === f.transaction);
      if (f.since) rows = rows.filter((r) => r.filingDate >= f.since!);
      return ok(rows.slice(0, f.limit ?? 100), meta("sec-edgar", LABEL, "eod"));
    } catch {
      return fail("PROVIDER_UNAVAILABLE", "SEC EDGAR is temporarily unavailable.");
    }
  }
}

export class Sec13fProvider implements InstitutionalDataProvider {
  readonly id = "sec-edgar-13f";
  readonly label = `${LABEL} (13F)`;
  readonly isMock = false;
  private c: SecClient;
  constructor(private cfg: SecConfig) {
    this.c = new SecClient(cfg);
  }
  async healthCheck() {
    return this.cfg.trackedInstitutionCiks.length ? healthy("Operational") : unhealthy("No institution CIKs configured in SEC_API_CONFIG");
  }
  async list(f: DisclosureFilter): Promise<DataResult<InstitutionalActivity[]>> {
    if (f.category && f.category !== "13f") {
      return fail("UNSUPPORTED", "Large-print institutional activity requires a licensed trade-level data provider.");
    }
    try {
      const rows: InstitutionalActivity[] = [];
      for (const cik of this.cfg.trackedInstitutionCiks) {
        const sub = await this.c.submissions(cik);
        const r = sub.filings.recent;
        for (let i = 0; i < r.form.length && rows.length < 200; i++) {
          if (!r.form[i]!.startsWith("13F-HR")) continue;
          const acc = r.accessionNumber[i]!;
          rows.push({
            id: acc,
            category: "13f",
            entity: sub.name,
            ticker: null,
            asset: "13F holdings report",
            transaction: `${r.form[i]} filed for period ending ${r.reportDate[i] || "n/a"}`,
            estimatedValue: null, // holdings-level parsing handled by the 13F ingestion job
            shares: null,
            changePercent: null,
            date: r.filingDate[i]!,
            source: "sec-edgar",
            sourceUrl: `https://www.sec.gov/Archives/edgar/data/${Number(sub.cik)}/${acc.replaceAll("-", "")}/${acc}-index.htm`,
            sourceTimestamp: new Date(`${r.filingDate[i]}T00:00:00Z`).toISOString(),
          });
        }
      }
      rows.sort((a, b) => b.date.localeCompare(a.date));
      return ok(rows.slice(0, f.limit ?? 100), meta("sec-edgar", LABEL, "eod"));
    } catch {
      return fail("PROVIDER_UNAVAILABLE", "SEC EDGAR is temporarily unavailable.");
    }
  }
}
