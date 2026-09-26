import "server-only";
import { providers } from "@/providers/registry";
import type { DisclosureFilter } from "@/types/disclosures";
import type { NewsFilter } from "@/types/news";
import type { FlowFilter } from "@/types/options";
import { load } from "./data";

/** News, options, disclosures and calendar services. */

const key = (o: object) => JSON.stringify(Object.entries(o).filter(([, v]) => v !== undefined).sort());

export function listNews(f: NewsFilter = {}) {
  return load(`news:${key(f)}`, 60_000, () => providers().news.list(f));
}

export function getArticle(id: string) {
  return load(`news:id:${id}`, 5 * 60_000, () => providers().news.get(id));
}

export function getOptionChain(symbol: string, expiration?: string) {
  return load(`chain:${symbol.toUpperCase()}:${expiration ?? "front"}`, 30_000, () => providers().options.getChain(symbol, expiration));
}

export function getExpirations(symbol: string) {
  return load(`exps:${symbol.toUpperCase()}`, 3600_000, () => providers().options.getExpirations(symbol));
}

export function getFlow(f: FlowFilter = {}) {
  return load(`flow:${key(f)}`, 20_000, () => providers().options.getFlow(f));
}

export function listInsiders(f: DisclosureFilter = {}) {
  return load(`ins:${key(f)}`, 15 * 60_000, () => providers().insiders.list(f));
}

export function listInstitutional(f: DisclosureFilter = {}) {
  return load(`inst:${key(f)}`, 30 * 60_000, () => providers().institutional.list(f));
}

export function listCongress(f: DisclosureFilter = {}) {
  return load(`cong:${key(f)}`, 30 * 60_000, () => providers().congress.list(f));
}

export function listEconomicEvents(from: string, to: string) {
  return load(`econ:${from}:${to}`, 10 * 60_000, () => providers().calendar.list({ from, to }));
}

export function listEarnings(from: string, to: string, symbols?: string[]) {
  return load(`earn:${from}:${to}:${symbols?.join(",") ?? "*"}`, 60 * 60_000, () => providers().calendar.earnings({ from, to }, symbols));
}
