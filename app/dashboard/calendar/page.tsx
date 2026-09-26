import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { MemberBody, MemberPageHeader } from "@/components/member/page-header";
import { TradingViewEconomicCalendar } from "@/components/tradingview";
import { Badge } from "@/components/ui/badge";
import { DataSourceBadge } from "@/components/ui/data-source";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { EmptyState, UnavailableState } from "@/components/ui/states";
import { DASH, fmtDate, fmtTimeET } from "@/lib/format";
import { addDays, currentSessionDate } from "@/lib/market-time";
import { cn } from "@/lib/utils";
import { listEarnings, listEconomicEvents } from "@/services/intel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const start = addDays(currentSessionDate(), -2);
  const [events, earnings] = await Promise.all([listEconomicEvents(start, addDays(start, 16)), listEarnings(start, addDays(start, 21))]);
  const groups = events.ok
    ? Object.entries(
        events.data.reduce<Record<string, typeof events.data>>((acc, e) => {
          const d = new Date(e.datetime).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
          (acc[d] ??= []).push(e);
          return acc;
        }, {}),
      )
    : [];
  return (
    <>
      <MemberPageHeader eyebrow="Markets" title="Economic & earnings calendar" description="CPI, PCE, GDP, payrolls, FOMC, Fed speakers, retail sales, PMI, confidence, jobless claims and Treasury auctions. Forecast and actual values appear only once published by the source." actions={<DataSourceBadge meta={events.ok ? events.meta : null} />} />
      <MemberBody>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Panel className="overflow-hidden">
            <PanelHeader eyebrow="Economic calendar" title="United States · times ET" />
            {!events.ok ? (
              <UnavailableState error={events.error} label="Economic calendar" />
            ) : !groups.length ? (
              <EmptyState title="No scheduled releases in this window" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-[12.5px]">
                  <thead>
                    <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-[0.12em] text-steel-500">
                      {["Time", "Event", "Importance", "Previous", "Forecast", "Actual"].map((h, i) => (
                        <th key={h} className={cn("px-4 py-2.5 font-normal", i >= 3 && "text-right")}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map(([day, evs]) => (
                      <Fragment key={day}>
                        <tr className="bg-graphite-850">
                          <td colSpan={6} className="px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-steel-300">
                            {new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                          </td>
                        </tr>
                        {evs.map((e) => (
                          <tr key={e.id} className={cn("border-b border-line/60", Date.parse(e.datetime) < Date.now() && "opacity-70")}>
                            <td className="num px-4 py-2.5 text-steel-400">{fmtTimeET(e.datetime)}</td>
                            <td className="px-4 py-2.5 text-steel-50">{e.event}</td>
                            <td className="px-4 py-2.5"><Badge size="sm" variant={e.importance === "high" ? "warn" : "outline"}>{e.importance}</Badge></td>
                            <td className="num px-4 py-2.5 text-right text-steel-300">{e.previous ?? DASH}</td>
                            <td className="num px-4 py-2.5 text-right text-steel-300">{e.forecast ?? DASH}</td>
                            <td className="num px-4 py-2.5 text-right text-chrome">{e.actual ?? DASH}</td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
          <Panel className="overflow-hidden">
            <PanelHeader eyebrow="Earnings" title="Coverage universe · next 3 weeks" actions={<DataSourceBadge meta={earnings.ok ? earnings.meta : null} showTime={false} />} />
            {earnings.ok ? (
              earnings.data.length ? (
                <ul className="max-h-[560px] divide-y divide-line/70 overflow-y-auto">
                  {earnings.data.map((e) => (
                    <li key={`${e.symbol}${e.date}`} className="flex items-center justify-between px-4 py-2.5 text-[12.5px]">
                      <Link href={`/dashboard/symbol/${e.symbol}`} className="min-w-0">
                        <div className="font-mono tracking-wider text-chrome">{e.symbol}</div>
                        <div className="truncate text-[11px] text-steel-500">{e.company}</div>
                      </Link>
                      <div className="text-right text-[11.5px]">
                        <div className="text-steel-200">{fmtDate(e.date)}</div>
                        <div className="text-steel-500">{e.time === "bmo" ? "Before open" : e.time === "amc" ? "After close" : "TBA"}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="No earnings in window" />
              )
            ) : (
              <UnavailableState error={earnings.error} compact />
            )}
          </Panel>
        </div>
        <Panel className="overflow-hidden">
          <PanelHeader eyebrow="TradingView" title="Global economic calendar" description="Rendered by TradingView with TradingView's data." />
          <TradingViewEconomicCalendar height={480} />
        </Panel>
      </MemberBody>
    </>
  );
}
