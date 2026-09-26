"use client";

import { Shield } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { MEMBER_SECTIONS } from "./nav-config";

export function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ staff, onNavigate }: { staff: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  // Most specific match wins so /dashboard/atlas/day doesn't also light up /dashboard/atlas.
  const all = MEMBER_SECTIONS.flatMap((s) => s.items);
  const activeHref = all
    .filter((i) => isActive(pathname, i.href, i.exact))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav className="space-y-6" aria-label="Member">
      {MEMBER_SECTIONS.map((section) => (
        <div key={section.title}>
          <div className="eyebrow mb-1.5 px-3">{section.title}</div>
          <ul className="space-y-px">
            {section.items.map((item) => {
              const active = item.href === activeHref;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex h-8 items-center gap-2.5 rounded-sm px-3 text-[13px] transition-colors",
                      active ? "bg-white/[0.07] text-chrome shadow-[inset_2px_0_0_0_var(--color-polar-400)]" : "text-steel-400 hover:bg-white/[0.03] hover:text-steel-100",
                    )}
                  >
                    <Icon className={cn("size-[15px] shrink-0", active ? "text-polar-300" : "text-steel-500 group-hover:text-steel-300")} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {staff ? (
        <div>
          <div className="eyebrow mb-1.5 px-3">Staff</div>
          <Link href="/admin" onClick={onNavigate} className="flex h-8 items-center gap-2.5 rounded-sm px-3 text-[13px] text-steel-400 hover:bg-white/[0.03] hover:text-steel-100">
            <Shield className="size-[15px] text-steel-500" /> Admin
          </Link>
        </div>
      ) : null}
    </nav>
  );
}

export function Sidebar({ staff }: { staff: boolean }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-line bg-graphite-950 lg:flex">
      <div className="flex h-14 shrink-0 items-center border-b border-line px-5">
        <Link href="/" aria-label="NSALGO home">
          <Logo />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-5">
        <SidebarNav staff={staff} />
      </div>
      <div className="border-t border-line px-5 py-3 text-[10.5px] leading-snug text-steel-500">Not investment advice. Data may be delayed.</div>
    </aside>
  );
}
