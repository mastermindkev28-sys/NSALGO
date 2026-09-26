import "server-only";
import { db } from "@/db";
import type { TokenPurpose, User } from "@/types/domain";
import { hashPassword, verifyPassword } from "./password";
import { hashToken, newToken } from "./session";

/** Account lifecycle: registration, credential checks and one-time tokens. */

const TOKEN_TTL: Record<TokenPurpose, number> = { "verify-email": 24 * 3600_000, "reset-password": 3600_000 };

// Equalises timing for unknown emails so login responses don't reveal account existence.
let dummyHash: string | null = null;
async function dummy() {
  dummyHash ??= await hashPassword("timing-equaliser-not-a-real-password");
  return dummyHash;
}

export async function registerUser(email: string, password: string): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const existing = await db().users.findByEmail(email);
  if (existing) return { ok: false, error: "An account with this email already exists." };
  const user = await db().users.create({ email, passwordHash: await hashPassword(password) });
  await db().profiles.upsert({ userId: user.id, displayName: null, timezone: "America/New_York", experience: null, defaultMode: "swing", marketingOptIn: false });
  return { ok: true, user };
}

export async function authenticate(email: string, password: string): Promise<User | null> {
  const u = await db().users.findByEmail(email);
  if (!u) {
    await verifyPassword(password, await dummy());
    return null;
  }
  if (!(await verifyPassword(password, u.passwordHash))) return null;
  if (u.disabledAt) return null;
  const { passwordHash, ...user } = u;
  void passwordHash;
  return user;
}

export async function issueToken(userId: string, purpose: TokenPurpose): Promise<string> {
  await db().tokens.invalidateForUser(userId, purpose);
  const token = newToken();
  await db().tokens.create({ userId, purpose, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + TOKEN_TTL[purpose]).toISOString() });
  return token;
}

export async function consumeToken(purpose: TokenPurpose, token: string): Promise<string | null> {
  if (!token || token.length > 200) return null;
  const t = await db().tokens.findValid(purpose, hashToken(token));
  if (!t) return null;
  await db().tokens.markUsed(t.id);
  return t.userId;
}

export async function setPassword(userId: string, password: string) {
  await db().users.update(userId, { passwordHash: await hashPassword(password) });
  await db().sessions.deleteForUser(userId); // revoke all sessions after a password change
}
