import "server-only";
/**
 * Stand-in used in production mode when a provider has no credentials. Every
 * call returns PROVIDER_NOT_CONFIGURED so the UI degrades to an explicit
 * "unavailable" state — it never silently falls back to simulated data.
 */
import { fail } from "@/types/data";
import { unhealthy } from "./meta";
import type {
  CongressionalDisclosureProvider,
  EconomicCalendarProvider,
  InsiderDataProvider,
  InstitutionalDataProvider,
  MarketDataProvider,
  NewsProvider,
  OptionsDataProvider,
} from "./types";

type AnyProvider = MarketDataProvider &
  OptionsDataProvider &
  NewsProvider &
  InsiderDataProvider &
  InstitutionalDataProvider &
  CongressionalDisclosureProvider &
  EconomicCalendarProvider;

export function unavailableProvider(slot: string, envHint: string): AnyProvider {
  const message = `${slot} provider is not configured. Set ${envHint}.`;
  const reject = async () => fail("PROVIDER_NOT_CONFIGURED", message);
  const base = {
    id: `unconfigured-${slot}`,
    label: "Not configured",
    isMock: false,
    healthCheck: async () => unhealthy(message),
  };
  return new Proxy(base, {
    get(target, prop) {
      if (prop in target) return target[prop as keyof typeof target];
      return reject;
    },
  }) as unknown as AnyProvider;
}
