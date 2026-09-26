import { Footer } from "@/components/layout/footer";
import { TopNav } from "@/components/layout/top-nav";
import { TickerTape } from "@/components/market/ticker-tape";
import { getSiteContent } from "@/services/content";
import { getQuotes } from "@/services/market";
import { getViewer } from "@/services/membership";

const TAPE = ["SPY", "QQQ", "IWM", "DIA", "VIX", "NVDA", "AAPL", "MSFT", "TSLA", "AMD", "META", "AMZN", "GOOGL", "US10Y", "GC", "CL", "BTCUSD"];

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [viewer, tape, content] = await Promise.all([getViewer(), getQuotes(TAPE), getSiteContent()]);
  return (
    <div className="flex min-h-dvh flex-col">
      {content.announcement ? (
        <div className="border-b border-line bg-graphite-900 px-4 py-2 text-center text-[12px] text-steel-300">{content.announcement}</div>
      ) : null}
      <TopNav signedIn={!!viewer.user} paid={viewer.paid} />
      <TickerTape initial={tape} symbols={TAPE} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
