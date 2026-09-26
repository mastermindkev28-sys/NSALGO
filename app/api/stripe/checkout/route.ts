import { z } from "zod";
import { apiError, json, route } from "@/lib/api";
import { log } from "@/lib/logger";
import { startCheckout } from "@/services/billing";

const Body = z.object({ plan: z.enum(["monthly", "annual"]) });

/** POST /api/stripe/checkout — creates a Checkout session for the signed-in user. */
export const POST = route({ auth: "user", body: Body }, async ({ viewer, body }) => {
  if (viewer!.paid && viewer!.state !== "admin") return apiError(409, "CONFLICT", "Membership already active.");
  try {
    return json({ ok: true, data: await startCheckout(viewer!.user, body.plan) });
  } catch (e) {
    log.error("billing", "Checkout API failed", { error: (e as Error).message });
    return apiError(502, "PROVIDER_UNAVAILABLE", "Checkout is temporarily unavailable.");
  }
});
