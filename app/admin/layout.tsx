import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { ADMIN_NAV } from "@/config/site";
import { can, type Permission } from "@/lib/auth/permissions";
import { requirePermission } from "@/services/membership";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · NSALGO Admin" }, robots: { index: false, follow: false } };

const NAV_PERMISSION: Record<string, Permission> = {
  "/admin": "admin.view",
  "/admin/content": "content.manage",
  "/admin/news": "commentary.manage",
  "/admin/education": "education.manage",
  "/admin/users": "users.view",
  "/admin/subscriptions": "billing.view",
  "/admin/atlas": "atlas.configure",
  "/admin/data-sources": "providers.view",
  "/admin/system": "system.view",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const v = await requirePermission("admin.view", "/admin");
  const items = ADMIN_NAV.filter((i) => can(v.user.role, NAV_PERMISSION[i.href] ?? "admin.view"));
  return (
    <div className="min-h-dvh bg-obsidian">
      <header className="sticky top-0 z-20 border-b border-line bg-obsidian/90 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/admin" className="flex items-center gap-3">
            <Logo />
            <Badge variant="outline" size="sm">Admin</Badge>
          </Link>
          <div className="ml-auto flex items-center gap-3 text-[12px] text-steel-400">
            <span className="hidden sm:inline">{v.user.email}</span>
            <Badge size="sm" variant="accent">{v.user.role}</Badge>
            <Link href="/dashboard" className="hover:text-chrome">Exit admin →</Link>
          </div>
        </div>
        <div className="px-4 sm:px-6 lg:px-8">
          <AdminNav items={items} />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[1500px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
