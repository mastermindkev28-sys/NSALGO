"use client";

import { CheckCircle2 } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/controls";
import { contactAction, type ContactState } from "./actions";

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(contactAction, {});
  if (state.ok) {
    return (
      <div className="flex flex-col items-start gap-3 py-6">
        <CheckCircle2 className="size-6 text-up" />
        <p className="text-[15px] text-steel-50">Message received.</p>
        <p className="text-[13px] text-steel-400">We typically respond within one business day.</p>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required maxLength={100} autoComplete="name" />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required maxLength={254} autoComplete="email" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="topic">Topic</Label>
        <Select id="topic" name="topic" defaultValue="Membership">
          {["Membership", "Billing", "Data & providers", "Partnerships", "Press", "Other"].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" required minLength={10} maxLength={4000} rows={6} />
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="sm:col-span-2">
        <FieldError>{state.error}</FieldError>
        <Button variant="primary" disabled={pending} className="mt-2">
          {pending ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  );
}
