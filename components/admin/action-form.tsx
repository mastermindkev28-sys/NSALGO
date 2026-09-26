"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { AdminState } from "@/features/admin/actions";

/** Form wrapper for admin server actions: pending state + inline result. */
export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  className,
}: {
  action: (s: AdminState, f: FormData) => Promise<AdminState>;
  children: React.ReactNode;
  submitLabel?: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(action, {});
  return (
    <form action={formAction} className={className}>
      {children}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button variant="primary" size="sm" disabled={pending}>{pending ? "Saving…" : submitLabel}</Button>
        {state.message ? <span className="text-[12.5px] text-up" role="status">{state.message}</span> : null}
        {state.error ? <span className="text-[12.5px] text-down" role="alert">{state.error}</span> : null}
      </div>
    </form>
  );
}
