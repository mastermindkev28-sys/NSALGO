import "server-only";
import { GLOSSARY } from "@/config/glossary";
import { db } from "@/db";
import { listCongress, listInsiders, listNews } from "./intel";
import { searchSymbols } from "./market";

export interface SearchHit {
  type: "symbol" | "article" | "education" | "setup" | "person" | "concept";
  title: string;
  subtitle: string;
  href: string;
  meta?: string;
}

export interface SearchResults {
  query: string;
  groups: { type: SearchHit["type"]; label: string; hits: SearchHit[] }[];
}

/**
 * Global search across tickers, news, education, Atlas setups, disclosed
 * persons and market concepts. Member-only destinations are still listed —
 * access is enforced when the destination is opened.
 */
export async function globalSearch(raw: string, opts: { member: boolean }): Promise<SearchResults> {
  const q = raw.trim().slice(0, 64);
  if (q.length < 1) return { query: q, groups: [] };
  const lower = q.toLowerCase();

  const [symbols, news, edu, insiders, congress, setups] = await Promise.all([
    searchSymbols(q, 8),
    q.length >= 2 ? listNews({ q, limit: 5 }) : null,
    q.length >= 2 ? db().education.listArticles({ q, limit: 5 }) : Promise.resolve([]),
    q.length >= 3 ? listInsiders({ person: q, limit: 30 }) : null,
    q.length >= 3 ? listCongress({ person: q, limit: 30 }) : null,
    /^[a-z.]{1,6}$/i.test(q) ? db().atlas.listSetups({ symbol: q.toUpperCase(), limit: 3 }) : Promise.resolve([]),
  ]);

  const groups: SearchResults["groups"] = [];
  if (symbols.ok && symbols.data.length) {
    groups.push({
      type: "symbol",
      label: "Symbols",
      hits: symbols.data.map((s) => ({ type: "symbol", title: s.symbol, subtitle: s.name, href: `/symbols/${encodeURIComponent(s.symbol)}`, meta: `${s.exchange} · ${s.assetClass.toUpperCase()}` })),
    });
  }
  if (setups.length) {
    groups.push({
      type: "setup",
      label: "Atlas",
      hits: setups.map((s) => ({ type: "setup", title: `${s.symbol} · ${s.mode === "day" ? "Day" : "Swing"} ${s.direction}`, subtitle: `Score ${s.score.value} · ${s.status}`, href: `/dashboard/symbol/${s.symbol}`, meta: opts.member ? undefined : "Members" })),
    });
  }
  if (news?.ok && news.data.length) {
    groups.push({ type: "article", label: "News", hits: news.data.map((a) => ({ type: "article", title: a.headline, subtitle: a.publisher, href: `/news/${encodeURIComponent(a.id)}` })) });
  }
  if (edu.length) {
    groups.push({ type: "education", label: "Education", hits: edu.map((a) => ({ type: "education", title: a.title, subtitle: a.description, href: `/learn/${a.slug}` })) });
  }
  const people = new Map<string, SearchHit>();
  if (insiders?.ok) for (const r of insiders.data) people.set(`i:${r.person}`, { type: "person", title: r.person, subtitle: `${r.role} · ${r.company}`, href: `/dashboard/insiders?person=${encodeURIComponent(r.person)}`, meta: "Insider filings" });
  if (congress?.ok) for (const r of congress.data) people.set(`c:${r.member}`, { type: "person", title: r.member, subtitle: `${r.chamber === "house" ? "House" : "Senate"}${r.state ? ` · ${r.state}` : ""}`, href: `/dashboard/congress?person=${encodeURIComponent(r.member)}`, meta: "Congressional disclosures" });
  if (people.size) groups.push({ type: "person", label: "People", hits: [...people.values()].slice(0, 5) });

  const concepts = GLOSSARY.filter((g) => g.term.toLowerCase().includes(lower) || g.aliases.some((a) => a.includes(lower))).slice(0, 4);
  if (concepts.length) {
    groups.push({ type: "concept", label: "Concepts", hits: concepts.map((c) => ({ type: "concept", title: c.term, subtitle: c.summary, href: c.slug ? `/learn/${c.slug}` : `/learn?q=${encodeURIComponent(c.term)}` })) });
  }
  return { query: q, groups };
}
