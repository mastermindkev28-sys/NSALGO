import "server-only";
import type { AnalyticsEventName } from "@/config/analytics";
import { db } from "@/db";

/**
 * First-party product analytics (conversion, Atlas engagement, content).
 * Stored in analytics_events; no third-party tracker is required. Client-side
 * providers (Plausible / GA4) are optional and configured via NEXT_PUBLIC_*.
 */
export async function track(
  name: AnalyticsEventName,
  opts: { userId?: string | null; anonymousId?: string | null; path?: string | null; properties?: Record<string, unknown> } = {},
) {
  try {
    await db().ops.track({ name, userId: opts.userId ?? null, anonymousId: opts.anonymousId ?? null, path: opts.path ?? null, properties: opts.properties ?? null });
  } catch {
    /* analytics must never break a request */
  }
}
