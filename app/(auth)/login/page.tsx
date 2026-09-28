import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/db/seed";
import { databaseUrl } from "@/db/url";
import { AuthCard } from "@/features/auth/auth-card";
import { LoginForm } from "@/features/auth/forms";
import { getViewer } from "@/services/membership";

export const metadata: Metadata = { title: "Login", robots: { index: false }, alternates: { canonical: "/login" } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const next = sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : undefined;
  if (viewer.user) redirect(next ?? "/dashboard");
  const showDemo = (process.env.DATA_MODE ?? "mock") === "mock" && !databaseUrl();
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to NSALGO."
      footer={
        <>
          New to NSALGO? <Link href="/signup" className="text-chrome hover:underline">Create account</Link>
        </>
      }
    >
      <LoginForm next={next} notice={sp.reset ? "Password updated. Sign in with your new password." : sp.verified ? "Email verified." : undefined} />
      {showDemo ? (
        <div className="mt-6 rounded-md border border-dashed border-warn/30 bg-warn-soft/40 p-3 text-[12px] text-steel-300">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-warn">Development · mock mode</div>
          {DEMO_ACCOUNTS.map((a) => (
            <div key={a.email} className="num">
              {a.email} <span className="text-steel-500">({a.role === "admin" ? "admin" : a.plan ? "member" : "free"})</span>
            </div>
          ))}
          <div className="num mt-1 text-steel-400">Password: {DEMO_PASSWORD}</div>
        </div>
      ) : null}
    </AuthCard>
  );
}
