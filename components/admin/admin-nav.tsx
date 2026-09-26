"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AdminNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto scrollbar-none" aria-label="Admin">
      {items.map((i) => {
        const active = i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} className={cn("flex h-10 shrink-0 items-center border-b px-3 text-[12.5px] font-medium", active ? "border-chrome text-chrome" : "border-transparent text-steel-400 hover:text-steel-100")}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
