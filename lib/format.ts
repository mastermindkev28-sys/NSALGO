/** Display formatting. Null/undefined always renders as an em dash — never a fabricated zero. */

export const DASH = "—";

type Num = number | null | undefined;

export function fmtPrice(n: Num, opts: { decimals?: number; currency?: boolean } = {}): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return DASH;
  const d = opts.decimals ?? (Math.abs(n) >= 1000 ? 2 : Math.abs(n) < 10 ? (Math.abs(n) < 2 ? 4 : 3) : 2);
  const s = n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  return opts.currency ? `$${s}` : s;
}

export function fmtQuote(n: Num, unit?: string): string {
  if (n === null || n === undefined) return DASH;
  if (unit === "pct") return `${n.toFixed(3)}%`;
  if (unit === "fx") return fmtPrice(n, { decimals: n > 20 ? 2 : 4 });
  return fmtPrice(n);
}

export function fmtChange(n: Num, decimals = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return DASH;
  const s = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${s}`;
}

export function fmtPct(n: Num, decimals = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return DASH;
  return `${fmtChange(n, decimals)}%`;
}

export function fmtCompact(n: Num, opts: { currency?: boolean; decimals?: number } = {}): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return DASH;
  const abs = Math.abs(n);
  const d = opts.decimals ?? 1;
  let s: string;
  if (abs >= 1e12) s = `${(n / 1e12).toFixed(d)}T`;
  else if (abs >= 1e9) s = `${(n / 1e9).toFixed(d)}B`;
  else if (abs >= 1e6) s = `${(n / 1e6).toFixed(d)}M`;
  else if (abs >= 1e3) s = `${(n / 1e3).toFixed(d)}K`;
  else s = n.toFixed(0);
  return opts.currency ? `$${s}` : s;
}

export function fmtInt(n: Num): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return DASH;
  return Math.round(n).toLocaleString("en-US");
}

export function fmtMoney(cents: Num, currency = "USD"): string {
  if (cents === null || cents === undefined) return DASH;
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency });
}

export function fmtIv(n: Num): string {
  if (n === null || n === undefined) return DASH;
  return `${(n * 100).toFixed(1)}%`;
}

export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return DASH;
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

const tzFmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit", hour12: true });
const dateFmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" });
const dateYFmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" });

export function fmtTimeET(iso: string | null | undefined): string {
  if (!iso) return DASH;
  return `${tzFmt.format(new Date(iso))} ET`;
}

export function fmtDate(iso: string | null | undefined, withYear = false): string {
  if (!iso) return DASH;
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
  return (withYear ? dateYFmt : dateFmt).format(d);
}

export function fmtDateTimeET(iso: string | null | undefined): string {
  if (!iso) return DASH;
  return `${fmtDate(iso)} · ${fmtTimeET(iso)}`;
}

export function titleCase(s: string): string {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Compact disclosure range, e.g. $1M–$5M (statutory ranges are never collapsed to a point value). */
export function fmtRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return DASH;
  const f = (n: number) => fmtCompact(n, { currency: true, decimals: n >= 1e6 && n % 1e6 !== 0 ? 1 : 0 });
  if (max === null) return `${f(min!)}+`;
  return `${f(min ?? 0)}–${f(max)}`;
}
