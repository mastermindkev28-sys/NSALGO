"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

/** Route-driven tab bar (each tab is a URL, so views are shareable and SSR'd). */
export function SegmentNav({ items, className, exact = true }: { items: { href: string; label: string; badge?: string }[]; className?: string; exact?: boolean }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const current = `${pathname}${search.toString() ? `?${search.toString()}` : ""}`;
  return (
    <nav className={cn("-mb-px flex items-center gap-1 overflow-x-auto scrollbar-none", className)} aria-label="Section">
      {items.map((it) => {
        const hasQuery = it.href.includes("?");
        const active = hasQuery ? current === it.href : exact ? pathname === it.href : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-10 shrink-0 items-center gap-1.5 border-b px-3 text-[12.5px] font-medium transition-colors",
              active ? "border-chrome text-chrome" : "border-transparent text-steel-400 hover:text-steel-100",
            )}
          >
            {it.label}
            {it.badge ? <span className="rounded-xs bg-white/[0.06] px-1 font-mono text-[9.5px] text-steel-300">{it.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
