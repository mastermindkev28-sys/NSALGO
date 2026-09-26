"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, FieldError, Input, Label, Select } from "@/components/ui/controls";
import type { Profile } from "@/types/domain";
import { updateProfileAction, type ProfileState } from "./actions";

const ZONES = ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney", "UTC"];

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfileAction, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="displayName">Display name</Label>
        <Input id="displayName" name="displayName" defaultValue={profile?.displayName ?? ""} maxLength={60} />
      </div>
      <div>
        <Label htmlFor="timezone">Time zone</Label>
        <Select id="timezone" name="timezone" defaultValue={profile?.timezone ?? "America/New_York"}>
          {ZONES.map((z) => <option key={z}>{z}</option>)}
        </Select>
      </div>
      <div>
        <Label htmlFor="experience">Experience</Label>
        <Select id="experience" name="experience" defaultValue={profile?.experience ?? ""}>
          <option value="">Prefer not to say</option>
          <option value="new">New to trading</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="defaultMode">Default Atlas mode</Label>
        <Select id="defaultMode" name="defaultMode" defaultValue={profile?.defaultMode ?? "swing"}>
          <option value="swing">Swing</option>
          <option value="day">Day trade</option>
        </Select>
      </div>
      <label className="flex items-center gap-2.5 text-[13px] text-steel-300 sm:col-span-2">
        <Checkbox name="marketingOptIn" defaultChecked={profile?.marketingOptIn ?? false} /> Product updates by email
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button variant="secondary" disabled={pending}>{pending ? "Saving…" : "Save profile"}</Button>
        {state.ok ? <span className="text-[12.5px] text-up">Saved.</span> : null}
        <FieldError>{state.error}</FieldError>
      </div>
    </form>
  );
}
