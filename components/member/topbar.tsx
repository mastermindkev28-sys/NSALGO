"use client";

import { Bell, CheckCheck, CreditCard, LogOut, Menu, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { SearchTrigger } from "@/components/layout/search-command";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger, Drawer } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MarketStatus } from "@/types/market";
import type { Notification } from "@/types/domain";
import { SidebarNav } from "./sidebar";

function Notifications() {
  const router = useRouter();
  const [data, setData] = useState<{ items: Notification[]; unread: number }>({ items: [], unread: 0 });
  const load = () =>
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.ok && setData(j.data))
      .catch(() => undefined);
  useEffect(() => {
    void load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);
  const markAll = async () => {
    await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: "all" }) });
    void load();
  };
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Notifications${data.unread ? `, ${data.unread} unread` : ""}`} className="relative">
          <Bell />
          {data.unread ? <span className="absolute right-1 top-1 size-1.5 rounded-full bg-polar-400" /> : null}
        </Button>
      </DropdownTrigger>
      <DropdownContent className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
          <span className="text-[12.5px] font-medium text-steel-100">Notifications</span>
          {data.unread ? (
            <button onClick={markAll} className="flex items-center gap-1 text-[11.5px] text-steel-400 hover:text-chrome">
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
          ) : null}
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {data.items.length ? (
            data.items.map((n) => (
              <DropdownItem key={n.id} onSelect={() => n.href && router.push(n.href)} className="flex-col items-start gap-0.5 py-2.5">
                <span className={cn("text-[12.5px]", n.readAt ? "text-steel-300" : "font-medium text-chrome")}>{n.title}</span>
                <span className="line-clamp-2 text-[11.5px] text-steel-500">{n.body}</span>
                <span className="text-[10.5px] text-steel-500">{timeAgo(n.createdAt)}</span>
              </DropdownItem>
            ))
          ) : (
            <p className="px-3 py-6 text-center text-[12px] text-steel-500">No notifications yet. Create alerts to be notified here.</p>
          )}
        </div>
        <div className="border-t border-line p-1">
          <DropdownItem onSelect={() => router.push("/dashboard/alerts")}>Manage alerts</DropdownItem>
        </div>
      </DropdownContent>
    </Dropdown>
  );
}

export function Topbar({ email, stateLabel, staff, status }: { email: string; stateLabel: string; staff: boolean; status: MarketStatus | null }) {
  const [menu, setMenu] = useState(false);
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-obsidian/85 px-4 backdrop-blur-xl sm:px-6">
      <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open navigation" onClick={() => setMenu(true)}>
        <Menu />
      </Button>
      <Link href="/dashboard" className="lg:hidden" aria-label="Dashboard">
        <Logo compact />
      </Link>
      <SearchTrigger className="hidden w-full max-w-sm sm:flex" />
      <div className="ml-auto flex items-center gap-2">
        {status ? (
          <span className="hidden items-center gap-1.5 rounded-sm border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-steel-400 md:flex">
            <span className={cn("size-1.5 rounded-full", status.state === "open" ? "animate-pulse-soft bg-up" : status.state === "closed" ? "bg-steel-500" : "bg-warn")} aria-hidden />
            {status.label}
          </span>
        ) : null}
        <SearchTrigger compact className="sm:hidden" />
        <Notifications />
        <Dropdown>
          <DropdownTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Account menu">
              <UserRound />
            </Button>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownLabel>
              <div className="truncate text-[12px] text-steel-200">{email}</div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-steel-500">{stateLabel}</div>
            </DropdownLabel>
            <DropdownSeparator />
            <DropdownItem asChild>
              <Link href="/dashboard/account">
                <UserRound /> Account
              </Link>
            </DropdownItem>
            <DropdownItem asChild>
              <Link href="/dashboard/billing">
                <CreditCard /> Billing
              </Link>
            </DropdownItem>
            <DropdownSeparator />
            <form action={logoutAction}>
              <button type="submit" className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-[13px] text-steel-200 hover:bg-white/[0.06] hover:text-chrome [&_svg]:size-3.5">
                <LogOut /> Sign out
              </button>
            </form>
          </DropdownContent>
        </Dropdown>
      </div>
      <Drawer open={menu} onOpenChange={setMenu} side="left" title={<Logo />}>
        <div className="px-2 py-4">
          <SidebarNav staff={staff} onNavigate={() => setMenu(false)} />
        </div>
      </Drawer>
    </header>
  );
}
