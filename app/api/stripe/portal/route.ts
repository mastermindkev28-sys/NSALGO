import { apiError, json, route } from "@/lib/api";
import { billing } from "@/services/billing";

/** POST /api/stripe/portal — Stripe Customer Portal session (upgrade/downgrade, cancel, payment methods, invoices). */
export const POST = route({ auth: "user" }, async ({ viewer }) => {
  const p = await billing().createPortal(viewer!.user);
  return p ? json({ ok: true, data: p }) : apiError(404, "NOT_FOUND", "No billing account found.");
});
