import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/admin-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { db } from "@/db";
import { runJobAction } from "@/features/admin/actions";
import { cacheStore } from "@/lib/cache";
import { fmtDateTimeET } from "@/lib/format";
import { recentLogs } from "@/lib/logger";
import { JOBS } from "@/services/jobs";
import { requirePermission } from "@/services/membership";
import { nowMs } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "System Health" };

export default async function SystemAdmin() {
  await requirePermission("system.view");
  const started = nowMs();
  let dbOk = true;
  try {
    await db().users.count();
  } catch {
    dbOk = false;
  }
  const dbLatency = nowMs() - started;
  const [jobs, storedLogs, auditLog] = await Promise.all([db().ops.listJobs(40), db().ops.listLogs({ limit: 60 }), db().ops.listAudit(40)]);
  const logs = (storedLogs.length ? storedLogs : recentLogs(60)).filter((l) => l.level !== "info").slice(0, 60);
  return (
    <>
      <AdminHeader title="System health" description="Database, cache, scheduled jobs, errors and the audit trail." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <MetricCard label="Database" value={dbOk ? "Healthy" : "Unavailable"} hint={`${db().kind} · ${dbLatency} ms`} />
        <MetricCard label="Cache entries" value={cacheStore.size()} hint="process-local" />
        <MetricCard label="Data mode" value={process.env.DATA_MODE ?? "mock"} />
        <MetricCard label="Errors (recent)" value={logs.filter((l) => l.level === "error").length} />
        <MetricCard label="Uptime" value={`${Math.round(process.uptime() / 60)} min`} hint={`Node ${process.version}`} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="overflow-x-auto">
          <PanelHeader title="Scheduled jobs" description="Triggered by the platform scheduler via /api/cron/:job (Bearer CRON_SECRET)." />
          <table className="w-full min-w-[560px] text-[12.5px]">
            <tbody>
              {Object.entries(JOBS).map(([name, j]) => {
                const last = jobs.find((r) => r.job === name);
                return (
                  <tr key={name} className="border-b border-line/60">
                    <td className="px-4 py-2.5"><div className="font-mono text-[12px] text-steel-100">{name}</div><div className="text-[11px] text-steel-500">{j.description}</div></td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-steel-400">{j.schedule}</td>
                    <td className="px-4 py-2.5">{last ? <Badge size="sm" variant={last.status === "succeeded" ? "up" : last.status === "failed" ? "down" : "warn"}>{last.status}</Badge> : <span className="text-[11px] text-steel-500">never run</span>}</td>
                    <td className="px-4 py-2.5 text-right">
                      <form action={runJobAction}><input type="hidden" name="job" value={name} /><Button size="xs" variant="ghost">Run now</Button></form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
        <Panel className="overflow-hidden">
          <PanelHeader title="Recent job runs" />
          {jobs.length ? (
            <ul className="max-h-[420px] divide-y divide-line/60 overflow-y-auto">
              {jobs.map((j) => (
                <li key={j.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-[12px]">
                  <span><span className="font-mono text-steel-100">{j.job}</span> <span className="text-steel-500">{fmtDateTimeET(j.startedAt)}</span><div className="mt-0.5 max-w-md truncate font-mono text-[10.5px] text-steel-500">{j.detail ? JSON.stringify(j.detail) : ""}</div></span>
                  <Badge size="sm" variant={j.status === "succeeded" ? "up" : j.status === "failed" ? "down" : "warn"}>{j.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No job runs recorded" />
          )}
        </Panel>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="overflow-hidden">
          <PanelHeader title="Errors & warnings" description="API failures, provider outages, rejected webhooks, rejected AI output." />
          {logs.length ? (
            <ul className="max-h-[480px] divide-y divide-line/60 overflow-y-auto">
              {logs.map((l) => (
                <li key={l.id} className="px-4 py-2.5 text-[12px]">
                  <div className="flex items-center gap-2"><Badge size="sm" variant={l.level === "error" ? "down" : "warn"}>{l.level}</Badge><span className="font-mono text-[11px] text-steel-400">{l.scope}</span><span className="ml-auto text-[11px] text-steel-500">{fmtDateTimeET(l.createdAt)}</span></div>
                  <div className="mt-1 text-steel-200">{l.message}</div>
                  {l.context ? <div className="mt-0.5 truncate font-mono text-[10.5px] text-steel-500">{JSON.stringify(l.context)}</div> : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No errors or warnings" />
          )}
        </Panel>
        <Panel className="overflow-hidden">
          <PanelHeader title="Audit log" />
          {auditLog.length ? (
            <ul className="max-h-[480px] divide-y divide-line/60 overflow-y-auto">
              {auditLog.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-[12px]">
                  <span><span className="font-mono text-steel-100">{a.action}</span>{a.target ? <span className="text-steel-400"> · {a.target}</span> : null}<div className="text-[10.5px] text-steel-500">{a.actorId ?? "anonymous"}{a.ip ? ` · ${a.ip}` : ""}</div></span>
                  <span className="shrink-0 text-[11px] text-steel-500">{fmtDateTimeET(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No audit events" />
          )}
        </Panel>
      </div>
    </>
  );
}
