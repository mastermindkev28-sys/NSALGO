import Stripe from "stripe";
import { beforeAll, describe, expect, it } from "vitest";
import { __resetEnvForTests } from "@/config/env";

const SECRET = "whsec_test_secret_for_unit_tests";

describe("stripe webhook", () => {
  beforeAll(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    __resetEnvForTests();
  });

  it("rejects missing and invalid signatures", async () => {
    const { handleStripeWebhook } = await import("@/services/billing");
    expect((await handleStripeWebhook("{}", null)).status).toBe(400);
    expect((await handleStripeWebhook('{"id":"evt_1"}', "t=1,v1=deadbeef")).status).toBe(400);
  });

  it("accepts a correctly signed event once (idempotent)", async () => {
    const { handleStripeWebhook } = await import("@/services/billing");
    const payload = JSON.stringify({ id: `evt_${Date.now()}`, object: "event", type: "ping.test", data: { object: {} } });
    const header = new Stripe("sk_test_dummy").webhooks.generateTestHeaderString({ payload, secret: SECRET });
    const first = await handleStripeWebhook(payload, header);
    expect(first.status).toBe(200);
    expect(first.message).toBe("ok");
    const second = await handleStripeWebhook(payload, header);
    expect(second.message).toBe("Already processed");
  });
});
