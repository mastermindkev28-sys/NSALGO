import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { headers } from "next/headers";
import { Toaster } from "sonner";
import { AnalyticsScripts } from "@/components/layout/analytics";
import { SearchCommand } from "@/components/layout/search-command";
import { TooltipProvider } from "@/components/ui/controls";
import { SITE } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: "NSALGO — Financial intelligence, organized.", template: "%s · NSALGO" },
  description: SITE.description,
  applicationName: "NSALGO",
  keywords: ["market intelligence", "ATLAS", "options flow", "stock analysis", "swing trading", "insider transactions", "congressional disclosures", "financial news"],
  openGraph: { type: "website", siteName: "NSALGO", title: "NSALGO — See the market with direction.", description: SITE.description, url: SITE.url },
  twitter: { card: "summary_large_image", site: SITE.twitter, title: "NSALGO — See the market with direction.", description: SITE.description },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#07080a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-chrome focus:px-3 focus:py-2 focus:text-obsidian">
          Skip to content
        </a>
        <TooltipProvider>
          {children}
          <SearchCommand />
        </TooltipProvider>
        <Toaster theme="dark" position="bottom-right" toastOptions={{ className: "!bg-graphite-850 !border-line-strong !text-steel-100" }} />
        <AnalyticsScripts nonce={nonce} />
      </body>
    </html>
  );
}
