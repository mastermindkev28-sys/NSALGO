"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { audit } from "@/services/audit";
import { getSessionUser, destroySession } from "@/services/auth/session";
import { redirect } from "next/navigation";

export interface ProfileState {
  ok?: boolean;
  error?: string;
}

const Schema = z.object({
  displayName: z.string().trim().max(60).optional().transform((v) => v || null),
  timezone: z.string().trim().max(60).refine((tz) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Unknown time zone"),
  experience: z.enum(["new", "intermediate", "advanced"]).nullable().catch(null),
  defaultMode: z.enum(["day", "swing"]),
  marketingOptIn: z.boolean(),
});

export async function updateProfileAction(_: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in first." };
  const parsed = Schema.safeParse({
    displayName: form.get("displayName") ?? undefined,
    timezone: form.get("timezone") ?? "America/New_York",
    experience: form.get("experience") || null,
    defaultMode: form.get("defaultMode") ?? "swing",
    marketingOptIn: form.get("marketingOptIn") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  await db().profiles.upsert({ userId: user.id, ...parsed.data });
  await audit("account.profile_updated", { actorId: user.id });
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function signOutEverywhereAction() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  await db().sessions.deleteForUser(user.id);
  await destroySession();
  await audit("auth.sessions_revoked", { actorId: user.id });
  redirect("/login");
}
