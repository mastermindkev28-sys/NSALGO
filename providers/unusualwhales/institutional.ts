import "server-only";
/**
 * 13F institutional positions from Unusual Whales' ownership endpoint: each
 * row is one institution's holding in one ticker as of its latest 13F report,
 * with the quarter-on-quarter change in shares. Without a ticker filter the
 * feed covers the largest holders of the mega-cap names, ranked by the dollar
 * size of the change.
 */
import { HttpError } from "@/lib/http";
import { fail, ok, type DataResult } from "@/types/data";
import type { DisclosureFilter, InstitutionalActivity } from "@/types/disclosures";
import type { InstitutionalDataProvider } from "../types";
import type { UnusualWhalesClient } from "./index";

const DEFAULT_TICKERS = ["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "AVGO", "TSLA"];

interface UwOwnership {
  name: string;
  cik?: string;
  value?: string;
  units?: string;
  units_changed?: string;
  avg_price?: string;
  filing_date?: string;
  report_date?: string;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

const fmtShares = (n: number) => Math.abs(n).toLocaleString("en-US");

export class UnusualWhalesInstitutionalProvider implements InstitutionalDataProvider {
  readonly id = "unusualwhales";
  readonly label = "Unusual Whales (13F)";
  readonly isMock = false;
  constructor(private c: UnusualWhalesClient) {}

  healthCheck() {
    return this.c.health();
  }

  private toActivity(ticker: string, r: UwOwnership): InstitutionalActivity {
    const units = num(r.units);
    const changed = num(r.units_changed);
    const before = units !== null && changed !== null ? units - changed : null;
    const transaction =
      changed === null || changed === 0
        ? "Held position"
        : before === 0
          ? `New position: ${fmtShares(changed)} shares`
          : changed > 0
            ? `Added ${fmtShares(changed)} shares`
            : `Reduced ${fmtShares(changed)} shares`;
    const date = r.report_date ?? r.filing_date ?? "";
    return {
      id: `${r.cik ?? r.name}-${ticker}-${date}`,
      category: "13f",
      entity: r.name,
      ticker,
      asset: `${ticker} common stock`,
      transaction,
      estimatedValue: num(r.value),
      shares: units,
      changePercent: changed !== null && before ? (changed / before) * 100 : null,
      date,
      source: "unusualwhales",
      sourceUrl: r.cik ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${Number(r.cik)}&type=13F` : null,
      sourceTimestamp: new Date(`${r.filing_date ?? date}T00:00:00Z`).toISOString(),
    };
  }

  async list(f: DisclosureFilter): Promise<DataResult<InstitutionalActivity[]>> {
    if (f.category && f.category !== "13f") {
      return fail("UNSUPPORTED", "Large-print institutional activity requires a licensed trade-level data provider.");
    }
    const tickers = f.ticker ? [f.ticker.toUpperCase()] : DEFAULT_TICKERS;
    const perTicker = f.ticker ? Math.min(f.limit ?? 50, 100) : 10;
    try {
      const results = await Promise.all(
        tickers.map(async (t) => {
          const rows = await this.c.get<UwOwnership[]>(`/api/institution/${encodeURIComponent(t)}/ownership`, { limit: perTicker });
          return (rows ?? []).map((r) => this.toActivity(t, r));
        }),
      );
      let rows = results.flat();
      if (f.person) rows = rows.filter((r) => r.entity.toLowerCase().includes(f.person!.toLowerCase()));
      if (f.since) rows = rows.filter((r) => r.date >= f.since!);
      // Biggest dollar moves first: shares changed × average price, falling back to position size.
      const moveValue = (r: InstitutionalActivity) =>
        r.changePercent !== null && r.estimatedValue !== null ? Math.abs((r.estimatedValue * r.changePercent) / (100 + r.changePercent)) : 0;
      if (!f.ticker) rows.sort((a, b) => moveValue(b) - moveValue(a));
      return ok(rows.slice(0, f.limit ?? 50), this.c.meta());
    } catch (e) {
      if (e instanceof HttpError && (e.status === 401 || e.status === 403)) {
        return fail("PROVIDER_NOT_CONFIGURED", "Unusual Whales rejected the API key or plan entitlement.");
      }
      if (e instanceof HttpError && e.status === 429) return fail("RATE_LIMITED", "Unusual Whales rate limit reached.");
      return fail("PROVIDER_UNAVAILABLE", "Institutional holdings temporarily unavailable.");
    }
  }
}
