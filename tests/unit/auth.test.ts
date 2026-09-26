import { describe, expect, it } from "vitest";
import { authenticate, consumeToken, issueToken, registerUser, setPassword } from "@/services/auth";
import { hashPassword, passwordProblems, verifyPassword } from "@/services/auth/password";
import { rateLimit } from "@/lib/security/rate-limit";

describe("auth", () => {
  it("hashes and verifies passwords with scrypt", async () => {
    const h = await hashPassword("correct horse battery 9");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery 9", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
  });

  it("enforces the password policy", () => {
    expect(passwordProblems("short")).not.toHaveLength(0);
    expect(passwordProblems("password12345")).not.toHaveLength(0);
    expect(passwordProblems("Tr4ding-Discipline")).toHaveLength(0);
  });

  it("registers, authenticates and rejects duplicates", async () => {
    const email = `t${Date.now()}@example.com`;
    const r = await registerUser(email, "Tr4ding-Discipline");
    expect(r.ok).toBe(true);
    expect((await registerUser(email, "Tr4ding-Discipline")).ok).toBe(false);
    expect(await authenticate(email.toUpperCase(), "Tr4ding-Discipline")).not.toBeNull();
    expect(await authenticate(email, "nope-nope-nope")).toBeNull();
    expect(await authenticate("missing@example.com", "Tr4ding-Discipline")).toBeNull();
  });

  it("one-time tokens are single-use and purpose-bound", async () => {
    const email = `r${Date.now()}@example.com`;
    const r = await registerUser(email, "Tr4ding-Discipline");
    if (!r.ok) throw new Error("setup");
    const token = await issueToken(r.user.id, "reset-password");
    expect(await consumeToken("verify-email", token)).toBeNull();
    expect(await consumeToken("reset-password", token)).toBe(r.user.id);
    expect(await consumeToken("reset-password", token)).toBeNull();
    await setPassword(r.user.id, "New-Passphrase-42");
    expect(await authenticate(email, "New-Passphrase-42")).not.toBeNull();
  });

  it("rate limits repeated attempts", async () => {
    let last = { ok: true };
    for (let i = 0; i < 9; i++) last = await rateLimit("login", "1.2.3.4:x@y.z");
    expect(last.ok).toBe(false);
  });
});
