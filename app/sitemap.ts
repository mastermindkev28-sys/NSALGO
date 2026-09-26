import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";
import { UNIVERSE } from "@/config/universe";
import { db } from "@/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url.replace(/\/$/, "");
  const now = new Date();
  const staticRoutes = ["", "/markets", "/news", "/atlas", "/options-flow", "/whales", "/learn", "/pricing", "/about", "/contact", "/privacy", "/terms", "/disclaimer"].map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: (p === "" || p === "/markets" || p === "/news" ? "hourly" : "weekly") as "hourly" | "weekly",
    priority: p === "" ? 1 : p === "/atlas" || p === "/pricing" ? 0.9 : 0.7,
  }));
  let lessons: MetadataRoute.Sitemap = [];
  try {
    lessons = (await db().education.listArticles({})).map((a) => ({ url: `${base}/learn/${a.slug}`, lastModified: new Date(a.updatedAt), changeFrequency: "monthly" as const, priority: 0.6 }));
  } catch {
    /* content store unavailable — omit lessons */
  }
  const symbols = UNIVERSE.filter((u) => u.assetClass === "equity" || u.assetClass === "etf").map((u) => ({ url: `${base}/symbols/${u.symbol}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.5 }));
  return [...staticRoutes, ...lessons, ...symbols];
}
