"use client";

import { useActionState } from "react";
import { resendVerificationAction, type FormState } from "@/features/auth/actions";

export function ResendVerification() {
  const [state, action, pending] = useActionState<FormState, FormData>(async () => resendVerificationAction(), {});
  return (
    <form action={action} className="inline">
      {state.message || state.error ? (
        <span className={state.error ? "text-down" : "text-up"}>{state.message ?? state.error}</span>
      ) : (
        <button type="submit" disabled={pending} className="text-polar-300 underline underline-offset-2 hover:text-polar-300/80">
          {pending ? "Sending…" : "Resend verification email"}
        </button>
      )}
    </form>
  );
}
