import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/features/auth/auth-card";
import { ResetForm } from "@/features/auth/forms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false }, referrer: "no-referrer" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <AuthCard title="Link missing" subtitle="Open the reset link from your email, or request a new one." footer={<Link href="/forgot-password" className="text-chrome hover:underline">Request a new link</Link>}>
        <p className="text-[13px] text-steel-400">Reset links expire after one hour and can be used once.</p>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Choose a new password" subtitle="All other sessions will be signed out.">
      <ResetForm token={token} />
    </AuthCard>
  );
}
