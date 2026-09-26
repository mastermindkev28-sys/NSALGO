import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { log } from "@/lib/logger";
import { rateLimit, type LimitName } from "@/lib/security/rate-limit";
import { ipFromHeaders, isSameOrigin } from "@/lib/security/request";
import { apiViewer, type Viewer } from "@/services/membership";
import type { Permission } from "@/lib/auth/permissions";
import type { User } from "@/types/domain";

/**
 * Route-handler wrapper: rate limiting, input validation, auth/entitlement
 * checks, same-origin enforcement for mutations and uniform error shapes.
 */
export function json<T>(body: T, init?: number | ResponseInit) {
  return NextResponse.json(body, typeof init === "number" ? { status: init } : init);
}

export function apiError(status: number, code: string, message: string, headers?: Record<string, string>) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status, headers });
}

interface Opts<Q extends z.ZodType | undefined, B extends z.ZodType | undefined> {
  limit?: LimitName;
  query?: Q;
  body?: B;
  auth?: "none" | "user" | "member";
  permission?: Permission;
}

type Ctx<Q, B> = {
  req: Request;
  query: Q extends z.ZodType ? z.infer<Q> : undefined;
  body: B extends z.ZodType ? z.infer<B> : undefined;
  viewer: (Viewer & { user: User }) | null;
  ip: string;
};

export function route<Q extends z.ZodType | undefined = undefined, B extends z.ZodType | undefined = undefined, P = Record<string, string>>(
  opts: Opts<Q, B>,
  handler: (ctx: Ctx<Q, B>, params: P) => Promise<Response>,
) {
  return async (req: Request, context: { params: Promise<P> }): Promise<Response> => {
    const ip = ipFromHeaders(req.headers);
    try {
      if (req.method !== "GET" && req.method !== "HEAD" && !isSameOrigin(req)) {
        return apiError(403, "FORBIDDEN", "Cross-origin request rejected.");
      }
      const rl = await rateLimit(opts.limit ?? "api", ip);
      if (!rl.ok) return apiError(429, "RATE_LIMITED", "Too many requests.", { "Retry-After": String(rl.retryAfterSec) });

      let viewer: Ctx<Q, B>["viewer"] = null;
      if (opts.auth && opts.auth !== "none") {
        const v = await apiViewer({ paid: opts.auth === "member", permission: opts.permission });
        if (!v.ok) return apiError(v.status, v.status === 401 ? "UNAUTHORIZED" : v.status === 402 ? "PAYMENT_REQUIRED" : "FORBIDDEN", v.message);
        viewer = v.viewer;
      }

      let query: unknown = undefined;
      if (opts.query) {
        const params = Object.fromEntries(new URL(req.url).searchParams.entries());
        const parsed = opts.query.safeParse(params);
        if (!parsed.success) return apiError(400, "INVALID_REQUEST", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
        query = parsed.data;
      }
      let body: unknown = undefined;
      if (opts.body) {
        let raw: unknown;
        try {
          raw = await req.json();
        } catch {
          return apiError(400, "INVALID_REQUEST", "Body must be valid JSON.");
        }
        const parsed = opts.body.safeParse(raw);
        if (!parsed.success) return apiError(400, "INVALID_REQUEST", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
        body = parsed.data;
      }
      return await handler({ req, query, body, viewer, ip } as Ctx<Q, B>, await context.params);
    } catch (err) {
      log.error("api", "Unhandled route error", { path: new URL(req.url).pathname, error: (err as Error).message });
      return apiError(500, "INTERNAL", "Unexpected error.");
    }
  };
}

/** DataResult → HTTP response (provider failures are 200 with ok:false so clients can degrade gracefully). */
export function dataResponse(r: { ok: boolean }, cacheSeconds = 0) {
  return NextResponse.json(r, { headers: cacheSeconds ? { "Cache-Control": `private, max-age=${cacheSeconds}` } : { "Cache-Control": "no-store" } });
}
