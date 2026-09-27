import "server-only";
/** Trading Economics calendar adapter. Values are passed through exactly as published; blanks stay null. */
import { fetchJson } from "@/lib/http";
import { fail, ok, type DataResult } from "@/types/data";
import type { EarningsEvent, EconomicEvent } from "@/types/disclosures";
import { healthy, meta, unhealthy } from "../meta";
import type { EconomicCalendarProvider } from "../types";

interface TeRow {
  CalendarId: string;
  Date: string;
  Country: string;
  Category: string;
  Event: string;
  Actual: string;
  Previous: string;
  Forecast: string;
  TEForecast?: string;
  Importance: number;
}

export function category(c: string): EconomicEvent["category"] {
  const s = c.toLowerCase();
  if (/inflation|cpi|pce|price/.test(s)) return "inflation";
  if (/payroll|employment|jobless|unemployment|job/.test(s)) return "employment";
  if (/gdp|growth/.test(s)) return "growth";
  if (/interest rate|fed|fomc/.test(s)) return "central-bank";
  if (/retail|consumer|confidence|sentiment|spending/.test(s)) return "consumer";
  if (/pmi|manufactur|industrial/.test(s)) return "manufacturing";
  if (/home|housing|building/.test(s)) return "housing";
  if (/auction|bill|note|bond/.test(s)) return "treasury";
  return "other";
}

const blank = (v: string | undefined | null) => (v && v.trim() ? v.trim() : null);

export class TradingEconomicsCalendarProvider implements EconomicCalendarProvider {
  readonly id = "tradingeconomics";
  readonly label = "Trading Economics";
  readonly isMock = false;
  constructor(private apiKey: string) {}
  private url(from: string, to: string) {
    return `https://api.tradingeconomics.com/calendar/country/united%20states/${from}/${to}?c=${encodeURIComponent(this.apiKey)}&f=json`;
  }
  async healthCheck() {
    const t = Date.now();
    try {
      const d = new Date().toISOString().slice(0, 10);
      await fetchJson(this.url(d, d));
      return healthy("Operational", Date.now() - t);
    } catch (e) {
      return unhealthy((e as Error).message, Date.now() - t);
    }
  }
  async list(r: { from: string; to: string }): Promise<DataResult<EconomicEvent[]>> {
    try {
      const rows = await fetchJson<TeRow[]>(this.url(r.from, r.to), { timeoutMs: 10_000 });
      const events = rows.map((x) => ({
        id: String(x.CalendarId),
        datetime: new Date(x.Date.endsWith("Z") ? x.Date : `${x.Date}Z`).toISOString(),
        country: "US",
        event: x.Event,
        category: category(`${x.Category} ${x.Event}`),
        importance: x.Importance >= 3 ? "high" : x.Importance === 2 ? "medium" : "low",
        previous: blank(x.Previous),
        forecast: blank(x.Forecast), // consensus only; TE's own model forecast is not shown as consensus
        actual: blank(x.Actual),
        source: this.id,
      })) satisfies EconomicEvent[];
      return ok(events, meta(this.id, this.label, "live"));
    } catch {
      return fail("PROVIDER_UNAVAILABLE", "Economic calendar provider temporarily unavailable.");
    }
  }
  async earnings(): Promise<DataResult<EarningsEvent[]>> {
    return fail("UNSUPPORTED", "Earnings calendar is not configured for this provider.");
  }
}
