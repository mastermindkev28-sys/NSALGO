import "server-only";
/**
 * Serves a slot from a primary provider and switches to a secondary one while
 * the primary reports PROVIDER_NOT_CONFIGURED (missing or rejected key).
 * After a rejection the primary is skipped for a cool-down, so every request
 * doesn't pay for a round trip that is known to fail.
 */
import type { DataResult } from "@/types/data";
import type { ProviderHealth } from "./types";

interface Slot {
  readonly id: string;
  readonly label: string;
  readonly isMock: boolean;
  healthCheck(): Promise<ProviderHealth>;
}

const COOL_DOWN_MS = 10 * 60_000;

export function withFallback<P extends Slot>(primary: P, secondary: P): P {
  let skipUntil = 0;
  return new Proxy(primary, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function" || prop === "healthCheck") return value;
      return async (...args: unknown[]) => {
        if (Date.now() >= skipUntil) {
          const res = (await value.apply(target, args)) as DataResult<unknown>;
          if (res.ok || res.error.code !== "PROVIDER_NOT_CONFIGURED") return res;
          skipUntil = Date.now() + COOL_DOWN_MS;
        }
        const fn = Reflect.get(secondary, prop) as (...a: unknown[]) => unknown;
        return fn.apply(secondary, args);
      };
    },
  });
}
