import "server-only";
import { cached } from "@/lib/cache";
import type { AtlasMode } from "@/types/atlas";
import { getAtlasConfig } from "./config-store";
import { analyzeSymbol, getMarketContext } from "./engine";

export interface ScannerRow {
  symbol: string;
  name: string;
  sector: string | null;
  price: number;
  changePct: number | null;
  /** Populated when the provider supplies it; null otherwise. */
  marketCap: number | null;
  direction: "long" | "short";
  score: number;
  coverage: number;
  qualifies: boolean;
  trend: string;
  momentum: string;
  volumeState: string;
  volatilityState: string;
  rvol: number | null;
  rsi: number | null;
  rs20: number | null;
  atrPct: number | null;
  avgDollarVolume: number | null;
  breakout: boolean;
  breakdown: boolean;
  pctFromHigh52: number | null;
  marketAlignment: string;
}

/** Full-universe Atlas analysis (not thresholded) for the Market Scanner. */
export async function runScanner(mode: AtlasMode): Promise<{ rows: ScannerRow[]; configVersion: string; minScore: number; generatedAt: string }> {
  const cfg = await getAtlasConfig();
  const ctx = await getMarketContext();
  const r = await cached(`atlas:scanner:${mode}:${ctx.session}:${cfg.version}`, mode === "day" ? 3 * 60_000 : 15 * 60_000, async () => {
    const analyses = await Promise.all(cfg.universe.map((s) => analyzeSymbol(s, mode, ctx, cfg, { withOptions: false, withExplanation: false }).catch(() => null)));
    const rows: ScannerRow[] = analyses
      .filter((a): a is NonNullable<typeof a> => a !== null)
      .map(({ setup: s, features: f, qualifies }) => ({
        symbol: s.symbol,
        name: s.name,
        sector: s.sector,
        price: s.price,
        changePct: f.changePct,
        marketCap: null,
        direction: s.direction,
        score: s.score.value,
        coverage: s.score.coverage,
        qualifies,
        trend: s.trend,
        momentum: s.momentum,
        volumeState: s.volumeState,
        volatilityState: s.volatilityState,
        rvol: f.rvol,
        rsi: f.rsi14 !== null ? Math.round(f.rsi14 * 10) / 10 : null,
        rs20: f.rs20 !== null ? Math.round(f.rs20 * 100) / 100 : null,
        atrPct: f.atrPct !== null ? Math.round(f.atrPct * 100) / 100 : null,
        avgDollarVolume: f.avgDollarVolume,
        breakout: f.breakout20,
        breakdown: f.breakdown20,
        pctFromHigh52: f.pctFromHigh52 !== null ? Math.round(f.pctFromHigh52 * 10) / 10 : null,
        marketAlignment: s.marketAlignment,
      }))
      .sort((a, b) => b.score - a.score);
    return { rows, configVersion: cfg.version, minScore: cfg.thresholds.minScore, generatedAt: new Date().toISOString() };
  });
  return r.value;
}
