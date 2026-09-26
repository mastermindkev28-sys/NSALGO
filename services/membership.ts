import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { can, isStaff, type Permission } from "@/lib/auth/permissions";
import type { MembershipState, Profile, Subscription, User } from "@/types/domain";
import { getSessionUser } from "./auth/session";

/**
 * Membership & entitlements. Paid access is always derived server-side from
 * the subscription record (updated only by verified Stripe webhooks) — never
 * from client state.
 */
const PAST_DUE_GRACE_DAYS = 7;

export function membershipState(user: User | null, sub: Subscription | null, now = Date.now()): MembershipState {
  if (!user) return "visitor";
  if (user.role === "admin") return "admin";
  if (!sub) return "free";
  const periodEnd = sub.currentPeriodEnd ? Date.parse(sub.currentPeriodEnd) : 0;
  switch (sub.status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
      return periodEnd > now ? "active" : "canceled";
    default:
      return "free";
  }
}

export function hasPaidAccess(state: MembershipState, sub: Subscription | null, now = Date.now()): boolean {
  if (state === "active" || state === "admin") return true;
  if (state === "past_due" && sub?.currentPeriodEnd) {
    return Date.parse(sub.currentPeriodEnd) + PAST_DUE_GRACE_DAYS * 86_400_000 > now;
  }
  return false;
}

export interface Viewer {
  user: User | null;
  profile: Profile | null;
  subscription: Subscription | null;
  state: MembershipState;
  paid: boolean;
  staff: boolean;
}

export const getViewer = cache(async (): Promise<Viewer> => {
  const user = await getSessionUser();
  if (!user) return { user: null, profile: null, subscription: null, state: "visitor", paid: false, staff: false };
  const [subscription, profile] = await Promise.all([db().billing.getSubscriptionForUser(user.id), db().profiles.get(user.id)]);
  const state = membershipState(user, subscription);
  const staff = isStaff(user.role);
  return { user, profile, subscription, state, paid: hasPaidAccess(state, subscription) || staff, staff };
});

export async function requireUser(next = "/dashboard"): Promise<Viewer & { user: User }> {
  const v = await getViewer();
  if (!v.user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return v as Viewer & { user: User };
}

export async function requirePermission(permission: Permission, next = "/admin"): Promise<Viewer & { user: User }> {
  const v = await requireUser(next);
  if (!can(v.user.role, permission)) redirect("/dashboard?denied=1");
  return v;
}

/** For API routes: returns the viewer or a typed failure instead of redirecting. */
export async function apiViewer(opts: { paid?: boolean; permission?: Permission } = {}) {
  const v = await getViewer();
  if (!v.user) return { ok: false as const, status: 401, message: "Authentication required." };
  if (opts.paid && !v.paid) return { ok: false as const, status: 402, message: "An active NSALGO membership is required." };
  if (opts.permission && !can(v.user.role, opts.permission)) return { ok: false as const, status: 403, message: "Insufficient permissions." };
  return { ok: true as const, viewer: v as Viewer & { user: User } };
}
