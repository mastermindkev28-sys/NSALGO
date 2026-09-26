import type { Metadata } from "next";
import Link from "next/link";
import { MemberBody, MemberPageHeader } from "@/components/member/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { signOutEverywhereAction } from "@/features/account/actions";
import { ProfileForm } from "@/features/account/profile-form";
import { ResendVerification } from "@/features/account/resend-verification";
import { ChangePasswordForm } from "@/features/auth/forms";
import { fmtDate } from "@/lib/format";
import { requireUser } from "@/services/membership";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const v = await requireUser("/dashboard/account");
  return (
    <>
      <MemberPageHeader eyebrow="Personal" title="Account" description="Profile, security and sessions." />
      <MemberBody className="max-w-4xl">
        <Panel>
          <PanelHeader title="Identity" />
          <PanelBody className="grid gap-4 text-[13px] sm:grid-cols-3">
            <div>
              <div className="text-steel-500">Email</div>
              <div className="mt-0.5 text-steel-100">{v.user.email}</div>
              <div className="mt-1">{v.user.emailVerifiedAt ? <Badge size="sm" variant="up">Verified</Badge> : <span className="text-[12px] text-warn">Unverified · <ResendVerification /></span>}</div>
            </div>
            <div>
              <div className="text-steel-500">Membership</div>
              <div className="mt-0.5 capitalize text-steel-100">{v.state.replace("_", " ")}</div>
              <Link href="/dashboard/billing" className="text-[12px] text-polar-300">Billing →</Link>
            </div>
            <div>
              <div className="text-steel-500">Member since</div>
              <div className="mt-0.5 text-steel-100">{fmtDate(v.user.createdAt, true)}</div>
              <div className="text-[12px] capitalize text-steel-500">Role: {v.user.role}</div>
            </div>
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHeader title="Profile & preferences" />
          <PanelBody>
            <ProfileForm profile={v.profile} />
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHeader title="Password" description="Changing your password signs out every other session." />
          <PanelBody>
            <ChangePasswordForm />
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHeader title="Sessions" />
          <PanelBody className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-steel-400">Sign out of NSALGO on every device, including this one.</p>
            <form action={signOutEverywhereAction}>
              <Button variant="outline" size="sm">Sign out everywhere</Button>
            </form>
          </PanelBody>
        </Panel>
      </MemberBody>
    </>
  );
}
