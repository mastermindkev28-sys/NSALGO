"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MOBILE_TABS } from "./nav-config";
import { isActive } from "./sidebar";

/** Bottom navigation for the member portal on phones (large touch targets). */
export function MobileTabs() {
  const pathname = usePathname();
  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Primary">
      {MOBILE_TABS.map((t) => {
        const active = isActive(pathname, t.href, t.exact);
        const Icon = t.icon;
        return (
          <Link key={t.href} href={t.href} className={cn("flex h-14 flex-col items-center justify-center gap-1 text-[10.5px]", active ? "text-chrome" : "text-steel-500")}>
            <Icon className="size-[18px]" />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
