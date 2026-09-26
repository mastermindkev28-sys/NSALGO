export const NEWS_CATEGORIES = [
  "breaking",
  "markets",
  "economy",
  "fed",
  "earnings",
  "technology",
  "ai",
  "options",
  "macro",
  "crypto",
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export type MarketImpact = "high" | "medium" | "low";
export type Sentiment = "positive" | "negative" | "neutral";

/**
 * Only fields a licensed provider permits us to store are persisted. Full article
 * bodies are never redistributed — readers are linked to the publisher.
 */
export interface NewsArticle {
  id: string;
  headline: string;
  summary: string | null;
  source: string; // provider/feed, e.g. "Polygon.io"
  publisher: string; // original publisher, e.g. "Reuters"
  url: string; // canonical publisher URL
  imageUrl: string | null;
  tickers: string[];
  categories: NewsCategory[];
  publishedAt: string;
  fetchedAt: string;
  impact: MarketImpact | null;
  sentiment: Sentiment | null;
  isBreaking: boolean;
}

export interface NewsFilter {
  category?: NewsCategory;
  ticker?: string;
  q?: string;
  limit?: number;
  before?: string;
}

export interface Commentary {
  id: string;
  title: string;
  body: string;
  authorName: string;
  tickers: string[];
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
