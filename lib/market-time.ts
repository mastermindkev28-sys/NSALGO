import type { MarketSessionState } from "@/types/market";

/** US equity market calendar helpers (America/New_York). */

const NYSE_HOLIDAYS = new Set([
  // 2025
  "2025-01-01", "2025-01-09", "2025-01-20", "2025-02-17", "2025-04-18", "2025-05-26", "2025-06-19",
  "2025-07-04", "2025-09-01", "2025-11-27", "2025-12-25",
  // 2026
  "2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25", "2026-06-19", "2026-07-03",
  "2026-09-07", "2026-11-26", "2026-12-25",
  // 2027
  "2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26", "2027-05-31", "2027-06-18", "2027-07-05",
  "2027-09-06", "2027-11-25", "2027-12-24",
]);

const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

export interface NyParts {
  date: string; // YYYY-MM-DD
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 Sun … 6 Sat
  minutesOfDay: number;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function nyParts(d: Date = new Date()): NyParts {
  const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour,
    minute,
    second: Number(parts.second),
    weekday: WEEKDAYS.indexOf(parts.weekday ?? "Mon"),
    minutesOfDay: hour * 60 + minute,
  };
}

export function isTradingDay(date: string): boolean {
  const d = new Date(`${date}T12:00:00Z`);
  const wd = d.getUTCDay();
  return wd !== 0 && wd !== 6 && !NYSE_HOLIDAYS.has(date);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function previousTradingDay(date: string): string {
  let d = addDays(date, -1);
  while (!isTradingDay(d)) d = addDays(d, -1);
  return d;
}

export function nextTradingDay(date: string): string {
  let d = addDays(date, 1);
  while (!isTradingDay(d)) d = addDays(d, 1);
  return d;
}

export const OPEN_MIN = 9 * 60 + 30;
export const CLOSE_MIN = 16 * 60;
const PRE_MIN = 4 * 60;
const POST_END_MIN = 20 * 60;

export function sessionState(now: Date = new Date()): MarketSessionState {
  const p = nyParts(now);
  if (!isTradingDay(p.date)) return "closed";
  if (p.minutesOfDay >= OPEN_MIN && p.minutesOfDay < CLOSE_MIN) return "open";
  if (p.minutesOfDay >= PRE_MIN && p.minutesOfDay < OPEN_MIN) return "pre";
  if (p.minutesOfDay >= CLOSE_MIN && p.minutesOfDay < POST_END_MIN) return "post";
  return "closed";
}

/**
 * The trading session whose data is "current": today once the bell has rung,
 * otherwise the previous session.
 */
export function currentSessionDate(now: Date = new Date()): string {
  const p = nyParts(now);
  if (isTradingDay(p.date) && p.minutesOfDay >= OPEN_MIN) return p.date;
  return previousTradingDay(p.date);
}

/** Minutes elapsed in the regular session for `date` (0–390). */
export function sessionMinutesElapsed(date: string, now: Date = new Date()): number {
  const p = nyParts(now);
  if (p.date !== date) return 390;
  return Math.max(0, Math.min(390, p.minutesOfDay - OPEN_MIN));
}

/** Offset of New York from UTC in minutes for a given date (handles DST). */
export function nyOffsetMinutes(date: string): number {
  const probe = new Date(`${date}T12:00:00Z`);
  const p = nyParts(probe);
  return (p.hour - 12) * 60 + p.minute;
}

/** Unix seconds for a New York wall-clock minute on a date. */
export function nyTimeToUnix(date: string, minutesOfDay: number): number {
  const base = Date.parse(`${date}T00:00:00Z`) / 1000;
  return base + minutesOfDay * 60 - nyOffsetMinutes(date) * 60;
}

export function tradingDaysBack(fromDate: string, count: number): string[] {
  const out: string[] = [];
  let d = fromDate;
  if (!isTradingDay(d)) d = previousTradingDay(d);
  while (out.length < count) {
    out.push(d);
    d = previousTradingDay(d);
  }
  return out.reverse();
}

export function marketStatusLabel(state: MarketSessionState): string {
  switch (state) {
    case "open":
      return "Market Open";
    case "pre":
      return "Pre-Market";
    case "post":
      return "After Hours";
    default:
      return "Market Closed";
  }
}

export function nextSessionChange(now: Date = new Date()): string | null {
  const p = nyParts(now);
  const state = sessionState(now);
  let date = p.date;
  let minute: number;
  if (state === "open") minute = CLOSE_MIN;
  else if (state === "pre") minute = OPEN_MIN;
  else {
    if (!(isTradingDay(date) && p.minutesOfDay < PRE_MIN)) date = nextTradingDay(date);
    minute = OPEN_MIN;
  }
  return new Date(nyTimeToUnix(date, minute) * 1000).toISOString();
}

/** Third Friday of a month (standard monthly options expiration). */
export function thirdFriday(year: number, month: number): string {
  const first = new Date(Date.UTC(year, month, 1));
  const firstFriday = 1 + ((5 - first.getUTCDay() + 7) % 7);
  const d = new Date(Date.UTC(year, month, firstFriday + 14));
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}
