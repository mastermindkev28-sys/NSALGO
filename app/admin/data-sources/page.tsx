import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/admin-header";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { env } from "@/config/env";
import { providers } from "@/providers/registry";
import type { ProviderHealth } from "@/providers/types";
import { aiProvider } from "@/services/ai";
import { billingConfigured } from "@/services/billing";
import { requirePermission } from "@/services/membership";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Data Sources" };

const SLOTS = [
  { slot: "market", name: "Market data", iface: "MarketDataProvider", env: ["MARKET_DATA_PROVIDER", "MARKET_DATA_API_KEY", "MARKET_DATA_DELAY_MINUTES"], note: "Quotes, history, status, movers, sectors, breadth." },
  { slot: "options", name: "Options data", iface: "OptionsDataProvider", env: ["OPTIONS_DATA_PROVIDER", "OPTIONS_API_KEY", "UNUSUAL_WHALES_API_KEY"], note: "Chains, greeks, OI. Classified flow requires a flow-licensed vendor (Unusual Whales or Polygon trades)." },
  { slot: "news", name: "News", iface: "NewsProvider", env: ["NEWS_PROVIDER", "NEWS_API_KEY"], note: "Licensed feed; only headline, summary, link and image URL are stored." },
  { slot: "insiders", name: "Insider filings", iface: "InsiderDataProvider", env: ["INSIDER_PROVIDER", "SEC_API_CONFIG", "UNUSUAL_WHALES_API_KEY"], note: "Forms 3/4/5 from SEC EDGAR (fair-access throttled) or Unusual Whales." },
  { slot: "institutional", name: "Institutional / 13F", iface: "InstitutionalDataProvider", env: ["SEC_API_CONFIG"], note: "13F-HR filings for tracked filer CIKs." },
  { slot: "congress", name: "Congressional disclosures", iface: "CongressionalDisclosureProvider", env: ["CONGRESS_PROVIDER", "CONGRESS_API_BASE_URL", "CONGRESS_API_KEY", "UNUSUAL_WHALES_API_KEY"], note: "Licensed aggregator of House/Senate PTRs, or Unusual Whales." },
  { slot: "calendar", name: "Economic calendar", iface: "EconomicCalendarProvider", env: ["ECONOMIC_CALENDAR_PROVIDER", "ECONOMIC_CALENDAR_API_KEY", "UNUSUAL_WHALES_API_KEY"], note: "Forecast/actual shown only when published by the source." },
] as const;

async function withTimeout(p: Promise<ProviderHealth>, ms = 6000): Promise<ProviderHealth> {
  return Promise.race([p, new Promise<ProviderHealth>((r) => setTimeout(() => r({ ok: false, latencyMs: ms, message: "Health check timed out", checkedAt: new Date().toISOString() }), ms))]);
}

export default async function DataSourcesAdmin() {
  await requirePermission("providers.view");
  const reg = providers();
  const e = env();
  const checks = await Promise.all(SLOTS.map((s) => withTimeout(reg[s.slot].healthCheck())));
  const ai = aiProvider();
  const aiHealth = await ai.healthCheck().catch(() => ({ ok: false, message: "Health check failed" }));
  const bill = billingConfigured();
  const set = (k: string) => Boolean((process.env[k] ?? "").trim());
  return (
    <>
      <AdminHeader title="Data sources" description="Every vendor sits behind an interface and can be replaced by adding an adapter in providers/ and a case in providers/registry.ts. Credential values are never displayed." actions={<Badge variant={e.DATA_MODE === "mock" ? "mock" : "up"}>DATA_MODE={e.DATA_MODE}</Badge>} />
      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-[12.5px]">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-[0.12em] text-steel-500">
              {["Slot", "Interface", "Active provider", "Health", "Latency", "Configuration", "Notes"].map((h) => <th key={h} className="px-4 py-2.5 font-normal">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map((s, i) => {
              const p = reg[s.slot];
              const h = checks[i]!;
              return (
                <tr key={s.slot} className="border-b border-line/60 align-top">
                  <td className="px-4 py-3 text-steel-50">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-steel-400">{s.iface}</td>
                  <td className="px-4 py-3">
                    <div className="text-steel-100">{p.label}</div>
                    <div className="font-mono text-[10.5px] text-steel-500">{p.id}</div>
                    {p.isMock ? <Badge size="sm" variant="mock" className="mt-1">simulated</Badge> : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge size="sm" variant={h.ok ? "up" : "down"}>{h.ok ? "healthy" : "unavailable"}</Badge>
                    <div className="mt-1 max-w-[220px] text-[11px] text-steel-500">{h.message}</div>
                  </td>
                  <td className="num px-4 py-3 text-steel-300">{h.latencyMs === null ? "—" : `${h.latencyMs} ms`}</td>
                  <td className="px-4 py-3">
                    {s.env.map((k) => (
                      <div key={k} className="flex items-center gap-1.5 font-mono text-[10.5px]">
                        <span className={set(k) ? "text-up" : "text-steel-500"}>{set(k) ? "●" : "○"}</span>
                        <span className="text-steel-400">{k}</span>
                      </div>
                    ))}
                  </td>
                  <td className="max-w-[260px] px-4 py-3 text-[11.5px] text-steel-400">{s.note}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <PanelHeader title="AI provider" actions={<Badge size="sm" variant={aiHealth.ok ? "up" : "down"}>{aiHealth.ok ? "healthy" : "unavailable"}</Badge>} />
          <div className="space-y-1 px-5 py-4 text-[12.5px]">
            <div className="text-steel-100">{ai.id} · <span className="font-mono text-[11.5px]">{ai.model}</span></div>
            <div className="text-steel-500">{aiHealth.message}</div>
            <p className="pt-2 text-[11.5px] text-steel-500">AI_PROVIDER / AI_API_KEY / AI_MODEL. Without a key, explanations use the deterministic template generator. AI output is checked against its input digest before display.</p>
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Billing" actions={<Badge size="sm" variant={bill.ready ? "up" : "warn"}>{bill.provider}</Badge>} />
          <div className="space-y-1 px-5 py-4 text-[12.5px] text-steel-400">
            {bill.issues.length ? bill.issues.map((i) => <p key={i}>{i}</p>) : <p>Stripe configured. Webhook endpoint: /api/stripe/webhook</p>}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Yahoo Finance" actions={<Badge size="sm" variant="outline">not wired</Badge>} />
          <p className="px-5 py-4 text-[12px] leading-relaxed text-steel-400">No Yahoo adapter is active. Yahoo&apos;s public endpoints are undocumented and not licensed for commercial redistribution. With a licensed agreement, implement MarketDataProvider in providers/ and register it — nothing else changes.</p>
        </Panel>
      </div>
    </>
  );
}
