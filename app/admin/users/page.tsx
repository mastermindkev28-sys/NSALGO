import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader } from "@/components/admin/admin-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/controls";
import { Panel } from "@/components/ui/panel";
import { db } from "@/db";
import { updateUserAction } from "@/features/admin/actions";
import { can } from "@/lib/auth/permissions";
import { fmtDate } from "@/lib/format";
import { membershipState, requirePermission } from "@/services/membership";
import type { Role } from "@/types/domain";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Users" };

export default async function UsersAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const v = await requirePermission("users.view");
  const manage = can(v.user.role, "users.manage");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const role = ["member", "analyst", "editor", "admin"].includes(sp.role ?? "") ? (sp.role as Role) : undefined;
  const { items, total } = await db().users.list({ q: sp.q?.slice(0, 80), role, page, pageSize: 50 });
  const subs = await Promise.all(items.map((u) => db().billing.getSubscriptionForUser(u.id)));
  return (
    <>
      <AdminHeader title="User management" description={`${total} accounts. Role changes and account suspension are audit-logged; suspending an account revokes its sessions.`} />
      <form className="flex flex-wrap gap-2" action="/admin/users">
        <Input name="q" defaultValue={sp.q} placeholder="Search email" className="h-9 w-64 text-[13px]" />
        <Select name="role" defaultValue={role ?? ""} className="w-40 [&_select]:h-9 [&_select]:text-[13px]">
          <option value="">All roles</option>
          <option value="member">Member</option>
          <option value="analyst">Analyst</option>
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
        </Select>
        <Button variant="secondary" className="h-9">Filter</Button>
      </form>
      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-[12.5px]">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-[0.12em] text-steel-500">
              {["Email", "Role", "Membership", "Verified", "Joined", "Status", ""].map((h) => <th key={h} className="px-4 py-2.5 font-normal">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {items.map((u, i) => (
              <tr key={u.id} className="border-b border-line/60">
                <td className="px-4 py-2.5 text-steel-50">{u.email}</td>
                <td className="px-4 py-2.5">
                  {manage ? (
                    <form action={updateUserAction} className="flex gap-1">
                      <input type="hidden" name="id" value={u.id} />
                      <select name="role" defaultValue={u.role} className="h-7 rounded-sm border border-line bg-graphite-950 px-2 text-[12px] text-steel-100">
                        {["member", "analyst", "editor", "admin"].map((r) => <option key={r}>{r}</option>)}
                      </select>
                      <Button size="xs" variant="ghost">Set</Button>
                    </form>
                  ) : (
                    <Badge size="sm">{u.role}</Badge>
                  )}
                </td>
                <td className="px-4 py-2.5 capitalize text-steel-300">{membershipState(u, subs[i] ?? null).replace("_", " ")}</td>
                <td className="px-4 py-2.5">{u.emailVerifiedAt ? <Badge size="sm" variant="up">yes</Badge> : <Badge size="sm" variant="outline">no</Badge>}</td>
                <td className="num px-4 py-2.5 text-steel-400">{fmtDate(u.createdAt, true)}</td>
                <td className="px-4 py-2.5">{u.disabledAt ? <Badge size="sm" variant="down">suspended</Badge> : <Badge size="sm" variant="outline">active</Badge>}</td>
                <td className="px-4 py-2.5 text-right">
                  {manage && u.id !== v.user.id ? (
                    <form action={updateUserAction}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="disable" value={u.disabledAt ? "0" : "1"} />
                      <Button size="xs" variant="ghost" className={u.disabledAt ? "" : "text-down"}>{u.disabledAt ? "Restore" : "Suspend"}</Button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <div className="flex gap-2">
        {page > 1 ? <Button asChild size="sm" variant="ghost"><Link href={`/admin/users?page=${page - 1}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`}>← Previous</Link></Button> : null}
        {page * 50 < total ? <Button asChild size="sm" variant="ghost"><Link href={`/admin/users?page=${page + 1}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`}>Next →</Link></Button> : null}
      </div>
    </>
  );
}
