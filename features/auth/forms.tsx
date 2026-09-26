"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, FieldError, Input, Label } from "@/components/ui/controls";
import { cn } from "@/lib/utils";
import { changePasswordAction, forgotPasswordAction, loginAction, resetPasswordAction, signupAction, type FormState } from "./actions";

function PasswordInput({ name, autoComplete, invalid, id }: { name: string; autoComplete: string; invalid?: boolean; id?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id ?? name} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required maxLength={200} aria-invalid={invalid} className="pr-10" />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-steel-500 hover:text-steel-200" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function Banner({ state }: { state: FormState }) {
  if (state.error) return <div className="rounded-md border border-down/30 bg-down-soft px-3 py-2.5 text-[13px] text-down" role="alert">{state.error}</div>;
  if (state.message) return <div className="rounded-md border border-up/30 bg-up-soft px-3 py-2.5 text-[13px] text-up" role="status">{state.message}</div>;
  return null;
}

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4">
      {notice ? <div className="rounded-md border border-up/30 bg-up-soft px-3 py-2.5 text-[13px] text-up">{notice}</div> : null}
      <Banner state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required maxLength={254} autoFocus />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="mb-1.5 text-[12px] text-steel-400 hover:text-chrome">Forgot password?</Link>
        </div>
        <PasswordInput name="password" autoComplete="current-password" />
      </div>
      <Button variant="primary" className="w-full" size="md" disabled={pending}>
        {pending ? "Signing in…" : "Login"}
      </Button>
    </form>
  );
}

export function SignupForm({ plan }: { plan?: "monthly" | "annual" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signupAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <Banner state={state} />
      {plan ? <input type="hidden" name="plan" value={plan} /> : null}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required maxLength={254} aria-invalid={!!fe.email} autoFocus />
        <FieldError>{fe.email}</FieldError>
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <PasswordInput name="password" autoComplete="new-password" invalid={!!fe.password} />
        {fe.password ? <FieldError>{fe.password}</FieldError> : <p className="mt-1.5 text-[11.5px] text-steel-500">At least 10 characters, including a number or symbol.</p>}
      </div>
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <label className="flex items-start gap-2.5 text-[12.5px] leading-snug text-steel-400">
        <Checkbox name="terms" value="on" className="mt-0.5" aria-invalid={!!fe.terms} />
        <span>
          I agree to the <Link href="/terms" className="text-steel-200 underline underline-offset-2">Terms</Link> and understand the{" "}
          <Link href="/disclaimer" className="text-steel-200 underline underline-offset-2">Disclaimer</Link>: NSALGO is informational and not investment advice.
        </span>
      </label>
      <FieldError>{fe.terms}</FieldError>
      <Button variant="primary" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(forgotPasswordAction, {});
  return (
    <form action={action} className="space-y-4">
      <Banner state={state} />
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required maxLength={254} autoFocus />
      </div>
      <Button variant="primary" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPasswordAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <Banner state={state} />
      <input type="hidden" name="token" value={token} />
      <div>
        <Label htmlFor="password">New password</Label>
        <PasswordInput name="password" autoComplete="new-password" invalid={!!fe.password} />
        <FieldError>{fe.password}</FieldError>
      </div>
      <div>
        <Label htmlFor="confirm">Confirm password</Label>
        <PasswordInput name="confirm" autoComplete="new-password" invalid={!!fe.confirm} />
        <FieldError>{fe.confirm}</FieldError>
      </div>
      <Button variant="primary" className="w-full" disabled={pending}>
        {pending ? "Updating…" : "Set new password"}
      </Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePasswordAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className={cn("grid gap-4 sm:grid-cols-2")}>
      <div className="sm:col-span-2">
        <Banner state={state} />
      </div>
      <div>
        <Label htmlFor="current">Current password</Label>
        <PasswordInput id="current" name="current" autoComplete="current-password" invalid={!!fe.current} />
        <FieldError>{fe.current}</FieldError>
      </div>
      <div>
        <Label htmlFor="new-password">New password</Label>
        <PasswordInput id="new-password" name="password" autoComplete="new-password" invalid={!!fe.password} />
        <FieldError>{fe.password}</FieldError>
      </div>
      <div className="sm:col-span-2">
        <Button variant="secondary" disabled={pending}>{pending ? "Updating…" : "Update password"}</Button>
      </div>
    </form>
  );
}
