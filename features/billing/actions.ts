"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { log } from "@/lib/logger";
import { billing, startCheckout } from "@/services/billing";
import { getViewer } from "@/services/membership";

export async function checkoutAction(form: FormData) {
  const plan = z.enum(["monthly", "annual"]).safeParse(form.get("plan"));
  const v = await getViewer();
  if (!v.user) redirect(`/signup${plan.success ? `?plan=${plan.data}` : ""}`);
  if (!plan.success) redirect("/signup/plan?error=plan");
  if (v.paid && v.state !== "admin") redirect("/dashboard/billing");
  let url: string;
  try {
    url = (await startCheckout(v.user, plan.data)).url;
  } catch (e) {
    log.error("billing", "Checkout failed", { error: (e as Error).message });
    redirect("/signup/plan?error=checkout");
  }
  redirect(url);
}

export async function portalAction() {
  const v = await getViewer();
  if (!v.user) redirect("/login?next=/dashboard/billing");
  let url: string | null = null;
  try {
    url = (await billing().createPortal(v.user))?.url ?? null;
  } catch (e) {
    log.error("billing", "Portal session failed", { error: (e as Error).message });
  }
  redirect(url ?? "/dashboard/billing?error=portal");
}

export async function cancelMockAction() {
  const v = await getViewer();
  if (!v.user) redirect("/login");
  const b = billing();
  if (b.id === "mock" && b.cancel) await b.cancel(v.user);
  redirect("/dashboard/billing?canceled=1");
}
