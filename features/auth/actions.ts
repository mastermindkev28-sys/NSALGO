"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { SITE } from "@/config/site";
import { db } from "@/db";
import { rateLimit } from "@/lib/security/rate-limit";
import { requestMeta } from "@/lib/security/request";
import { audit } from "@/services/audit";
import { authenticate, consumeToken, issueToken, registerUser, setPassword } from "@/services/auth";
import { passwordProblems } from "@/services/auth/password";
import { createSession, destroySession, getSessionUser } from "@/services/auth/session";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/services/email";
import { track } from "@/services/analytics";

export interface FormState {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}

const Email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254);

/** Only same-site relative redirects are honoured (prevents open redirects). */
function safeNext(next: FormDataEntryValue | null, fallback = "/dashboard"): string {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : fallback;
}

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ email: Email, password: z.string().min(1, "Enter your password.").max(200) }).safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const meta = await requestMeta();
  const rl = await rateLimit("login", `${meta.ip}:${parsed.data.email}`);
  if (!rl.ok) return { error: "Too many sign-in attempts. Please wait a few minutes and try again." };
  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) {
    await audit("auth.login_failed", { target: parsed.data.email, ip: meta.ip });
    return { error: "Email or password is incorrect." };
  }
  await createSession(user.id, meta);
  await audit("auth.login", { actorId: user.id, ip: meta.ip });
  redirect(safeNext(form.get("next")));
}

export async function signupAction(_: FormState, form: FormData): Promise<FormState> {
  const schema = z.object({
    email: Email,
    password: z.string(),
    terms: z.literal("on", { message: "Please accept the Terms and Disclaimer." }),
    plan: z.enum(["monthly", "annual"]).optional(),
  });
  const parsed = schema.safeParse({ email: form.get("email"), password: form.get("password"), terms: form.get("terms"), plan: form.get("plan") || undefined });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] ??= i.message;
    return { fieldErrors: fe };
  }
  const problems = passwordProblems(parsed.data.password, parsed.data.email);
  if (problems.length) return { fieldErrors: { password: problems.join(" ") } };
  const meta = await requestMeta();
  const rl = await rateLimit("signup", meta.ip);
  if (!rl.ok) return { error: "Too many accounts created from this network. Try again later." };
  // Honeypot: bots fill hidden fields.
  if (form.get("company")) return { error: "Unable to create account." };

  const res = await registerUser(parsed.data.email, parsed.data.password);
  if (!res.ok) return { fieldErrors: { email: res.error } };
  const token = await issueToken(res.user.id, "verify-email");
  await sendVerificationEmail(res.user.email, `${SITE.url}/verify-email?token=${token}`);
  await createSession(res.user.id, meta);
  await audit("auth.signup", { actorId: res.user.id, ip: meta.ip });
  await track("signup_completed", { userId: res.user.id, properties: { plan: parsed.data.plan ?? null } });
  redirect(`/signup/plan${parsed.data.plan ? `?plan=${parsed.data.plan}` : ""}`);
}

export async function logoutAction() {
  const user = await getSessionUser();
  await destroySession();
  if (user) await audit("auth.logout", { actorId: user.id });
  redirect("/");
}

export async function forgotPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = Email.safeParse(form.get("email"));
  if (!parsed.success) return { error: "Enter a valid email address." };
  const meta = await requestMeta();
  const rl = await rateLimit("passwordReset", `${meta.ip}:${parsed.data}`);
  if (!rl.ok) return { error: "Too many requests. Please try again later." };
  const user = await db().users.findByEmail(parsed.data);
  if (user && !user.disabledAt) {
    const token = await issueToken(user.id, "reset-password");
    await sendPasswordResetEmail(user.email, `${SITE.url}/reset-password?token=${token}`);
    await audit("auth.password_reset_requested", { actorId: user.id, ip: meta.ip });
  }
  // Same response either way — account existence is not disclosed.
  return { message: "If an account exists for that email, a reset link is on its way." };
}

export async function resetPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (password !== confirm) return { fieldErrors: { confirm: "Passwords don't match." } };
  const problems = passwordProblems(password);
  if (problems.length) return { fieldErrors: { password: problems.join(" ") } };
  const userId = await consumeToken("reset-password", token);
  if (!userId) return { error: "This reset link is invalid or has expired. Request a new one." };
  await setPassword(userId, password);
  const u = await db().users.findById(userId);
  if (u && !u.emailVerifiedAt) await db().users.update(userId, { emailVerifiedAt: new Date().toISOString() }); // proved inbox access
  await audit("auth.password_reset", { actorId: userId, ip: (await requestMeta()).ip });
  redirect("/login?reset=1");
}

export async function resendVerificationAction(): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in first." };
  if (user.emailVerifiedAt) return { message: "Your email is already verified." };
  const rl = await rateLimit("passwordReset", `verify:${user.id}`);
  if (!rl.ok) return { error: "Please wait before requesting another email." };
  const token = await issueToken(user.id, "verify-email");
  await sendVerificationEmail(user.email, `${SITE.url}/verify-email?token=${token}`);
  return { message: "Verification email sent." };
}

export async function changePasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in first." };
  const current = String(form.get("current") ?? "");
  const next = String(form.get("password") ?? "");
  const ok = await authenticate(user.email, current);
  if (!ok) return { fieldErrors: { current: "Current password is incorrect." } };
  const problems = passwordProblems(next, user.email);
  if (problems.length) return { fieldErrors: { password: problems.join(" ") } };
  await setPassword(user.id, next);
  await createSession(user.id, await requestMeta());
  await audit("auth.password_changed", { actorId: user.id });
  return { message: "Password updated. Other sessions have been signed out." };
}
