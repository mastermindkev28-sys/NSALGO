import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/features/auth/auth-card";
import { SignupForm } from "@/features/auth/forms";
import { getViewer } from "@/services/membership";

export const metadata: Metadata = { title: "Join NSALGO", description: "Create your NSALGO account.", alternates: { canonical: "/signup" } };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  const p = plan === "monthly" || plan === "annual" ? plan : undefined;
  const viewer = await getViewer();
  if (viewer.user) redirect(viewer.paid ? "/dashboard" : `/signup/plan${p ? `?plan=${p}` : ""}`);
  return (
    <div className="w-full max-w-[400px]">
      <ol className="mb-6 flex items-center justify-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.16em]">
        <li className="text-chrome">1 · Account</li>
        <li className="h-px w-6 bg-line-strong" aria-hidden />
        <li className="text-steel-500">2 · Membership</li>
        <li className="h-px w-6 bg-line-strong" aria-hidden />
        <li className="text-steel-500">3 · Checkout</li>
      </ol>
      <AuthCard title="Create your account" subtitle="Start with an account, then choose your membership." footer={<>Already a member? <Link href="/login" className="text-chrome hover:underline">Login</Link></>}>
        <SignupForm plan={p} />
      </AuthCard>
    </div>
  );
}
