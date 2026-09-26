/** Analytics event catalogue — shared by client and server so names can't drift. */
export const ANALYTICS_EVENTS = [
  "homepage_cta_clicked",
  "signup_started",
  "signup_completed",
  "checkout_started",
  "subscription_created",
  "subscription_canceled",
  "atlas_opened",
  "atlas_setup_viewed",
  "watchlist_created",
  "news_article_opened",
  "education_article_opened",
  "search_performed",
  "page_view",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export function isAnalyticsEvent(name: string): name is AnalyticsEventName {
  return (ANALYTICS_EVENTS as readonly string[]).includes(name);
}
