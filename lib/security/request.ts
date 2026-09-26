import "server-only";
import { headers } from "next/headers";

/** Best-effort client IP (trusted only behind a proxy that sets these headers). */
export function ipFromHeaders(h: Headers): string {
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "0.0.0.0";
}

export async function requestMeta() {
  const h = await headers();
  return { ip: ipFromHeaders(h), userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}

/**
 * CSRF defence for cookie-authenticated route handlers: state-changing
 * requests must originate from our own origin. (Server Actions get the same
 * check from Next.js automatically; cookies are SameSite=Lax as well.)
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin) {
    // Non-browser clients omit Origin; only allow when Sec-Fetch-Site confirms same-origin or absent entirely.
    const site = req.headers.get("sec-fetch-site");
    return !site || site === "same-origin" || site === "none";
  }
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
