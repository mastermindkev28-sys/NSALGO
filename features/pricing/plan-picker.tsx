"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { trackEvent } from "@/components/layout/page-view-tracker";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/controls";
import { checkoutAction } from "@/features/billing/actions";
import { cn } from "@/lib/utils";
import type { Plan } from "@/types/domain";

function price(p: Plan | undefined) {
  if (!p || p.amount === null) return null;
  return (p.amount / 100).toLocaleString("en-US", { style: "currency", currency: p.currency, maximumFractionDigits: p.amount % 100 ? 2 : 0 });
}

/** Monthly/annual selector. Prices come from the plans table (admin-configured) — never hard-coded. */
export function PlanPicker({ plans, signedIn, paid, features, defaultInterval = "annual" }: { plans: Plan[]; signedIn: boolean; paid: boolean; features: string[]; defaultInterval?: "monthly" | "annual" }) {
  const [interval, setInterval] = useState<"monthly" | "annual">(defaultInterval);
  const plan = plans.find((p) => p.code === interval);
  const monthly = plans.find((p) => p.code === "monthly");
  const annual = plans.find((p) => p.code === "annual");
  const savings = monthly?.amount && annual?.amount ? Math.round((1 - annual.amount / (monthly.amount * 12)) * 100) : null;
  const shown = price(plan);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex justify-center">
        <Segmented
          value={interval}
          onChange={setInterval}
          options={[
            { value: "monthly", label: "Monthly" },
            { value: "annual", label: savings && savings > 0 ? `Annual · save ${savings}%` : "Annual" },
          ]}
        />
      </div>
      <div className="panel relative overflow-hidden shadow-[var(--shadow-float)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-polar-400/60 to-transparent" aria-hidden />
        <div className="grid gap-0 md:grid-cols-[1fr_1.1fr]">
          <div className="border-b border-line p-8 md:border-b-0 md:border-r">
            <div className="font-mono text-[11px] tracking-[0.4em] text-steel-300">NSALGO MEMBERSHIP</div>
            <div className="mt-6 flex items-baseline gap-2">
              {shown ? (
                <>
                  <span className="num text-[44px] font-medium tracking-[-0.03em] text-chrome">{shown}</span>
                  <span className="text-[14px] text-steel-400">/ {interval === "annual" ? "year" : "month"}</span>
                </>
              ) : (
                <span className="text-[20px] font-medium text-steel-200">Pricing configured at launch</span>
              )}
            </div>
            <p className="mt-2 text-[12.5px] text-steel-500">{shown ? (interval === "annual" ? "Billed annually. Cancel anytime; access continues to the end of the term." : "Billed monthly. Cancel anytime.") : "Plan pricing is set by NSALGO administrators (MONTHLY_PRICE / ANNUAL_PRICE)."}</p>
            <div className="mt-8">
              {paid ? (
                <Button asChild variant="secondary" size="lg" className="w-full">
                  <Link href="/dashboard/billing">Manage membership</Link>
                </Button>
              ) : signedIn ? (
                <form action={checkoutAction} onSubmit={() => trackEvent("checkout_started", { plan: interval })}>
                  <input type="hidden" name="plan" value={interval} />
                  <Button variant="primary" size="lg" className="w-full" disabled={!plan?.active}>
                    Join NSALGO
                  </Button>
                </form>
              ) : (
                <Button asChild variant="primary" size="lg" className="w-full">
                  <Link href={`/signup?plan=${interval}`} onClick={() => trackEvent("signup_started", { plan: interval, from: "pricing" })}>
                    Join NSALGO
                  </Link>
                </Button>
              )}
              <p className="mt-3 text-center text-[11.5px] text-steel-500">Secure checkout by Stripe.</p>
            </div>
          </div>
          <ul className="grid gap-3 p-8 sm:grid-cols-1">
            {features.map((f) => (
              <li key={f} className={cn("flex items-start gap-3 text-[13.5px] text-steel-200")}>
                <Check className="mt-0.5 size-4 shrink-0 text-polar-400" /> {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
