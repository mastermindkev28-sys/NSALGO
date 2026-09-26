"use client";

import { LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { PUBLIC_NAV } from "@/config/site";
import { logoutAction } from "@/features/auth/actions";
import { cn } from "@/lib/utils";
import { SearchTrigger } from "./search-command";

export function TopNav({ signedIn, paid }: { signedIn: boolean; paid: boolean }) {
  const pathname = usePathname();
  // Menu state is tied to the path it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (fn: (o: boolean) => boolean) => setOpenOn(fn(open) ? pathname : null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className={cn("sticky top-0 z-40 transition-colors duration-300", scrolled || open ? "glass border-x-0 border-t-0" : "border-b border-transparent")}>
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="NSALGO home">
          <Logo priority />
        </Link>
        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          {PUBLIC_NAV.map((n) => {
            const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-sm px-2.5 py-1.5 text-[13px] transition-colors",
                  active ? "text-chrome" : "text-steel-300 hover:text-chrome",
                  n.label === "ATLAS" && "font-mono text-[11.5px] tracking-[0.28em]",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <SearchTrigger className="hidden sm:flex" />
          <SearchTrigger compact className="sm:hidden" />
          {signedIn ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                <Link href="/dashboard">
                  <LayoutDashboard /> Dashboard
                </Link>
              </Button>
              {!paid ? (
                <Button asChild variant="primary" size="sm" className="hidden md:inline-flex">
                  <Link href="/pricing">Join NSALGO</Link>
                </Button>
              ) : (
                <form action={logoutAction} className="hidden md:block">
                  <Button variant="ghost" size="icon-sm" aria-label="Sign out" title="Sign out">
                    <LogOut />
                  </Button>
                </form>
              )}
            </>
          ) : (
            <>
              <Link href="/login" className="hidden px-2 text-[13px] text-steel-300 transition-colors hover:text-chrome md:block">
                Login
              </Link>
              <Button asChild variant="primary" size="sm" className="hidden md:inline-flex">
                <Link href="/signup">Join NSALGO</Link>
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-line lg:hidden">
          <nav className="mx-auto grid max-w-[1400px] gap-0.5 px-4 py-3" aria-label="Mobile">
            {PUBLIC_NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-md px-3 py-3 text-[15px] text-steel-100 hover:bg-white/[0.04]">
                {n.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-3">
              {signedIn ? (
                <Button asChild variant="secondary">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <Button asChild variant="secondary">
                  <Link href="/login">Login</Link>
                </Button>
              )}
              <Button asChild variant="primary">
                <Link href={signedIn ? "/pricing" : "/signup"}>Join NSALGO</Link>
              </Button>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
