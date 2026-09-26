import "server-only";
/**
 * Congressional disclosures adapter for a licensed aggregator of House Clerk
 * and Senate eFD Periodic Transaction Reports. Field names follow the common
 * aggregator schema (e.g. Quiver Quantitative); map additional vendors here.
 * Records are presented as public disclosures — no inference of wrongdoing.
 */
import { fetchJson } from "@/lib/http";
import { fail, ok, type DataResult } from "@/types/data";
import type { CongressionalDisclosure, DisclosureFilter } from "@/types/disclosures";
import { healthy, meta, unhealthy } from "../meta";
import type { CongressionalDisclosureProvider } from "../types";

interface VendorRow {
  Representative?: string;
  Name?: string;
  House?: string; // "Representatives" | "Senate"
  Chamber?: string;
  Party?: string;
  State?: string;
  Owner?: string;
  Ticker?: string;
  Description?: string;
  Asset?: string;
  Transaction?: string;
  Range?: string;
  TransactionDate?: string;
  ReportDate?: string;
  Link?: string;
  Filing?: string;
}

function parseRange(r: string | undefined): { min: number | null; max: number | null } {
  if (!r) return { min: null, max: null };
  const nums = [...r.replaceAll(",", "").matchAll(/\$?(\d+)/g)].map((m) => Number(m[1]));
  return { min: nums[0] ?? null, max: nums[1] ?? null };
}

function mapTx(t: string | undefined): CongressionalDisclosure["transaction"] {
  const s = (t ?? "").toLowerCase();
  if (s.includes("partial")) return "partial-sale";
  if (s.includes("sale") || s.includes("sell")) return "sale";
  if (s.includes("exchange")) return "exchange";
  return "purchase";
}

export class VendorCongressProvider implements CongressionalDisclosureProvider {
  readonly id = "congress-vendor";
  readonly label: string;
  readonly isMock = false;
  constructor(
    private baseUrl: string,
    private apiKey: string,
  ) {
    this.label = `Licensed disclosure feed (${new URL(baseUrl).host})`;
  }
  async healthCheck() {
    const t = Date.now();
    try {
      await fetchJson(this.baseUrl, { headers: { Authorization: `Bearer ${this.apiKey}` }, timeoutMs: 8000 });
      return healthy("Operational", Date.now() - t);
    } catch (e) {
      return unhealthy((e as Error).message, Date.now() - t);
    }
  }
  async list(f: DisclosureFilter): Promise<DataResult<CongressionalDisclosure[]>> {
    try {
      const rows = await fetchJson<VendorRow[]>(this.baseUrl, { headers: { Authorization: `Bearer ${this.apiKey}` }, timeoutMs: 10_000 });
      let out: CongressionalDisclosure[] = rows.map((r, i) => {
        const range = parseRange(r.Range);
        const chamberRaw = (r.House ?? r.Chamber ?? "").toLowerCase();
        const party = (r.Party ?? "").toUpperCase().charAt(0);
        const owner = (r.Owner ?? "").toLowerCase();
        return {
          id: `${r.ReportDate ?? ""}-${r.Representative ?? r.Name ?? ""}-${r.Ticker ?? ""}-${i}`,
          member: r.Representative ?? r.Name ?? "Unknown",
          chamber: chamberRaw.includes("senate") ? "senate" : "house",
          party: party === "D" || party === "R" || party === "I" ? party : null,
          state: r.State ?? null,
          owner: owner.includes("spouse") ? "spouse" : owner.includes("joint") ? "joint" : owner.includes("depend") ? "dependent" : owner ? "self" : null,
          issuer: r.Description ?? r.Asset ?? r.Ticker ?? "Undisclosed issuer",
          ticker: r.Ticker && r.Ticker !== "-" ? r.Ticker.toUpperCase() : null,
          transaction: mapTx(r.Transaction),
          valueRange: r.Range ?? "Range not reported",
          valueMin: range.min,
          valueMax: range.max,
          transactionDate: (r.TransactionDate ?? "").slice(0, 10),
          disclosureDate: (r.ReportDate ?? "").slice(0, 10),
          documentUrl: r.Link ?? r.Filing ?? "",
          source: this.id,
        };
      });
      if (f.ticker) out = out.filter((r) => r.ticker === f.ticker!.toUpperCase());
      if (f.person) out = out.filter((r) => r.member.toLowerCase().includes(f.person!.toLowerCase()));
      if (f.chamber) out = out.filter((r) => r.chamber === f.chamber);
      if (f.transaction) out = out.filter((r) => r.transaction === f.transaction);
      if (f.since) out = out.filter((r) => r.disclosureDate >= f.since!);
      out.sort((a, b) => b.disclosureDate.localeCompare(a.disclosureDate));
      return ok(out.slice(0, f.limit ?? 100), meta(this.id, this.label, "eod"));
    } catch {
      return fail("PROVIDER_UNAVAILABLE", "Congressional disclosure feed temporarily unavailable.");
    }
  }
}
