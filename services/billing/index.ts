import "server-only";
/**
 * Billing. Stripe is the production provider: Checkout for purchase, the
 * Customer Portal for upgrades/downgrades/cancellation/payment methods, and
 * signature-verified webhooks as the ONLY path that changes paid access.
 *
 * The mock provider exists for local development without Stripe keys. It
 * performs the same server-side state transition a webhook would, and refuses
 * to run when NODE_ENV=production.
 */
import Stripe from "stripe";
import { env } from "@/config/env";
import { SITE } from "@/config/site";
import { db } from "@/db";
import { log } from "@/lib/logger";
import { audit } from "@/services/audit";
import { track } from "@/services/analytics";
import type { Plan, Subscription, SubscriptionStatus, User } from "@/types/domain";

export interface BillingProvider {
  id: "stripe" | "mock";
  createCheckout(user: User, plan: Plan): Promise<{ url: string }>;
  createPortal(user: User): Promise<{ url: string } | null>;
  cancel?(user: User): Promise<void>;
}

let stripeClient: Stripe | null = null;
export function stripe(): Stripe | null {
  const key = env().STRIPE_SECRET_KEY;
  if (!key) return null;
  stripeClient ??= new Stripe(key, { appInfo: { name: "NSALGO", url: SITE.url }, maxNetworkRetries: 2 });
  return stripeClient;
}

class StripeBilling implements BillingProvider {
  id = "stripe" as const;
  constructor(private s: Stripe) {}

  private async customerFor(user: User): Promise<string> {
    const existing = await db().billing.getSubscriptionForUser(user.id);
    if (existing?.providerCustomerId && existing.provider === "stripe") return existing.providerCustomerId;
    const found = await this.s.customers.list({ email: user.email, limit: 1 });
    if (found.data[0]) return found.data[0].id;
    const c = await this.s.customers.create({ email: user.email, metadata: { nsalgo_user_id: user.id } });
    return c.id;
  }

  async createCheckout(user: User, plan: Plan) {
    if (!plan.stripePriceId) throw new Error(`Plan ${plan.code} has no Stripe price configured.`);
    const customer = await this.customerFor(user);
    const session = await this.s.checkout.sessions.create(
      {
        mode: "subscription",
        customer,
        client_reference_id: user.id,
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        allow_promotion_codes: true,
        subscription_data: { metadata: { nsalgo_user_id: user.id, plan_code: plan.code } },
        metadata: { nsalgo_user_id: user.id, plan_code: plan.code },
        success_url: `${SITE.url}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${SITE.url}/signup/plan?checkout=canceled`,
      },
      { idempotencyKey: `checkout:${user.id}:${plan.code}:${Math.floor(Date.now() / 60_000)}` },
    );
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return { url: session.url };
  }

  async createPortal(user: User) {
    const sub = await db().billing.getSubscriptionForUser(user.id);
    if (!sub?.providerCustomerId || sub.provider !== "stripe") return null;
    const p = await this.s.billingPortal.sessions.create({ customer: sub.providerCustomerId, return_url: `${SITE.url}/dashboard/billing` });
    return { url: p.url };
  }
}

class MockBilling implements BillingProvider {
  id = "mock" as const;
  async createCheckout(user: User, plan: Plan) {
    if (process.env.NODE_ENV === "production") throw new Error("Mock billing is disabled in production.");
    const periodEnd = new Date(Date.now() + (plan.interval === "year" ? 365 : 30) * 86_400_000).toISOString();
    await applySubscription({
      userId: user.id,
      planCode: plan.code,
      provider: "mock",
      providerCustomerId: `mock_cus_${user.id.slice(0, 8)}`,
      providerSubscriptionId: `mock_sub_${user.id.slice(0, 8)}`,
      status: "active",
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    });
    await db().billing.insertTransaction({ userId: user.id, subscriptionId: null, providerInvoiceId: `mock_in_${crypto.randomUUID().slice(0, 8)}`, amount: plan.amount ?? 0, currency: plan.currency, status: "paid", hostedInvoiceUrl: null });
    return { url: `${SITE.url}/dashboard?checkout=success&mock=1` };
  }
  async createPortal() {
    return { url: `${SITE.url}/dashboard/billing?portal=mock` };
  }
  async cancel(user: User) {
    const sub = await db().billing.getSubscriptionForUser(user.id);
    if (sub) await applySubscription({ ...sub, cancelAtPeriodEnd: true, status: "active" });
  }
}

export function billing(): BillingProvider {
  const s = stripe();
  if (s) return new StripeBilling(s);
  return new MockBilling();
}

export function billingConfigured(): { provider: "stripe" | "mock"; ready: boolean; issues: string[] } {
  const e = env();
  const issues: string[] = [];
  if (!e.STRIPE_SECRET_KEY) issues.push("STRIPE_SECRET_KEY not set — mock billing active (development only).");
  if (e.STRIPE_SECRET_KEY && !e.STRIPE_WEBHOOK_SECRET) issues.push("STRIPE_WEBHOOK_SECRET not set — webhooks cannot be verified.");
  if (e.STRIPE_SECRET_KEY && !e.STRIPE_PRICE_MONTHLY && !e.STRIPE_PRICE_ANNUAL) issues.push("No Stripe price IDs configured.");
  return { provider: e.STRIPE_SECRET_KEY ? "stripe" : "mock", ready: issues.length === 0, issues };
}

export async function getPlans(): Promise<Plan[]> {
  const plans = await db().billing.listPlans();
  const e = env();
  // Environment price IDs fill gaps so a fresh deploy works before admin edits.
  return plans.map((p) => ({
    ...p,
    stripePriceId: p.stripePriceId ?? (p.code === "monthly" ? (e.STRIPE_PRICE_MONTHLY ?? null) : (e.STRIPE_PRICE_ANNUAL ?? null)),
  }));
}

/* ── Webhook-driven state ─────────────────────────────────────────────────── */

type SubInput = Omit<Subscription, "id" | "createdAt" | "updatedAt">;

async function applySubscription(input: SubInput) {
  const prev = input.providerSubscriptionId ? await db().billing.getSubscriptionByProviderId(input.providerSubscriptionId) : null;
  const saved = await db().billing.upsertSubscription(input);
  if (!prev && ["active", "trialing"].includes(saved.status)) {
    await track("subscription_created", { userId: saved.userId, properties: { plan: saved.planCode, provider: saved.provider } });
  }
  if (prev && prev.status !== "canceled" && saved.status === "canceled") {
    await track("subscription_canceled", { userId: saved.userId, properties: { plan: saved.planCode } });
  }
  await audit("billing.subscription_updated", { actorId: saved.userId, target: saved.providerSubscriptionId, metadata: { status: saved.status, plan: saved.planCode } });
  return saved;
}

function planCodeForPrice(priceId: string | undefined, plans: Plan[]): Plan["code"] | null {
  return plans.find((p) => p.stripePriceId === priceId)?.code ?? null;
}

async function syncStripeSubscription(s: Stripe, sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  let userId = (sub.metadata?.nsalgo_user_id as string | undefined) ?? (await db().billing.findUserIdByCustomer(customerId));
  if (!userId) {
    const c = await s.customers.retrieve(customerId);
    if (!("deleted" in c) || !c.deleted) userId = (c as Stripe.Customer).metadata?.nsalgo_user_id ?? null;
  }
  if (!userId) {
    log.warn("billing", "Subscription without resolvable user", { subscription: sub.id });
    return;
  }
  const item = sub.items.data[0];
  const plans = await getPlans();
  const periodEnd = item?.current_period_end ?? null;
  await applySubscription({
    userId,
    planCode: planCodeForPrice(item?.price.id, plans) ?? ((sub.metadata?.plan_code as Plan["code"]) || null),
    provider: "stripe",
    providerCustomerId: customerId,
    providerSubscriptionId: sub.id,
    status: sub.status as SubscriptionStatus,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  });
}

/**
 * Verifies the Stripe signature against the raw body, de-duplicates by event
 * id, and applies the state change. Returns an HTTP status for the route.
 */
export async function handleStripeWebhook(rawBody: string, signature: string | null): Promise<{ status: number; message: string }> {
  const s = stripe();
  const secret = env().STRIPE_WEBHOOK_SECRET;
  if (!s || !secret) return { status: 503, message: "Stripe not configured" };
  if (!signature) return { status: 400, message: "Missing signature" };
  let event: Stripe.Event;
  try {
    event = s.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    log.warn("billing", "Rejected webhook with invalid signature");
    return { status: 400, message: "Invalid signature" };
  }
  const fresh = await db().billing.markEventProcessed(event.id, event.type);
  if (!fresh) return { status: 200, message: "Already processed" };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const cs = event.data.object;
        if (cs.mode === "subscription" && cs.subscription) {
          const sub = await s.subscriptions.retrieve(typeof cs.subscription === "string" ? cs.subscription : cs.subscription.id);
          if (cs.client_reference_id && !sub.metadata?.nsalgo_user_id) sub.metadata = { ...sub.metadata, nsalgo_user_id: cs.client_reference_id };
          await syncStripeSubscription(s, sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
        await syncStripeSubscription(s, event.data.object);
        break;
      case "invoice.paid":
      case "invoice.payment_failed":
      case "invoice.finalized": {
        const inv = event.data.object;
        const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        const userId = customerId ? await db().billing.findUserIdByCustomer(customerId) : null;
        if (userId && inv.id) {
          const subRef = inv.parent?.subscription_details?.subscription;
          const subId = typeof subRef === "string" ? subRef : subRef?.id;
          const local = subId ? await db().billing.getSubscriptionByProviderId(subId) : null;
          await db().billing.insertTransaction({
            userId,
            subscriptionId: local?.id ?? null,
            providerInvoiceId: inv.id,
            amount: event.type === "invoice.paid" ? inv.amount_paid : inv.amount_due,
            currency: inv.currency.toUpperCase(),
            status: event.type === "invoice.paid" ? "paid" : event.type === "invoice.payment_failed" ? "failed" : "open",
            hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
            createdAt: new Date(inv.created * 1000).toISOString(),
          });
          if (subId && event.type !== "invoice.finalized") await syncStripeSubscription(s, await s.subscriptions.retrieve(subId));
        }
        break;
      }
      default:
        break;
    }
    return { status: 200, message: "ok" };
  } catch (e) {
    log.error("billing", "Webhook processing failed", { type: event.type, error: (e as Error).message });
    await db().billing.unmarkEvent(event.id);
    return { status: 500, message: "Processing failed" };
  }
}

export async function startCheckout(user: User, planCode: Plan["code"]) {
  const plan = (await getPlans()).find((p) => p.code === planCode && p.active);
  if (!plan) throw new Error("Plan unavailable.");
  await track("checkout_started", { userId: user.id, properties: { plan: planCode } });
  return billing().createCheckout(user, plan);
}
