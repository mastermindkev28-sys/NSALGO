import { NextResponse } from "next/server";
import { handleStripeWebhook } from "@/services/billing";

/**
 * POST /api/stripe/webhook — Stripe events. The raw body is verified against
 * the Stripe-Signature header before anything is trusted; events are
 * processed idempotently by id. This is the only path that grants paid access.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 1_000_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const r = await handleStripeWebhook(raw, req.headers.get("stripe-signature"));
  return NextResponse.json({ message: r.message }, { status: r.status });
}
