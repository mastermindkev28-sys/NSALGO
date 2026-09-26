"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/controls";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/states";
import { timeAgo, titleCase } from "@/lib/format";
import type { Alert, Notification } from "@/types/domain";

export function AlertsManager({ alerts: initial, notifications }: { alerts: Alert[]; notifications: Notification[] }) {
  const [alerts, setAlerts] = useState(initial);
  const toggle = async (a: Alert, active: boolean) => {
    const res = await fetch(`/api/alerts/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) });
    if (res.ok) setAlerts((xs) => xs.map((x) => (x.id === a.id ? { ...x, active } : x)));
    else toast.error("Could not update alert");
  };
  const remove = async (a: Alert) => {
    const res = await fetch(`/api/alerts/${a.id}`, { method: "DELETE" });
    if (res.ok) setAlerts((xs) => xs.filter((x) => x.id !== a.id));
  };
  return (
    <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <div className="panel overflow-hidden">
        <div className="border-b border-line px-4 py-3 text-[13.5px] font-medium text-steel-50">Your alerts</div>
        {alerts.length ? (
          <DataTable
            rows={alerts}
            rowKey={(a) => a.id}
            columns={[
              { key: "sym", header: "Symbol", cell: (a) => <Link href={`/dashboard/symbol/${a.symbol}`} className="font-mono tracking-wider text-chrome">{a.symbol}</Link> },
              { key: "kind", header: "Condition", cell: (a) => <span className="text-steel-200">{titleCase(a.kind)}{a.threshold !== null ? ` · ${a.threshold}` : ""}</span> },
              { key: "ch", header: "Channel", cell: (a) => <span className="text-steel-400">{a.channel}</span>, hideOnMobile: true },
              { key: "last", header: "Last triggered", cell: (a) => <span className="text-steel-400" suppressHydrationWarning>{a.lastTriggeredAt ? timeAgo(a.lastTriggeredAt) : "Never"}</span>, hideOnMobile: true },
              { key: "on", header: "Active", cell: (a) => <Switch checked={a.active} onCheckedChange={(v) => toggle(a, v)} aria-label="Toggle alert" /> },
              { key: "x", header: "", align: "right", cell: (a) => <Button size="icon-sm" variant="ghost" onClick={() => remove(a)} aria-label="Delete alert"><Trash2 /></Button> },
            ]}
          />
        ) : (
          <EmptyState title="No alerts yet" description="Create alerts from any symbol page or watchlist: price, Atlas score, options flow, news, unusual volume and insider filings." />
        )}
      </div>
      <div className="panel overflow-hidden">
        <div className="border-b border-line px-4 py-3 text-[13.5px] font-medium text-steel-50">Recent notifications</div>
        {notifications.length ? (
          <ul className="divide-y divide-line/70">
            {notifications.map((n) => (
              <li key={n.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={n.readAt ? "text-[13px] text-steel-300" : "text-[13px] font-medium text-chrome"}>{n.title}</span>
                  <span className="shrink-0 text-[11px] text-steel-500" suppressHydrationWarning>{timeAgo(n.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-[12px] text-steel-400">{n.body}</p>
                {n.href ? <Link href={n.href} className="mt-1 inline-block text-[11.5px] text-polar-300">Open →</Link> : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No notifications" />
        )}
      </div>
    </div>
  );
}
