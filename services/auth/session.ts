import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/db";
import type { User } from "@/types/domain";

/**
 * Opaque, server-side sessions. The cookie carries a random token; only its
 * keyed hash is stored, so a database leak cannot be replayed as a session.
 */
const SESSION_DAYS = 30;
const isProd = process.env.NODE_ENV === "production";
export const SESSION_COOKIE = isProd ? "__Host-nsalgo_session" : "nsalgo_session";

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (isProd && process.env.DATA_MODE === "production") throw new Error("SESSION_SECRET (32+ chars) is required in production.");
  return "dev-only-session-secret-change-me-0123456789";
}

export function hashToken(token: string): string {
  return createHmac("sha256", secret()).update(token).digest("base64url");
}

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createSession(userId: string, meta: { ip: string | null; userAgent: string | null }) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db().sessions.create({ userId, tokenHash: hashToken(token), expiresAt: expiresAt.toISOString(), ip: meta.ip, userAgent: meta.userAgent });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const s = await db().sessions.findByTokenHash(hashToken(token));
    if (s) await db().sessions.delete(s.id);
  }
  jar.delete(SESSION_COOKIE);
}

/** Resolves the current user from the session cookie. Memoised per request. */
export const getSessionUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 200) return null;
  try {
    const s = await db().sessions.findByTokenHash(hashToken(token));
    if (!s || Date.parse(s.expiresAt) < Date.now()) return null;
    const user = await db().users.findById(s.userId);
    if (!user || user.disabledAt) return null;
    // Sliding activity timestamp (cheap; at most once per hour).
    if (Date.now() - Date.parse(s.lastSeenAt) > 3600_000) void db().sessions.touch(s.id, s.expiresAt);
    return user;
  } catch {
    return null;
  }
});
