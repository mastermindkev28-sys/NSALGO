import "server-only";
import { db } from "@/db";
import { log } from "@/lib/logger";
import type { Alert } from "@/types/domain";
import { symbolIntelligence } from "./atlas/engine";
import { getFlow, listInsiders, listNews } from "./intel";
import { getQuotes } from "./market";

/**
 * Alert evaluation (scheduled). Starts with in-app notifications; the
 * `channel` field is ready for email/push fan-out as future extensions.
 * Each alert fires at most once per cooldown window.
 */
const COOLDOWN_MS = 6 * 3600_000;

async function notify(a: Alert, title: string, body: string, href: string | null) {
  await db().notifications.create({ userId: a.userId, title, body, href, kind: a.kind });
  await db().alerts.markTriggered(a.id, new Date().toISOString());
}

export async function evaluateAlerts(): Promise<{ evaluated: number; fired: number }> {
  const alerts = (await db().alerts.listActive()).filter((a) => !a.lastTriggeredAt || Date.now() - Date.parse(a.lastTriggeredAt) > COOLDOWN_MS);
  if (!alerts.length) return { evaluated: 0, fired: 0 };
  const symbols = [...new Set(alerts.map((a) => a.symbol).filter((s): s is string => !!s))];
  const quotes = await getQuotes(symbols);
  const q = new Map(quotes.ok ? quotes.data.map((x) => [x.symbol, x]) : []);
  let fired = 0;
  for (const a of alerts) {
    try {
      const sym = a.symbol ?? "";
      const quote = q.get(sym);
      switch (a.kind) {
        case "price-above":
          if (quote?.last != null && a.threshold != null && quote.last >= a.threshold) {
            await notify(a, `${sym} above ${a.threshold}`, `${sym} traded at ${quote.last}.`, `/dashboard/symbol/${sym}`);
            fired++;
          }
          break;
        case "price-below":
          if (quote?.last != null && a.threshold != null && quote.last <= a.threshold) {
            await notify(a, `${sym} below ${a.threshold}`, `${sym} traded at ${quote.last}.`, `/dashboard/symbol/${sym}`);
            fired++;
          }
          break;
        case "unusual-volume":
          if (quote?.volume && quote.avgVolume && quote.volume > quote.avgVolume * (a.threshold ?? 2)) {
            await notify(a, `${sym} unusual volume`, `Volume ${quote.volume.toLocaleString()} vs ${quote.avgVolume.toLocaleString()} average.`, `/dashboard/symbol/${sym}`);
            fired++;
          }
          break;
        case "atlas-score": {
          const intel = await symbolIntelligence(sym);
          const best = Math.max(intel.day?.setup.score.value ?? 0, intel.swing?.setup.score.value ?? 0);
          if (a.threshold != null && best >= a.threshold) {
            await notify(a, `${sym} Atlas score ${best}`, `Atlas score crossed your ${a.threshold} threshold. Rankings are analytical, not predictive.`, `/dashboard/symbol/${sym}`);
            fired++;
          }
          break;
        }
        case "options-flow": {
          const f = await getFlow({ symbol: sym, minPremium: a.threshold ?? 1_000_000, limit: 5 });
          if (f.ok && f.data.length) {
            await notify(a, `${sym} large options print`, `${f.data.length} print(s) above your premium threshold today.`, `/dashboard/flow`);
            fired++;
          }
          break;
        }
        case "news": {
          const n = await listNews({ ticker: sym, limit: 3 });
          const fresh = n.ok ? n.data.filter((x) => Date.now() - Date.parse(x.publishedAt) < 3600_000) : [];
          if (fresh[0]) {
            await notify(a, `${sym} in the news`, fresh[0].headline, `/dashboard/news/${encodeURIComponent(fresh[0].id)}`);
            fired++;
          }
          break;
        }
        case "insider": {
          const i = await listInsiders({ ticker: sym, limit: 5 });
          const today = new Date().toISOString().slice(0, 10);
          const recent = i.ok ? i.data.filter((x) => x.filingDate >= today) : [];
          if (recent.length) {
            await notify(a, `${sym} insider filing`, `${recent.length} new Form 4 transaction(s).`, `/dashboard/insiders?ticker=${sym}`);
            fired++;
          }
          break;
        }
        default:
          break;
      }
    } catch (e) {
      log.warn("alerts", "Alert evaluation failed", { id: a.id, error: (e as Error).message });
    }
  }
  return { evaluated: alerts.length, fired };
}
