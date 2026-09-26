import "server-only";
import { hashPasswordSync } from "@/services/auth/password";
import type { Plan, UserWithSecret } from "@/types/domain";
import type { MemoryState } from "./memory";
import { SEED_ARTICLES, SEED_CATEGORIES } from "./seed/education";
import { DEFAULT_SITE_CONTENT, planFeatures } from "@/config/site";

/**
 * Seed data for the in-memory store. Demo accounts exist only when
 * DATA_MODE=mock and are shown on the login page in that mode.
 */
export const DEMO_PASSWORD = "Northstar-2026!";
export const DEMO_ACCOUNTS = [
  { email: "member@nsalgo.dev", role: "member" as const, plan: "annual" as const },
  { email: "free@nsalgo.dev", role: "member" as const, plan: null },
  { email: "admin@nsalgo.dev", role: "admin" as const, plan: "annual" as const },
];

function cents(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

export function seedPlans(): Plan[] {
  return [
    {
      id: crypto.randomUUID(),
      code: "monthly",
      name: "Monthly",
      interval: "month",
      amount: cents(process.env.MONTHLY_PRICE),
      currency: process.env.BILLING_CURRENCY ?? "USD",
      stripePriceId: process.env.STRIPE_PRICE_MONTHLY || null,
      active: true,
      features: planFeatures,
    },
    {
      id: crypto.randomUUID(),
      code: "annual",
      name: "Annual",
      interval: "year",
      amount: cents(process.env.ANNUAL_PRICE),
      currency: process.env.BILLING_CURRENCY ?? "USD",
      stripePriceId: process.env.STRIPE_PRICE_ANNUAL || null,
      active: true,
      features: planFeatures,
    },
  ];
}

export function seedState(): MemoryState {
  const now = new Date().toISOString();
  const isMock = (process.env.DATA_MODE ?? "mock") === "mock";
  const users: UserWithSecret[] = [];
  const state: MemoryState = {
    users,
    profiles: [],
    sessions: [],
    tokens: [],
    plans: seedPlans(),
    subscriptions: [],
    transactions: [],
    stripeEvents: [],
    watchlists: [],
    alerts: [],
    notifications: [],
    categories: SEED_CATEGORIES.map((c) => ({ ...c, id: crypto.randomUUID() })),
    articles: SEED_ARTICLES.map((a) => ({ ...a, id: crypto.randomUUID(), createdAt: a.publishedAt ?? now, updatedAt: a.publishedAt ?? now })),
    commentary: [
      {
        id: crypto.randomUUID(),
        title: "Desk note: participation matters more than the index print",
        body: "Index-level strength has been concentrated in a handful of mega-caps. Before leaning into breakouts, check breadth on the Markets page and the regime signals in ATLAS. When fewer than half of sectors participate, favour defined-risk structures and take partial profits into strength.",
        authorName: "NSALGO Research",
        tickers: ["SPY", "QQQ"],
        status: "published",
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ],
    atlasConfigs: [],
    setups: [],
    logs: [],
    audit: [],
    siteContent: { ...DEFAULT_SITE_CONTENT, updatedAt: now },
    analytics: [],
    jobs: [],
  };

  if (isMock) {
    const hash = hashPasswordSync(DEMO_PASSWORD);
    for (const acct of DEMO_ACCOUNTS) {
      const id = crypto.randomUUID();
      users.push({ id, email: acct.email, passwordHash: hash, role: acct.role, emailVerifiedAt: now, createdAt: now, updatedAt: now, disabledAt: null });
      state.profiles.push({ userId: id, displayName: acct.role === "admin" ? "Admin" : acct.plan ? "Demo Member" : "Demo Free", timezone: "America/New_York", experience: "advanced", defaultMode: "swing", marketingOptIn: false });
      if (acct.plan) {
        const end = new Date(Date.now() + 330 * 86_400_000).toISOString();
        const subId = crypto.randomUUID();
        state.subscriptions.push({ id: subId, userId: id, planCode: acct.plan, provider: "mock", providerCustomerId: `mock_cus_${id.slice(0, 8)}`, providerSubscriptionId: `mock_sub_${id.slice(0, 8)}`, status: "active", currentPeriodEnd: end, cancelAtPeriodEnd: false, createdAt: now, updatedAt: now });
        state.transactions.push({ id: crypto.randomUUID(), userId: id, subscriptionId: subId, providerInvoiceId: `mock_in_${id.slice(0, 8)}`, amount: 0, currency: "USD", status: "paid", hostedInvoiceUrl: null, createdAt: now });
      }
      if (acct.email === "member@nsalgo.dev") {
        const mk = (name: string, position: number, symbols: string[]) => {
          const wid = crypto.randomUUID();
          state.watchlists.push({
            id: wid,
            userId: id,
            name,
            position,
            createdAt: now,
            items: symbols.map((symbol, i) => ({ id: crypto.randomUUID(), watchlistId: wid, symbol, note: null, position: i, addedAt: now })),
          });
        };
        mk("Core", 0, ["NVDA", "AAPL", "MSFT", "AMZN", "META", "GOOGL"]);
        mk("Day Trade", 1, ["TSLA", "AMD", "PLTR", "COIN", "SMCI"]);
        mk("Swing", 2, ["AVGO", "LLY", "JPM", "CAT", "UBER"]);
        mk("Earnings", 3, ["NFLX", "ORCL", "MU"]);
        state.alerts.push({ id: crypto.randomUUID(), userId: id, kind: "atlas-score", symbol: "NVDA", threshold: 75, channel: "in-app", active: true, lastTriggeredAt: null, createdAt: now });
        state.notifications.push({ id: crypto.randomUUID(), userId: id, title: "Welcome to NSALGO", body: "Your watchlists are ready. ATLAS ranks new setups every session.", href: "/dashboard/atlas", kind: "system", readAt: null, createdAt: now });
      }
    }
  }
  return state;
}
