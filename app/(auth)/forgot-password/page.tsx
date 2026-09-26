import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/features/auth/auth-card";
import { ForgotForm } from "@/features/auth/forms";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Reset your password" subtitle="We'll email you a secure link that expires in one hour." footer={<Link href="/login" className="text-chrome hover:underline">Back to login</Link>}>
      <ForgotForm />
    </AuthCard>
  );
}
