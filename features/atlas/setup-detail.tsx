"use client";

import { ArrowUpRight, CheckCircle2, CircleDashed, ExternalLink } from "lucide-react";
import Link from "next/link";
import { DirectionBadge, FactorBars, LevelsRow, StatusPill, TRADE_TYPE_LABEL } from "@/components/atlas/primitives";
import { PriceChart } from "@/components/charts/price-chart";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/controls";
import { ScoreRing } from "@/components/ui/score-ring";
import { fmtDate, fmtDateTimeET, fmtInt, fmtIv, fmtMoney, fmtPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AtlasSetup } from "@/types/atlas";

const CATALYST_LABEL: Record<string, string> = {
  earnings: "Earnings",
  "economic-event": "Economic event",
  news: "News",
  "sector-move": "Sector movement",
  "technical-breakout": "Technical breakout",
  "options-activity": "Options activity",
};

/** Full, transparent setup view: why it appeared, risks, catalysts, confirmation, factors, options, lifecycle. */
export function SetupDetail({ setup, showChart = true }: { setup: AtlasSetup; showChart?: boolean }) {
  const s = setup;
  const o = s.options;
  return (
    <div className="space-y-6 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[22px] tracking-[0.05em] text-chrome">{s.symbol}</span>
            <DirectionBadge direction={s.direction} />
            <Badge variant="outline" size="sm">{s.mode === "day" ? "Day trade" : "Swing"}</Badge>
            <Badge variant="outline" size="sm">{TRADE_TYPE_LABEL[s.tradeType]}</Badge>
            {s.dataMode === "mock" ? <Badge variant="mock" size="sm">Simulated</Badge> : null}
          </div>
          <p className="mt-1 text-[13px] text-steel-400">
            {s.name}
            {s.sector ? ` · ${s.sector}` : ""} · last <span className="num text-steel-200">{fmtPrice(s.price)}</span>
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-steel-500">
            <StatusPill status={s.status} /> · generated {fmtDateTimeET(s.generatedAt)} · expires {fmtDateTimeET(s.expiresAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-[11px] text-steel-500">
            <div>Atlas score</div>
            <div>Coverage {Math.round(s.score.coverage * 100)}%</div>
            <div>Grade {s.score.grade}</div>
          </div>
          <ScoreRing value={s.score.value} size={64} coverage={s.score.coverage} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-md border border-line bg-graphite-950 p-3 text-[12px] sm:grid-cols-4">
        {[
          ["Trend", s.trend],
          ["Momentum", s.momentum],
          ["Volume", s.volumeState],
          ["Volatility", s.volatilityState],
          ["Market alignment", s.marketAlignment],
          ["Horizon", s.holdingHorizon],
          ["Reward / risk", s.riskReward !== null ? `${s.riskReward}:1` : "—"],
          ["Config", s.score.configVersion],
        ].map(([k, v]) => (
          <div key={k}>
            <div className="text-steel-500">{k}</div>
            <div className={cn("mt-0.5 text-steel-100", k !== "Config" && k !== "Horizon" && "capitalize")}>{v}</div>
          </div>
        ))}
      </div>

      <LevelsRow setup={s} className="rounded-md border border-line p-3" />

      {showChart ? (
        <div className="overflow-hidden rounded-md border border-line">
          <PriceChart
            symbol={s.symbol}
            initialRange={s.mode === "day" ? "1D" : "3M"}
            height={300}
            defaultIndicators={s.mode === "day" ? ["vwap", "ema9", "volume"] : ["sma20", "sma50", "volume"]}
            levels={[
              { price: (s.entry.low + s.entry.high) / 2, label: "Entry", kind: "entry" },
              { price: s.direction === "long" ? s.target.low : s.target.high, label: "Target", kind: "target" },
              { price: s.invalidation, label: "Invalidation", kind: "stop" },
            ]}
          />
        </div>
      ) : null}

      <Tabs defaultValue="why">
        <TabsList className="overflow-x-auto scrollbar-none">
          <TabsTrigger value="why">Why it appeared</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
          <TabsTrigger value="catalysts">Catalysts</TabsTrigger>
          <TabsTrigger value="confirm">Confirmation</TabsTrigger>
          <TabsTrigger value="factors">Factors</TabsTrigger>
          {o ? <TabsTrigger value="options">Options</TabsTrigger> : null}
          <TabsTrigger value="inputs">Inputs</TabsTrigger>
        </TabsList>
        <TabsContent value="why" className="pt-4">
          <p className="text-[14px] leading-relaxed text-steel-200">{s.explanation.whyItAppeared}</p>
          <p className="mt-3 text-[13.5px] leading-relaxed text-steel-300">{s.explanation.thesis}</p>
          <p className="mt-4 text-[11px] text-steel-500">
            Explanation by {s.explanation.generatedBy} from the structured inputs shown in the Inputs tab. The score is an analytical ranking, not a prediction.
          </p>
        </TabsContent>
        <TabsContent value="risks" className="pt-4">
          <p className="text-[14px] leading-relaxed text-steel-200">{s.explanation.risks}</p>
          <div className="mt-4 space-y-2">
            {s.score.components
              .filter((c) => c.signal === "adverse")
              .map((c) => (
                <div key={c.key} className="rounded-md border border-down/20 bg-down-soft/40 px-3 py-2 text-[12.5px]">
                  <span className="text-down">{c.label}</span> <span className="text-steel-300">— {c.evidence.join(" ")}</span>
                </div>
              ))}
          </div>
        </TabsContent>
        <TabsContent value="catalysts" className="pt-4">
          <p className="mb-3 text-[13.5px] text-steel-300">{s.explanation.catalystSummary}</p>
          {s.catalysts.length ? (
            <ul className="divide-y divide-line rounded-md border border-line">
              {s.catalysts.map((c, i) => (
                <li key={i} className="flex items-start justify-between gap-3 px-3 py-2.5 text-[12.5px]">
                  <div>
                    <Badge size="sm" variant="outline">{CATALYST_LABEL[c.kind] ?? c.kind}</Badge>
                    <div className="mt-1 text-steel-100">{c.label}</div>
                  </div>
                  {c.kind === "news" && c.reference ? (
                    <Link href={`/dashboard/news/${encodeURIComponent(c.reference)}`} className="shrink-0 text-steel-400 hover:text-chrome" aria-label="Open article">
                      <ArrowUpRight className="size-4" />
                    </Link>
                  ) : c.date ? (
                    <span className="num shrink-0 text-[11px] text-steel-500">{fmtDate(c.date)}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-steel-500">No catalysts identified.</p>
          )}
        </TabsContent>
        <TabsContent value="confirm" className="pt-4">
          <ul className="space-y-2">
            {s.confirmations.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2 text-[12.5px]">
                <span className={cn("flex items-center gap-2", c.met ? "text-steel-100" : "text-steel-500")}>
                  {c.met ? <CheckCircle2 className="size-4 text-up" /> : <CircleDashed className="size-4" />} {c.label}
                </span>
                <span className="num text-[11.5px] text-steel-400">{c.detail}</span>
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="factors" className="space-y-4 pt-4">
          <FactorBars components={s.score.components} showWeights />
          <div className="divide-y divide-line rounded-md border border-line">
            {s.score.components.map((c) => (
              <details key={c.key} className="group px-3 py-2">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[12.5px] text-steel-200">
                  <span>{c.label}</span>
                  <span className={cn("num text-[11.5px]", c.signal === "supportive" ? "text-up" : c.signal === "adverse" ? "text-down" : "text-steel-400")}>
                    {c.score ?? "n/a"} · {c.signal}
                  </span>
                </summary>
                <ul className="mt-2 space-y-1 text-[12px] text-steel-400">
                  {c.evidence.map((e, i) => (
                    <li key={i}>· {e}</li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </TabsContent>
        {o ? (
          <TabsContent value="options" className="space-y-3 pt-4">
            <div className="overflow-x-auto rounded-md border border-line">
              <table className="w-full min-w-[640px] text-[12px]">
                <thead>
                  <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-[0.12em] text-steel-500">
                    {["Leg", "Strike", "Expiration", "DTE", "Delta", "IV", "OI", "Volume", "Bid / Ask"].map((h) => (
                      <th key={h} className="px-3 py-2 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {o.legs.map((l) => (
                    <tr key={l.contract} className="border-b border-line/60">
                      <td className="px-3 py-2">
                        <span className={l.action === "buy" ? "text-up" : "text-down"}>{l.action.toUpperCase()}</span> {l.right}
                      </td>
                      <td className="num px-3 py-2">{fmtPrice(l.strike)}</td>
                      <td className="num px-3 py-2">{l.expiration}</td>
                      <td className="num px-3 py-2">{l.dte}</td>
                      <td className="num px-3 py-2">{l.delta ?? "n/a"}</td>
                      <td className="num px-3 py-2">{fmtIv(l.iv)}</td>
                      <td className="num px-3 py-2">{fmtInt(l.openInterest)}</td>
                      <td className="num px-3 py-2">{fmtInt(l.volume)}</td>
                      <td className="num px-3 py-2">
                        {fmtPrice(l.bid, { decimals: 2 })} / {fmtPrice(l.ask, { decimals: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-5">
              {[
                ["IV rank", o.ivRank ?? "n/a"],
                ["Bid/ask spread", o.spreadPct !== null ? `${o.spreadPct}%` : "n/a"],
                [o.estimatedCredit !== null ? "Est. credit" : "Est. debit", fmtMoney(((o.estimatedCredit ?? o.estimatedDebit) ?? null) === null ? null : (o.estimatedCredit ?? o.estimatedDebit)! * 100)],
                ["Est. max risk", fmtMoney(o.maxRisk === null ? null : o.maxRisk * 100)],
                ["Est. max reward", o.maxReward === null ? "Uncapped" : fmtMoney(o.maxReward * 100)],
              ].map(([k, v]) => (
                <div key={String(k)}>
                  <div className="text-steel-500">{k}</div>
                  <div className="num mt-0.5 text-steel-100">{v}</div>
                </div>
              ))}
            </div>
            <p className="text-[11.5px] text-steel-500">{o.liquidityNote} Per-contract estimates from provider quotes at generation time; fills may differ.</p>
          </TabsContent>
        ) : null}
        <TabsContent value="inputs" className="pt-4">
          <p className="mb-2 text-[12px] text-steel-400">Structured inputs retained with this explanation (the AI never sees anything else):</p>
          <pre className="max-h-80 overflow-auto rounded-md border border-line bg-graphite-950 p-3 font-mono text-[11px] leading-relaxed text-steel-300">{JSON.stringify(s.explanation.inputsDigest, null, 2)}</pre>
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-[11px] text-steel-500">Informational analysis only — not a recommendation to buy or sell.</p>
        <Link href={`/dashboard/symbol/${s.symbol}`} className="inline-flex items-center gap-1.5 text-[12.5px] text-polar-300 hover:text-polar-300/80">
          View supporting intelligence <ExternalLink className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
