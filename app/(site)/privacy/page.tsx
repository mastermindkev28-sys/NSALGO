import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Privacy Policy", description: "How NSALGO collects, uses and protects personal information.", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="September 1, 2026"
      intro="We collect the minimum information needed to operate NSALGO and never sell personal data."
      sections={[
        { h: "Information we collect", body: <ul><li><strong>Account data</strong> — email address, hashed password, profile preferences.</li><li><strong>Billing data</strong> — subscription status and invoices. Card details are handled by Stripe and never stored by NSALGO.</li><li><strong>Usage data</strong> — pages and features used (for example Atlas views and searches), used to improve the product.</li><li><strong>Member content</strong> — watchlists, alerts and notification preferences.</li></ul> },
        { h: "How we use it", body: <p>To provide and secure the service, process payments, send transactional email (verification, password reset, billing), measure product usage, and respond to support requests.</p> },
        { h: "Cookies", body: <p>NSALGO uses a strictly necessary, HTTP-only session cookie to keep you signed in. Optional analytics are privacy-conscious and configured without advertising identifiers.</p> },
        { h: "Sharing", body: <p>We share data only with processors that operate the service (hosting, database, email, payments, analytics) under contract, or when required by law.</p> },
        { h: "Security", body: <p>Passwords are hashed with a memory-hard algorithm, sessions are server-side and revocable, data access is authorised server-side and protected by database row-level security, and administrative actions are audit-logged.</p> },
        { h: "Retention", body: <p>Account data is retained while your account is active and deleted or anonymised after closure, except where retention is required for legal, tax or security purposes.</p> },
        { h: "Your rights", body: <p>Depending on your location you may access, correct, export or delete your data, or object to certain processing. Contact us to exercise these rights.</p> },
        { h: "Contact", body: <p>Questions about privacy: privacy@nsalgo.com.</p> },
      ]}
    />
  );
}
