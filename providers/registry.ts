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
import { PolygonMarketDataProvider, PolygonNewsProvider, PolygonOptionsProvider } from "./polygon";
import { Sec13fProvider, SecInsiderProvider } from "./sec";
import type { ProviderRegistry } from "./types";
import { unavailableProvider } from "./unavailable";

let registry: ProviderRegistry | undefined;

function buildProduction(): ProviderRegistry {
  const e = env();
  const market =
    e.MARKET_DATA_PROVIDER === "polygon" && e.MARKET_DATA_API_KEY
      ? new PolygonMarketDataProvider(e.MARKET_DATA_API_KEY, e.MARKET_DATA_DELAY_MINUTES)
      : unavailableProvider("Market data", "MARKET_DATA_API_KEY");
  const optionsKey = e.OPTIONS_API_KEY ?? e.MARKET_DATA_API_KEY;
  const options =
    e.OPTIONS_DATA_PROVIDER === "polygon" && optionsKey
      ? new PolygonOptionsProvider(optionsKey, e.MARKET_DATA_DELAY_MINUTES)
      : unavailableProvider("Options data", "OPTIONS_API_KEY");
  const newsKey = e.NEWS_API_KEY ?? (e.NEWS_PROVIDER === "polygon" ? e.MARKET_DATA_API_KEY : undefined);
  const news = e.NEWS_PROVIDER === "polygon" && newsKey ? new PolygonNewsProvider(newsKey) : unavailableProvider("News", "NEWS_API_KEY");
  const insiders = e.sec ? new SecInsiderProvider(e.sec) : unavailableProvider("SEC insider", "SEC_API_CONFIG");
  const institutional = e.sec ? new Sec13fProvider(e.sec) : unavailableProvider("Institutional", "SEC_API_CONFIG");
  const congress =
    e.CONGRESS_API_BASE_URL && e.CONGRESS_API_KEY
      ? new VendorCongressProvider(e.CONGRESS_API_BASE_URL, e.CONGRESS_API_KEY)
      : unavailableProvider("Congressional disclosures", "CONGRESS_API_BASE_URL and CONGRESS_API_KEY");
  const calendar =
    e.ECONOMIC_CALENDAR_PROVIDER === "tradingeconomics" && e.ECONOMIC_CALENDAR_API_KEY
      ? new TradingEconomicsCalendarProvider(e.ECONOMIC_CALENDAR_API_KEY)
      : unavailableProvider("Economic calendar", "ECONOMIC_CALENDAR_API_KEY");
  return { market, options, news, insiders, institutional, congress, calendar };
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
