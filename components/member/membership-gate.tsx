import { Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { planFeatures } from "@/config/site";

/** Server-rendered paywall: no premium data is fetched or sent for non-members. */
export function MembershipGate({ feature, description }: { feature: string; description?: string }) {
  return (
    <div className="panel relative mx-auto mt-6 max-w-2xl overflow-hidden p-8 text-center sm:p-10">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-polar-500/10 blur-3xl" aria-hidden />
      <div className="relative">
        <div className="mx-auto flex size-10 items-center justify-center rounded-md border border-line-strong bg-graphite-800">
          <Lock className="size-4 text-steel-300" />
        </div>
        <h2 className="mt-5 text-[20px] font-medium text-chrome">{feature} is part of NSALGO membership</h2>
        <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-steel-400">{description ?? "Upgrade to unlock ATLAS, options intelligence, whale activity and public disclosures."}</p>
        <ul className="mx-auto mt-6 grid max-w-md gap-1.5 text-left text-[12.5px] text-steel-300 sm:grid-cols-2">
          {planFeatures.slice(0, 8).map((f) => (
            <li key={f} className="flex gap-2">
              <span className="text-polar-400">·</span> {f}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild variant="primary">
            <Link href="/signup/plan">Upgrade membership</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/pricing">Compare</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
