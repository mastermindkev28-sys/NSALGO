import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { AuthCard } from "@/features/auth/auth-card";
import { audit } from "@/services/audit";
import { consumeToken } from "@/services/auth";

export const metadata: Metadata = { title: "Verify email", robots: { index: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const userId = token ? await consumeToken("verify-email", token) : null;
  if (userId) {
    await db().users.update(userId, { emailVerifiedAt: new Date().toISOString() });
    await audit("auth.email_verified", { actorId: userId });
  }
  return (
    <AuthCard title={userId ? "Email verified" : "Verification link invalid"} subtitle={userId ? "Your email address is confirmed." : "This link has expired or was already used. You can request a new one from your account page."}>
      <Button asChild variant="primary" className="w-full">
        <Link href={userId ? "/dashboard" : "/dashboard/account"}>{userId ? "Continue to dashboard" : "Go to account"}</Link>
      </Button>
    </AuthCard>
  );
}
