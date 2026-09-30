import "server-only";
/**
 * Provider registry — the single place vendors are wired to interfaces.
 *
 *  DATA_MODE=mock        → isolated simulators (labelled as simulated everywhere)
 *  DATA_MODE=production  → licensed adapters; a missing credential yields an
 *                          explicit "not configured" provider, never mock data.
 *
 * Adding a vendor: implement the interface in providers/<vendor>/ and add a
 * case below. Nothing else in the application changes.
 *
 * Yahoo Finance: intentionally not wired. Its public endpoints are
 * undocumented and not licensed for commercial redistribution. If a licensed
 * Yahoo data agreement exists, add a `yahoo` case implementing
 * MarketDataProvider here.
 */
import { env } from "@/config/env";
import { VendorCongressProvider } from "./congress";
import { TradingEconomicsCalendarProvider } from "./calendar";
import { MockCalendarProvider, MockCongressProvider, MockInsiderProvider, MockInstitutionalProvider } from "./mock/disclosures";
import { MockMarketDataProvider } from "./mock/market";
import { MockNewsProvider } from "./mock/news";
import { MockOptionsDataProvider } from "./mock/options";
import { withFallback } from "./fallback";
import { PolygonMarketDataProvider, PolygonNewsProvider, PolygonOptionsProvider } from "./polygon";
import { Sec13fProvider, SecInsiderProvider } from "./sec";
import {
  UnusualWhalesCalendarProvider,
  UnusualWhalesClient,
  UnusualWhalesCongressProvider,
  UnusualWhalesInsiderProvider,
  UnusualWhalesOptionsProvider,
} from "./unusualwhales";
import { UnusualWhalesMarketDataProvider, UnusualWhalesNewsProvider } from "./unusualwhales/market";
import type { MarketDataProvider, NewsProvider, ProviderRegistry } from "./types";
import { unavailableProvider } from "./unavailable";

let registry: ProviderRegistry | undefined;

function buildProduction(): ProviderRegistry {
  const e = env();
  const uw = e.UNUSUAL_WHALES_API_KEY ? new UnusualWhalesClient(e.UNUSUAL_WHALES_API_KEY) : undefined;
  // Unusual Whales backs up quotes and news: it serves them outright when Polygon has no
  // key, and takes over while Polygon rejects its key.
  const polygonMarket =
    e.MARKET_DATA_PROVIDER === "polygon" && e.MARKET_DATA_API_KEY
      ? new PolygonMarketDataProvider(e.MARKET_DATA_API_KEY, e.MARKET_DATA_DELAY_MINUTES)
      : undefined;
  const uwMarket = uw ? new UnusualWhalesMarketDataProvider(uw) : undefined;
  const market =
    polygonMarket && uwMarket
      ? withFallback<MarketDataProvider>(polygonMarket, uwMarket)
      : (polygonMarket ?? uwMarket ?? unavailableProvider("Market data", "MARKET_DATA_API_KEY"));
  // An explicit *_PROVIDER wins; otherwise Unusual Whales takes the slot when its key is set.
  const pick = (explicit: string | undefined, fallback: string) => explicit ?? (uw ? "unusualwhales" : fallback);

  const optionsKey = e.OPTIONS_API_KEY ?? e.MARKET_DATA_API_KEY;
  const optionsVendor = pick(e.OPTIONS_DATA_PROVIDER, "polygon");
  const options =
    optionsVendor === "unusualwhales" && uw
      ? new UnusualWhalesOptionsProvider(uw)
      : optionsVendor === "polygon" && optionsKey
        ? new PolygonOptionsProvider(optionsKey, e.MARKET_DATA_DELAY_MINUTES, flowSymbols(e.OPTIONS_FLOW_SYMBOLS))
        : unavailableProvider("Options data", optionsVendor === "unusualwhales" ? "UNUSUAL_WHALES_API_KEY" : "OPTIONS_API_KEY");
  const newsKey = e.NEWS_API_KEY ?? (e.NEWS_PROVIDER === "polygon" ? e.MARKET_DATA_API_KEY : undefined);
  const polygonNews = e.NEWS_PROVIDER === "polygon" && newsKey ? new PolygonNewsProvider(newsKey) : undefined;
  const uwNews = uw ? new UnusualWhalesNewsProvider(uw) : undefined;
  const news =
    polygonNews && uwNews ? withFallback<NewsProvider>(polygonNews, uwNews) : (polygonNews ?? uwNews ?? unavailableProvider("News", "NEWS_API_KEY"));
  const insiderVendor = pick(e.INSIDER_PROVIDER, "sec");
  const insiders =
    insiderVendor === "unusualwhales" && uw
      ? new UnusualWhalesInsiderProvider(uw)
      : insiderVendor === "sec" && e.sec
        ? new SecInsiderProvider(e.sec)
        : unavailableProvider("SEC insider", insiderVendor === "unusualwhales" ? "UNUSUAL_WHALES_API_KEY" : "SEC_API_CONFIG");
  const institutional = e.sec ? new Sec13fProvider(e.sec) : unavailableProvider("Institutional", "SEC_API_CONFIG");
  const congressVendor = pick(e.CONGRESS_PROVIDER, "vendor");
  const congress =
    congressVendor === "unusualwhales" && uw
      ? new UnusualWhalesCongressProvider(uw)
      : congressVendor === "vendor" && e.CONGRESS_API_BASE_URL && e.CONGRESS_API_KEY
        ? new VendorCongressProvider(e.CONGRESS_API_BASE_URL, e.CONGRESS_API_KEY)
        : unavailableProvider(
            "Congressional disclosures",
            congressVendor === "unusualwhales" ? "UNUSUAL_WHALES_API_KEY" : "CONGRESS_API_BASE_URL and CONGRESS_API_KEY",
          );
  const calendarVendor = pick(e.ECONOMIC_CALENDAR_PROVIDER, "tradingeconomics");
  const calendar =
    calendarVendor === "unusualwhales" && uw
      ? new UnusualWhalesCalendarProvider(uw)
      : calendarVendor === "tradingeconomics" && e.ECONOMIC_CALENDAR_API_KEY
        ? new TradingEconomicsCalendarProvider(e.ECONOMIC_CALENDAR_API_KEY)
        : unavailableProvider("Economic calendar", calendarVendor === "unusualwhales" ? "UNUSUAL_WHALES_API_KEY" : "ECONOMIC_CALENDAR_API_KEY");
  return { market, options, news, insiders, institutional, congress, calendar };
}

function flowSymbols(raw: string | undefined): string[] | undefined {
  const list = raw
    ?.split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z.]{1,8}$/.test(s));
  return list?.length ? list : undefined;
}

function buildMock(): ProviderRegistry {
  return {
    market: new MockMarketDataProvider(),
    options: new MockOptionsDataProvider(),
    news: new MockNewsProvider(),
    insiders: new MockInsiderProvider(),
    institutional: new MockInstitutionalProvider(),
    congress: new MockCongressProvider(),
    calendar: new MockCalendarProvider(),
  };
}

export function providers(): ProviderRegistry {
  if (!registry) registry = env().DATA_MODE === "mock" ? buildMock() : buildProduction();
  return registry;
}

/** Test hook to swap providers (e.g. to simulate outages). */
export function __setProvidersForTests(r: ProviderRegistry | undefined) {
  registry = r;
}
