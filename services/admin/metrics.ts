import "server-only";
import { db } from "@/db";
import { membershipState } from "@/services/membership";

/** Business & product metrics for the admin dashboard (staff only). */
export async function adminMetrics() {
  const now = Date.now();
  const d30 = new Date(now - 30 * 86_400_000).toISOString();
  const d7 = new Date(now - 7 * 86_400_000).toISOString();
  const d1 = new Date(now - 86_400_000).toISOString();
  const [users, newUsers, subsPage, plans, tx, events7, dau, wau, popularWatch, popularAtlas, popularArticles, setups] = await Promise.all([
    db().users.count(),
    db().users.count({ since: d30 }),
    db().billing.listSubscriptions({ page: 1, pageSize: 10_000 }),
    db().billing.listPlans(),
    db().billing.allTransactions(d30),
    db().ops.eventCounts(d7),
    db().ops.distinctUsers(d1),
    db().ops.distinctUsers(d7),
    db().watchlists.popularSymbols(10),
    db().ops.topProperty("atlas_setup_viewed", "symbol", d30, 10),
    db().ops.topProperty("education_article_opened", "slug", d30, 8),
    db().atlas.countSetups(),
  ]);
  const subs = subsPage.items;
  const active = subs.filter((s) => membershipState({ id: s.userId, role: "member" } as never, s) === "active");
  const price = (code: string | null) => plans.find((p) => p.code === code);
  // MRR normalises annual plans to monthly. Plans without a configured price contribute 0 and are reported.
  let mrrCents = 0;
  let unpriced = 0;
  for (const s of active) {
    const p = price(s.planCode);
    if (!p || p.amount === null) {
      unpriced++;
      continue;
    }
    mrrCents += p.interval === "year" ? p.amount / 12 : p.amount;
  }
  const canceled30 = subs.filter((s) => s.status === "canceled" && s.updatedAt >= d30).length;
  const churnBase = active.length + canceled30;
  const revenue30 = tx.filter((t) => t.status === "paid").reduce((a, t) => a + t.amount, 0);
  const ev = Object.fromEntries(events7.map((e) => [e.name, e.count]));
  return {
    users,
    newUsers,
    activeMembers: active.length,
    pastDue: subs.filter((s) => s.status === "past_due").length,
    mrrCents: Math.round(mrrCents),
    arrCents: Math.round(mrrCents * 12),
    unpriced,
    churnRate: churnBase ? Math.round((canceled30 / churnBase) * 1000) / 10 : null,
    conversionRate: users ? Math.round((active.length / users) * 1000) / 10 : null,
    revenue30,
    dau,
    wau,
    atlasOpens7: ev["atlas_opened"] ?? 0,
    setupViews7: ev["atlas_setup_viewed"] ?? 0,
    signups7: ev["signup_completed"] ?? 0,
    checkouts7: ev["checkout_started"] ?? 0,
    events7,
    popularTickers: popularAtlas.length ? popularAtlas.map((p) => ({ symbol: p.value, count: p.count })) : popularWatch,
    popularArticles,
    setupsRecorded: setups,
  };
}
