import type { Metadata } from "next";
import Link from "next/link";
import { MobileTabs } from "@/components/member/mobile-tabs";
import { Sidebar } from "@/components/member/sidebar";
import { Topbar } from "@/components/member/topbar";
import { requireUser } from "@/services/membership";
import { getMarketStatus } from "@/services/market";
import { ResendVerification } from "@/features/account/resend-verification";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · NSALGO" }, robots: { index: false, follow: false } };

const STATE_LABEL = { visitor: "Visitor", free: "Free account", active: "Active member", past_due: "Payment past due", canceled: "Canceled", admin: "Administrator" } as const;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireUser("/dashboard");
  const status = await getMarketStatus();
  const mock = (process.env.DATA_MODE ?? "mock") === "mock";
  return (
    <div className="min-h-dvh bg-obsidian">
      <Sidebar staff={viewer.staff} />
      <div className="lg:pl-[232px]">
        <Topbar email={viewer.user.email} stateLabel={STATE_LABEL[viewer.state]} staff={viewer.staff} status={status.ok ? status.data : null} />
        {viewer.state === "past_due" ? (
          <div className="border-b border-warn/25 bg-warn-soft px-6 py-2.5 text-[12.5px] text-warn">
            Your last payment failed. Update your payment method to keep access. <Link href="/dashboard/billing" className="underline underline-offset-2">Billing</Link>
          </div>
        ) : null}
        {!viewer.user.emailVerifiedAt ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-graphite-900 px-6 py-2 text-[12.5px] text-steel-300">
            Verify your email address to secure your account. <ResendVerification />
          </div>
        ) : null}
        {mock ? (
          <div className="border-b border-dashed border-warn/20 px-6 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-warn/80">Development mode · all market data is simulated</div>
        ) : null}
        <main id="main" className="pb-24 lg:pb-10">
          {children}
        </main>
      </div>
      <MobileTabs />
    </div>
  );
}
