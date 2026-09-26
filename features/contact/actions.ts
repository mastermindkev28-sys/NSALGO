"use server";

import { z } from "zod";
import { rateLimit } from "@/lib/security/rate-limit";
import { requestMeta } from "@/lib/security/request";
import { audit } from "@/services/audit";
import { sendContactNotification } from "@/services/email";

export interface ContactState {
  ok?: boolean;
  error?: string;
}

const Schema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100),
  email: z.string().trim().email("Enter a valid email.").max(254),
  topic: z.enum(["Membership", "Billing", "Data & providers", "Partnerships", "Press", "Other"]),
  message: z.string().trim().min(10, "Tell us a little more.").max(4000),
});

export async function contactAction(_: ContactState, form: FormData): Promise<ContactState> {
  if (form.get("website")) return { ok: true }; // honeypot
  const parsed = Schema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const meta = await requestMeta();
  const rl = await rateLimit("contact", meta.ip);
  if (!rl.ok) return { error: "Too many messages. Please try again later." };
  await sendContactNotification(`${parsed.data.name} <${parsed.data.email}>`, parsed.data.topic, parsed.data.message);
  await audit("contact.submitted", { ip: meta.ip, metadata: { topic: parsed.data.topic } });
  return { ok: true };
}
