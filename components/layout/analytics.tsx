import Script from "next/script";
import { PageViewTracker } from "./page-view-tracker";

/**
 * Optional third-party analytics (privacy-conscious Plausible or GA4), chosen
 * by NEXT_PUBLIC_ANALYTICS_PROVIDER. First-party product events are always
 * recorded server-side via /api/analytics/track.
 */
export function AnalyticsScripts({ nonce }: { nonce?: string }) {
  const provider = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER ?? "none";
  const id = process.env.NEXT_PUBLIC_ANALYTICS_ID;
  return (
    <>
      <PageViewTracker />
      {provider === "plausible" && id ? <Script nonce={nonce} defer data-domain={id} src="https://plausible.io/js/script.js" strategy="afterInteractive" /> : null}
      {provider === "ga4" && id ? (
        <>
          <Script nonce={nonce} src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`} strategy="afterInteractive" />
          <Script nonce={nonce} id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config',${JSON.stringify(id)},{anonymize_ip:true});`}</Script>
        </>
      ) : null}
    </>
  );
}
