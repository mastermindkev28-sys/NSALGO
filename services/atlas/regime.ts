/**
 * Market regime engine — independent module. Classifies the tape from
 * configurable, observable inputs and always returns its reasoning.
 * Missing inputs are reported as "unavailable" and reduce coverage.
 */
import type { MarketRegime, RegimeSignal } from "@/types/atlas";
import type { Bar, BreadthSnapshot, SectorPerformance } from "@/types/market";
import { efficiencyRatio, pctReturn, realizedVol, sma } from "./indicators";

export interface RegimeInputs {
  spy: Bar[] | null;
  qqq: Bar[] | null;
  iwm: Bar[] | null;
  vix: { last: number | null; changePercent: number | null; fiveDayChange: number | null } | null;
  breadth: BreadthSnapshot | null;
  sectors: SectorPerformance[] | null;
  tenYearChange: number | null; // basis points today
}

const fmt = (n: number, d = 1) => (n >= 0 ? `+${n.toFixed(d)}` : n.toFixed(d));

export function computeRegime(i: RegimeInputs): MarketRegime {
  const signals: RegimeSignal[] = [];
  let score = 0;
  let measured = 0;
  const total = 7;

  // 1. Index trend
  if (i.spy && i.spy.length > 200) {
    const c = i.spy.map((b) => b.close);
    const last = c[c.length - 1]!;
    const s50 = sma(c, 50)!;
    const s200 = sma(c, 200)!;
    const above = (last > s50 ? 1 : 0) + (last > s200 ? 1 : 0) + (s50 > s200 ? 1 : 0);
    const reading = above >= 2 ? "positive" : above === 0 ? "negative" : "neutral";
    score += above >= 2 ? 20 : above === 0 ? -20 : 0;
    measured++;
    signals.push({
      label: "S&P 500 trend",
      value: `${last > s50 ? "Above" : "Below"} 50-day · ${last > s200 ? "above" : "below"} 200-day`,
      reading,
    });
  } else signals.push({ label: "S&P 500 trend", value: "Data unavailable", reading: "unavailable" });

  // 2. Volatility (VIX level and direction; realised vol fallback)
  let volRegime: MarketRegime["volatility"] = "normal-volatility";
  if (i.vix?.last != null) {
    const lvl = i.vix.last;
    const chg = i.vix.fiveDayChange ?? i.vix.changePercent ?? 0;
    volRegime = lvl >= 22 ? "high-volatility" : lvl <= 15 ? "low-volatility" : "normal-volatility";
    const declining = chg < -3;
    const rising = chg > 5;
    score += lvl < 18 && !rising ? 15 : lvl > 25 || rising ? -15 : 0;
    measured++;
    signals.push({
      label: "VIX",
      value: `${lvl.toFixed(2)} · ${declining ? "declining" : rising ? "rising" : "stable"} (${fmt(chg)}% 5-day)`,
      reading: lvl < 18 && !rising ? "positive" : lvl > 25 || rising ? "negative" : "neutral",
    });
  } else if (i.spy && i.spy.length > 21) {
    const rv = realizedVol(i.spy.map((b) => b.close), 20);
    if (rv !== null) {
      volRegime = rv > 22 ? "high-volatility" : rv < 12 ? "low-volatility" : "normal-volatility";
      measured++;
      score += rv < 15 ? 10 : rv > 25 ? -10 : 0;
      signals.push({ label: "Realised volatility (SPY 20d)", value: `${rv.toFixed(1)}% annualised`, reading: rv < 15 ? "positive" : rv > 25 ? "negative" : "neutral" });
    }
  } else signals.push({ label: "VIX", value: "Data unavailable", reading: "unavailable" });

  // 3. Breadth
  if (i.breadth?.advancers != null && i.breadth.decliners != null) {
    const { advancers: a, decliners: d } = i.breadth;
    const ratio = d > 0 ? a / d : a;
    measured++;
    score += ratio > 1.4 ? 15 : ratio < 0.7 ? -15 : 0;
    signals.push({
      label: "Index breadth",
      value: `${a} advancing / ${d} declining`,
      reading: ratio > 1.4 ? "positive" : ratio < 0.7 ? "negative" : "neutral",
    });
  } else signals.push({ label: "Index breadth", value: "Data unavailable", reading: "unavailable" });

  // 4. Growth leadership: Nasdaq relative strength vs S&P
  if (i.qqq && i.spy && i.qqq.length > 21 && i.spy.length > 21) {
    const rs = (pctReturn(i.qqq.map((b) => b.close), 10) ?? 0) - (pctReturn(i.spy.map((b) => b.close), 10) ?? 0);
    measured++;
    score += rs > 0.5 ? 10 : rs < -0.5 ? -10 : 0;
    signals.push({ label: "Nasdaq relative strength (10d)", value: `${fmt(rs)} pts vs S&P 500`, reading: rs > 0.5 ? "positive" : rs < -0.5 ? "negative" : "neutral" });
  } else signals.push({ label: "Nasdaq relative strength", value: "Data unavailable", reading: "unavailable" });

  // 5. Small-cap participation
  if (i.iwm && i.iwm.length > 21 && i.spy && i.spy.length > 21) {
    const rs = (pctReturn(i.iwm.map((b) => b.close), 20) ?? 0) - (pctReturn(i.spy.map((b) => b.close), 20) ?? 0);
    measured++;
    score += rs > 1 ? 8 : rs < -2 ? -8 : 0;
    signals.push({ label: "Small-cap participation (20d)", value: `${fmt(rs)} pts vs S&P 500`, reading: rs > 1 ? "positive" : rs < -2 ? "negative" : "neutral" });
  } else signals.push({ label: "Small-cap participation", value: "Data unavailable", reading: "unavailable" });

  // 6. Sector breadth
  if (i.sectors && i.sectors.some((s) => s.changePercent !== null)) {
    const up = i.sectors.filter((s) => (s.changePercent ?? 0) > 0).length;
    const n = i.sectors.filter((s) => s.changePercent !== null).length;
    measured++;
    score += up / n >= 0.64 ? 12 : up / n <= 0.36 ? -12 : 0;
    signals.push({ label: "Sector breadth", value: `${up} of ${n} sectors higher`, reading: up / n >= 0.64 ? "positive" : up / n <= 0.36 ? "negative" : "neutral" });
  } else signals.push({ label: "Sector breadth", value: "Data unavailable", reading: "unavailable" });

  // 7. Rates pressure
  if (i.tenYearChange !== null) {
    const bp = i.tenYearChange;
    measured++;
    score += bp < -3 ? 5 : bp > 7 ? -8 : 0;
    signals.push({ label: "10-year yield", value: `${fmt(bp, 0)} bp today`, reading: bp < -3 ? "positive" : bp > 7 ? "negative" : "neutral" });
  } else signals.push({ label: "10-year yield", value: "Data unavailable", reading: "unavailable" });

  // Structure: trend vs range from SPY efficiency ratio
  let structure: MarketRegime["structure"] = "range";
  if (i.spy && i.spy.length > 21) {
    const er = efficiencyRatio(i.spy.map((b) => b.close), 20);
    structure = er !== null && er > 0.3 ? "trend" : "range";
  }

  const coverage = measured / total;
  const finalScore = measured ? Math.round(score) : null;
  const risk: MarketRegime["risk"] = finalScore === null ? "mixed" : finalScore >= 25 ? "risk-on" : finalScore <= -25 ? "risk-off" : "mixed";
  const riskEnvironment: MarketRegime["riskEnvironment"] =
    risk === "risk-on" && volRegime !== "high-volatility" ? "constructive" : risk === "risk-off" || volRegime === "high-volatility" ? "defensive" : "cautious";

  const pos = signals.filter((s) => s.reading === "positive").map((s) => s.label);
  const neg = signals.filter((s) => s.reading === "negative").map((s) => s.label);
  const label = risk === "risk-on" ? "Risk-On" : risk === "risk-off" ? "Risk-Off" : "Mixed";
  const summary =
    finalScore === null
      ? "Regime unavailable — required market inputs are missing."
      : `${label}, ${structure === "trend" ? "trending" : "range-bound"} tape with ${volRegime.replace("-", " ")}. ` +
        (pos.length ? `Supportive: ${pos.slice(0, 3).join(", ")}. ` : "") +
        (neg.length ? `Headwinds: ${neg.slice(0, 3).join(", ")}.` : "");

  return {
    risk,
    volatility: volRegime,
    structure,
    riskEnvironment,
    score: finalScore,
    signals,
    summary: summary.trim(),
    computedAt: new Date().toISOString(),
    coverage,
  };
}
