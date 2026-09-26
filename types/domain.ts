/** Application domain types — users, membership, content, alerts. */

export type Role = "member" | "analyst" | "editor" | "admin";

export type MembershipState = "visitor" | "free" | "active" | "past_due" | "canceled" | "admin";

export interface User {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
  role: Role;
  createdAt: string;
  updatedAt: string;
  disabledAt: string | null;
}

export interface UserWithSecret extends User {
  passwordHash: string;
}

export interface Profile {
  userId: string;
  displayName: string | null;
  timezone: string;
  experience: "new" | "intermediate" | "advanced" | null;
  defaultMode: "day" | "swing";
  marketingOptIn: boolean;
}

export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  lastSeenAt: string;
  ip: string | null;
  userAgent: string | null;
}

export type TokenPurpose = "verify-email" | "reset-password";

export interface OneTimeToken {
  id: string;
  userId: string;
  purpose: TokenPurpose;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
}

export type BillingInterval = "month" | "year";

export interface Plan {
  id: string;
  code: "monthly" | "annual";
  name: string;
  interval: BillingInterval;
  /** Minor units (cents). null = not configured; UI shows a placeholder. */
  amount: number | null;
  currency: string;
  stripePriceId: string | null;
  active: boolean;
  features: string[];
}

export type SubscriptionStatus =
  | "incomplete"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete_expired"
  | "paused";

export interface Subscription {
  id: string;
  userId: string;
  planCode: Plan["code"] | null;
  provider: "stripe" | "mock";
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BillingTransaction {
  id: string;
  userId: string;
  subscriptionId: string | null;
  providerInvoiceId: string | null;
  amount: number;
  currency: string;
  status: "paid" | "open" | "failed" | "refunded" | "void";
  hostedInvoiceUrl: string | null;
  createdAt: string;
}

export interface Watchlist {
  id: string;
  userId: string;
  name: string;
  position: number;
  createdAt: string;
  items: WatchlistItem[];
}

export interface WatchlistItem {
  id: string;
  watchlistId: string;
  symbol: string;
  note: string | null;
  position: number;
  addedAt: string;
}

export type AlertKind =
  | "price-above"
  | "price-below"
  | "atlas-score"
  | "options-flow"
  | "news"
  | "earnings"
  | "unusual-volume"
  | "insider";

export interface Alert {
  id: string;
  userId: string;
  kind: AlertKind;
  symbol: string | null;
  threshold: number | null;
  channel: "in-app" | "email" | "push";
  active: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  href: string | null;
  kind: AlertKind | "system";
  readAt: string | null;
  createdAt: string;
}

export type Difficulty = "foundational" | "intermediate" | "advanced";

export interface EducationCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  position: number;
}

export interface EducationArticle {
  id: string;
  slug: string;
  title: string;
  description: string;
  authorName: string;
  categorySlug: string;
  difficulty: Difficulty;
  readMinutes: number;
  content: string; // restricted Markdown, rendered without raw HTML
  featuredImage: string | null;
  featured: boolean;
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  relatedSlugs: string[];
}

export interface SystemLog {
  id: string;
  level: "info" | "warn" | "error";
  scope: string;
  message: string;
  context: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  action: string;
  target: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
}

export interface SiteContent {
  heroEyebrow: string;
  heroHeadline: string;
  heroSubhead: string;
  announcement: string | null;
  featuredTickers: string[];
  updatedAt: string;
}

export interface AnalyticsEvent {
  id: string;
  name: string;
  userId: string | null;
  anonymousId: string | null;
  path: string | null;
  properties: Record<string, unknown> | null;
  createdAt: string;
}
