import { describe, expect, it } from "vitest";
import { hasPaidAccess, membershipState } from "@/services/membership";
import type { Subscription, User } from "@/types/domain";

const user = (role: User["role"] = "member") => ({ id: "u", email: "a@b.c", role, emailVerifiedAt: null, createdAt: "", updatedAt: "", disabledAt: null }) as User;
const sub = (status: Subscription["status"], periodEndDays = 10): Subscription => ({
  id: "s", userId: "u", planCode: "monthly", provider: "stripe", providerCustomerId: "c", providerSubscriptionId: "p", status,
  currentPeriodEnd: new Date(Date.now() + periodEndDays * 86_400_000).toISOString(), cancelAtPeriodEnd: false, createdAt: "", updatedAt: "",
});

describe("membership states", () => {
  it("maps subscription status to membership", () => {
    expect(membershipState(null, null)).toBe("visitor");
    expect(membershipState(user(), null)).toBe("free");
    expect(membershipState(user(), sub("active"))).toBe("active");
    expect(membershipState(user(), sub("trialing"))).toBe("active");
    expect(membershipState(user(), sub("past_due"))).toBe("past_due");
    expect(membershipState(user(), sub("canceled", 5))).toBe("active"); // paid through period end
    expect(membershipState(user(), sub("canceled", -1))).toBe("canceled");
    expect(membershipState(user(), sub("incomplete"))).toBe("free");
    expect(membershipState(user("admin"), null)).toBe("admin");
  });

  it("grants paid access only for active, admin, or past-due within grace", () => {
    expect(hasPaidAccess("active", null)).toBe(true);
    expect(hasPaidAccess("free", null)).toBe(false);
    expect(hasPaidAccess("canceled", sub("canceled", -1))).toBe(false);
    expect(hasPaidAccess("past_due", sub("past_due", -3))).toBe(true);
    expect(hasPaidAccess("past_due", sub("past_due", -30))).toBe(false);
  });
});
