import "server-only";
import { env } from "@/config/env";
import { cached } from "@/lib/cache";
import { log } from "@/lib/logger";
import { AnthropicAIProvider } from "./anthropic";
import { narrativeIsGrounded } from "./guard";
import { TemplateAIProvider, templateMarketNarrative, templateSetupNarrative } from "./template";
import type { AIProvider, MarketDigest, MarketNarrative, SetupDigest, SetupNarrative } from "./types";

let provider: AIProvider | undefined;

/** Provider factory — swap models/vendors via AI_PROVIDER / AI_MODEL without touching callers. */
export function aiProvider(): AIProvider {
  if (provider) return provider;
  const e = env();
  if (e.AI_PROVIDER === "anthropic" && e.AI_API_KEY) provider = new AnthropicAIProvider(e.AI_API_KEY, e.AI_MODEL);
  else provider = new TemplateAIProvider();
  return provider;
}

export interface Explained<T> {
  narrative: T;
  generatedBy: string;
}

/** Explains a setup; falls back to the deterministic template if AI is unavailable or ungrounded. */
export async function explainSetup(digest: SetupDigest, cacheKey: string): Promise<Explained<SetupNarrative>> {
  const p = aiProvider();
  if (p.id === "template") return { narrative: templateSetupNarrative(digest), generatedBy: "template" };
  const r = await cached(`ai:setup:${cacheKey}`, 30 * 60_000, async () => {
    const n = await p.explainSetup(digest);
    if (!n) return null;
    const check = narrativeIsGrounded([n.whyItAppeared, n.risks, n.catalystSummary, n.thesis], digest);
    if (!check.ok) {
      log.warn("ai", "Rejected ungrounded AI narrative", { symbol: digest.symbol, unknown: check.unknown.slice(0, 5) });
      return null;
    }
    return n;
  }, (v) => v === null);
  return r.value
    ? { narrative: r.value, generatedBy: `${p.id}:${p.model}` }
    : { narrative: templateSetupNarrative(digest), generatedBy: "template (AI unavailable)" };
}

export async function summarizeMarket(digest: MarketDigest, cacheKey: string): Promise<Explained<MarketNarrative>> {
  const p = aiProvider();
  if (p.id === "template") return { narrative: templateMarketNarrative(digest), generatedBy: "template" };
  const r = await cached(`ai:market:${cacheKey}`, 10 * 60_000, async () => {
    const n = await p.summarizeMarket(digest);
    if (!n) return null;
    const check = narrativeIsGrounded([n.headline, n.summary, ...n.watch], digest);
    return check.ok ? n : null;
  }, (v) => v === null);
  return r.value
    ? { narrative: r.value, generatedBy: `${p.id}:${p.model}` }
    : { narrative: templateMarketNarrative(digest), generatedBy: "template (AI unavailable)" };
}
