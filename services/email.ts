import "server-only";
import { env } from "@/config/env";
import { log } from "@/lib/logger";

/** Transactional email behind a swappable provider. `console` logs links for local development. */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailProvider {
  id: string;
  send(m: EmailMessage): Promise<boolean>;
}

const g = globalThis as unknown as { __nsalgoOutbox?: EmailMessage[] };
export const devOutbox: EmailMessage[] = (g.__nsalgoOutbox ??= []);

class ConsoleEmail implements EmailProvider {
  id = "console";
  async send(m: EmailMessage) {
    devOutbox.unshift(m);
    if (devOutbox.length > 50) devOutbox.length = 50;
    if (process.env.NODE_ENV !== "test") console.info(`[email:console] to=${m.to} subject="${m.subject}"\n${m.text}`);
    return true;
  }
}

class ResendEmail implements EmailProvider {
  id = "resend";
  constructor(
    private apiKey: string,
    private from: string,
  ) {}
  async send(m: EmailMessage) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: this.from, to: m.to, subject: m.subject, text: m.text, html: m.html }),
      });
      if (!res.ok) log.error("email", "Email provider rejected message", { status: res.status });
      return res.ok;
    } catch (e) {
      log.error("email", "Email send failed", { error: (e as Error).message });
      return false;
    }
  }
}

function provider(): EmailProvider {
  const e = env();
  if (e.EMAIL_PROVIDER === "resend" && e.EMAIL_API_KEY) return new ResendEmail(e.EMAIL_API_KEY, e.EMAIL_FROM);
  return new ConsoleEmail();
}

function layout(title: string, body: string, cta?: { href: string; label: string }) {
  const btn = cta
    ? `<p style="margin:28px 0"><a href="${cta.href}" style="background:#e8ecf2;color:#07080a;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-family:Helvetica,Arial,sans-serif;font-size:14px">${cta.label}</a></p>`
    : "";
  return `<div style="background:#07080a;padding:40px 0"><div style="max-width:520px;margin:0 auto;background:#0e1014;border:1px solid #1d2127;border-radius:10px;padding:36px;color:#c9ced6;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6">
  <div style="letter-spacing:.32em;font-weight:700;color:#f2f4f7;font-size:13px">NSALGO</div>
  <h1 style="color:#f2f4f7;font-size:20px;font-weight:600;margin:24px 0 8px">${title}</h1>${body}${btn}
  <p style="color:#6b7380;font-size:12px;margin-top:32px">If you didn't request this, you can ignore this email.</p></div></div>`;
}

export async function sendVerificationEmail(to: string, url: string) {
  return provider().send({
    to,
    subject: "Verify your NSALGO email",
    text: `Confirm your email address to finish setting up NSALGO:\n${url}\n\nThis link expires in 24 hours.`,
    html: layout("Confirm your email", "<p>Confirm your email address to finish setting up your NSALGO account. This link expires in 24 hours.</p>", { href: url, label: "Verify email" }),
  });
}

export async function sendPasswordResetEmail(to: string, url: string) {
  return provider().send({
    to,
    subject: "Reset your NSALGO password",
    text: `Reset your password using this link (expires in 1 hour):\n${url}`,
    html: layout("Reset your password", "<p>Use the button below to choose a new password. The link expires in one hour.</p>", { href: url, label: "Reset password" }),
  });
}

export async function sendContactNotification(from: string, topic: string, message: string) {
  return provider().send({
    to: process.env.CONTACT_INBOX ?? "support@nsalgo.com",
    subject: `[Contact] ${topic}`,
    text: `From: ${from}\nTopic: ${topic}\n\n${message}`,
    html: layout(`Contact: ${topic}`, `<p>From: ${escapeHtml(from)}</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`),
  });
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
