"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { AnalyticsEventName } from "@/config/analytics";

function anonId(): string {
  try {
    let id = localStorage.getItem("nsalgo_aid");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("nsalgo_aid", id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

/** Client event helper — posts to the first-party analytics endpoint and forwards to gtag/plausible if present. */
export function trackEvent(name: AnalyticsEventName, properties?: Record<string, unknown>) {
  try {
    const body = JSON.stringify({ name, properties, path: location.pathname, anonymousId: anonId() });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/analytics/track", new Blob([body], { type: "application/json" }));
    else void fetch("/api/analytics/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    const w = window as unknown as { gtag?: (...a: unknown[]) => void; plausible?: (n: string, o?: unknown) => void };
    w.gtag?.("event", name, properties);
    w.plausible?.(name, { props: properties });
  } catch {
    /* never throw from analytics */
  }
}

export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith("/dashboard/atlas")) trackEvent("atlas_opened", { path: pathname });
  }, [pathname]);
  return null;
}

export function TrackOnMount({ name, properties }: { name: AnalyticsEventName; properties?: Record<string, unknown> }) {
  const key = JSON.stringify(properties ?? {});
  useEffect(() => {
    trackEvent(name, JSON.parse(key) as Record<string, unknown>);
  }, [name, key]);
  return null;
}
