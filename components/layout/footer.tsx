import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { FOOTER_LINKS, SITE } from "@/config/site";

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-line bg-void">
      <div className="mx-auto grid max-w-[1400px] gap-12 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-5 text-[13px] leading-relaxed text-steel-400">{SITE.tagline} Market intelligence, the ATLAS engine, options activity and public disclosures — in one platform.</p>
        </div>
        {FOOTER_LINKS.map((g) => (
          <div key={g.title}>
            <div className="eyebrow mb-4">{g.title}</div>
            <ul className="space-y-2.5">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[13px] text-steel-300 transition-colors hover:text-chrome">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto max-w-[1400px] space-y-3 px-4 py-6 text-[11.5px] leading-relaxed text-steel-500 sm:px-6">
          <p>
            NSALGO provides market information, analytics and AI-generated analysis for informational and educational purposes only. Nothing on NSALGO constitutes
            individualized investment advice, an offer or solicitation to buy or sell any security, or a guarantee of performance. Market data may be delayed
            depending on provider and exchange licensing. AI-generated analysis may contain errors. Trading involves risk, including loss of principal; you are
            responsible for your own decisions. <Link href="/disclaimer" className="underline underline-offset-2 hover:text-steel-300">Full disclaimer</Link>.
          </p>
          <p>
            Public filing data sourced from SEC EDGAR and official disclosure repositories where configured. Charts by TradingView where indicated. © {new Date().getFullYear()} NSALGO.
          </p>
        </div>
      </div>
    </footer>
  );
}
