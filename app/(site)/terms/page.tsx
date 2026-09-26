import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Terms of Service", description: "The terms governing use of NSALGO and NSALGO membership.", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="September 1, 2026"
      intro="These Terms govern your access to and use of NSALGO, including the ATLAS product and the member platform."
      sections={[
        { h: "Acceptance", body: <p>By creating an account or using NSALGO you agree to these Terms, our <Link href="/privacy">Privacy Policy</Link> and the <Link href="/disclaimer">Disclaimer</Link>.</p> },
        { h: "Accounts", body: <p>You must provide accurate information, keep your credentials secure and notify us of unauthorised use. Accounts are personal; sharing access is not permitted.</p> },
        { h: "Membership & billing", body: <><p>Paid memberships renew automatically each billing period until cancelled. Payments are processed by Stripe. You can manage or cancel your membership from the Billing page; cancellation takes effect at the end of the current paid period.</p><p>Prices are displayed before purchase and may change with notice for future periods.</p></> },
        { h: "Acceptable use", body: <ul><li>No scraping, bulk downloading or automated access beyond normal use.</li><li>No redistribution or resale of data, analytics or content.</li><li>No attempts to circumvent security, rate limits or access controls.</li></ul> },
        { h: "Third-party data & licences", body: <p>Market data, news and other content are provided under licences from third parties and may be subject to additional restrictions. Exchange and provider terms may apply to your use of that data.</p> },
        { h: "Intellectual property", body: <p>NSALGO, ATLAS, the software, design and original content are owned by NSALGO or its licensors. You receive a limited, non-exclusive, non-transferable licence to use the service for personal, non-commercial purposes.</p> },
        { h: "Disclaimers & limitation of liability", body: <p>The service is provided &ldquo;as is&rdquo; without warranties of accuracy, availability or fitness for a particular purpose. To the maximum extent permitted by law, NSALGO is not liable for indirect or consequential losses, or for trading losses arising from use of the service.</p> },
        { h: "Termination", body: <p>We may suspend or terminate accounts that violate these Terms. You may close your account at any time.</p> },
        { h: "Changes", body: <p>We may update these Terms. Material changes will be notified in-app or by email before they take effect.</p> },
      ]}
    />
  );
}
