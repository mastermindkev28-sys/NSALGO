import "server-only";
import { DEFAULT_ATLAS_CONFIG } from "@/config/atlas";
import { db } from "@/db";
import { cacheStore } from "@/lib/cache";
import type { AtlasConfig } from "@/types/atlas";
import { FACTOR_KEYS } from "@/types/atlas";

/** Active Atlas configuration (admin-managed, versioned). Falls back to defaults. */
export async function getAtlasConfig(): Promise<AtlasConfig> {
  const hit = cacheStore.get<AtlasConfig>("atlas:config");
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  let cfg = DEFAULT_ATLAS_CONFIG;
  try {
    const stored = await db().atlas.getActiveConfig();
    if (stored) cfg = normalise(stored);
  } catch {
    /* fall back to defaults if the store is unavailable */
  }
  cacheStore.set("atlas:config", cfg, 60_000);
  return cfg;
}

export async function saveAtlasConfig(next: AtlasConfig, actorEmail: string) {
  const cfg = normalise({ ...next, version: `${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}-${actorEmail.split("@")[0]}`, updatedAt: new Date().toISOString(), updatedBy: actorEmail });
  await db().atlas.saveConfig(cfg);
  cacheStore.delete("atlas:config");
  return cfg;
}

function normalise(c: AtlasConfig): AtlasConfig {
  const fill = (w: Partial<Record<string, number>> | undefined) =>
    Object.fromEntries(FACTOR_KEYS.map((k) => [k, Math.max(0, Math.min(100, Number(w?.[k] ?? DEFAULT_ATLAS_CONFIG.weights.swing[k])))])) as AtlasConfig["weights"]["day"];
  return {
    ...DEFAULT_ATLAS_CONFIG,
    ...c,
    weights: { day: fill(c.weights?.day), swing: fill(c.weights?.swing) },
    thresholds: { ...DEFAULT_ATLAS_CONFIG.thresholds, ...c.thresholds },
    universe: c.universe?.length ? c.universe : DEFAULT_ATLAS_CONFIG.universe,
    featuredTickers: c.featuredTickers?.length ? c.featuredTickers : DEFAULT_ATLAS_CONFIG.featuredTickers,
  };
}
