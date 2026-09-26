import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/action-form";
import { AdminHeader } from "@/components/admin/admin-header";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Textarea } from "@/components/ui/controls";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { FACTOR_LABELS } from "@/config/atlas";
import { db } from "@/db";
import { saveAtlasConfigAction } from "@/features/admin/actions";
import { fmtDateTimeET } from "@/lib/format";
import { getAtlasConfig } from "@/services/atlas/config-store";
import { requirePermission } from "@/services/membership";
import { FACTOR_KEYS } from "@/types/atlas";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Atlas Configuration" };

export default async function AtlasAdmin() {
  await requirePermission("atlas.configure");
  const [cfg, versions] = await Promise.all([getAtlasConfig(), db().atlas.listConfigVersions(12)]);
  const sum = (m: "day" | "swing") => FACTOR_KEYS.reduce((a, k) => a + cfg.weights[m][k], 0);
  return (
    <>
      <AdminHeader title="Atlas configuration" description="Scoring weights, thresholds and universe. Every save creates a new immutable version; setups record the version that scored them." />
      <ActionForm action={saveAtlasConfigAction} submitLabel="Save as new version">
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <Panel className="overflow-x-auto">
            <PanelHeader title="Factor weights" description="Relative weights (0–100). Effective share is weight ÷ total; unavailable factors are re-normalised at scoring time." actions={<Badge size="sm" variant="accent">{cfg.version}</Badge>} />
            <table className="w-full min-w-[560px] text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-[0.12em] text-steel-500">
                  <th className="px-5 py-2.5 font-normal">Factor</th>
                  <th className="px-3 py-2.5 font-normal">Day</th>
                  <th className="px-3 py-2.5 font-normal">Share</th>
                  <th className="px-3 py-2.5 font-normal">Swing</th>
                  <th className="px-3 py-2.5 font-normal">Share</th>
                </tr>
              </thead>
              <tbody>
                {FACTOR_KEYS.map((k) => (
                  <tr key={k} className="border-b border-line/60">
                    <td className="px-5 py-2" title={FACTOR_LABELS[k].description}>
                      <div className="text-steel-100">{FACTOR_LABELS[k].label}</div>
                      <div className="max-w-xs truncate text-[11px] text-steel-500">{FACTOR_LABELS[k].description}</div>
                    </td>
                    <td className="px-3 py-2"><Input name={`w_day_${k}`} type="number" min={0} max={100} step={1} defaultValue={cfg.weights.day[k]} className="h-8 w-20 text-[12px]" /></td>
                    <td className="num px-3 py-2 text-steel-400">{((cfg.weights.day[k] / sum("day")) * 100).toFixed(0)}%</td>
                    <td className="px-3 py-2"><Input name={`w_swing_${k}`} type="number" min={0} max={100} step={1} defaultValue={cfg.weights.swing[k]} className="h-8 w-20 text-[12px]" /></td>
                    <td className="num px-3 py-2 text-steel-400">{((cfg.weights.swing[k] / sum("swing")) * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <div className="space-y-4">
            <Panel>
              <PanelHeader title="Thresholds" />
              <PanelBody className="grid gap-3 sm:grid-cols-2">
                <div><Label htmlFor="minScore">Minimum score</Label><Input id="minScore" name="minScore" type="number" min={0} max={100} defaultValue={cfg.thresholds.minScore} /></div>
                <div><Label htmlFor="minCoverage">Minimum coverage (0–1)</Label><Input id="minCoverage" name="minCoverage" type="number" step="0.05" min={0} max={1} defaultValue={cfg.thresholds.minCoverage} /></div>
                <div><Label htmlFor="maxSetupsPerRun">Max setups per run</Label><Input id="maxSetupsPerRun" name="maxSetupsPerRun" type="number" min={1} max={50} defaultValue={cfg.thresholds.maxSetupsPerRun} /></div>
                <div><Label htmlFor="minOptionOpenInterest">Min option OI</Label><Input id="minOptionOpenInterest" name="minOptionOpenInterest" type="number" min={0} defaultValue={cfg.thresholds.minOptionOpenInterest} /></div>
                <div><Label htmlFor="maxOptionSpreadPct">Max option spread %</Label><Input id="maxOptionSpreadPct" name="maxOptionSpreadPct" type="number" step="0.5" defaultValue={cfg.thresholds.maxOptionSpreadPct} /></div>
              </PanelBody>
            </Panel>
            <Panel>
              <PanelHeader title="Universe & featured tickers" />
              <PanelBody className="space-y-3">
                <div><Label htmlFor="universe">Scan universe ({cfg.universe.length})</Label><Textarea id="universe" name="universe" defaultValue={cfg.universe.join(", ")} rows={5} className="font-mono text-[12px]" /></div>
                <div><Label htmlFor="featuredTickers">Featured tickers</Label><Input id="featuredTickers" name="featuredTickers" defaultValue={cfg.featuredTickers.join(", ")} /></div>
              </PanelBody>
            </Panel>
            <Panel>
              <PanelHeader title="Version history" />
              <ul className="divide-y divide-line/60">
                {versions.length ? versions.map((vv) => (
                  <li key={vv.version} className="flex items-center justify-between px-5 py-2.5 text-[12px]">
                    <span className="font-mono text-steel-200">{vv.version}</span>
                    <span className="text-steel-500">{fmtDateTimeET(vv.updatedAt)} {vv.updatedBy ? `· ${vv.updatedBy}` : ""} {vv.active ? <Badge size="sm" variant="up">active</Badge> : null}</span>
                  </li>
                )) : <li className="px-5 py-3 text-[12px] text-steel-500">Running on built-in defaults ({cfg.version}).</li>}
              </ul>
            </Panel>
          </div>
        </div>
      </ActionForm>
    </>
  );
}
