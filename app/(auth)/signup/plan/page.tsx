import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { planFeatures } from "@/config/site";
import { PlanPicker } from "@/features/pricing/plan-picker";
import { billingConfigured, getPlans } from "@/services/billing";
import { requireUser } from "@/services/membership";

export const metadata: Metadata = { title: "Choose membership", robots: { index: false } };

export default async function PlanPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const viewer = await requireUser("/signup/plan");
  if (viewer.paid && viewer.state !== "admin") redirect("/dashboard");
  const plans = await getPlans();
  const billingState = billingConfigured();
  return (
    <div className="w-full max-w-4xl">
      <ol className="mb-8 flex items-center justify-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.16em]">
        <li className="text-steel-500">1 · Account ✓</li>
        <li className="h-px w-6 bg-line-strong" aria-hidden />
        <li className="text-chrome">2 · Membership</li>
        <li className="h-px w-6 bg-line-strong" aria-hidden />
        <li className="text-steel-500">3 · Checkout</li>
      </ol>
      {sp.error ? (
        <div className="mx-auto mb-6 max-w-3xl rounded-md border border-down/30 bg-down-soft px-4 py-3 text-[13px] text-down">
          {sp.error === "checkout" ? "Checkout could not be started. Please try again or contact support." : "Choose a plan to continue."}
        </div>
      ) : null}
      {sp.checkout === "canceled" ? <div className="mx-auto mb-6 max-w-3xl rounded-md border border-line bg-graphite-900 px-4 py-3 text-[13px] text-steel-300">Checkout canceled — you have not been charged.</div> : null}
      <PlanPicker plans={plans} signedIn paid={false} features={planFeatures} defaultInterval={sp.plan === "monthly" ? "monthly" : "annual"} />
      {billingState.provider === "mock" ? (
        <p className="mx-auto mt-6 max-w-3xl text-center text-[11.5px] text-warn">Development: Stripe is not configured, so checkout uses the mock billing provider and activates membership server-side without payment.</p>
      ) : null}
      <p className="mt-6 text-center text-[13px] text-steel-400">
        Not ready? <Link href="/dashboard" className="text-chrome hover:underline">Continue with a free account</Link>
      </p>
    </div>
  );
}
