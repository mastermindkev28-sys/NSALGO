/**
 * Fabrication guard: every number an AI narrative states must trace back to
 * the structured digest it was given. Small ordinals used in indicator names
 * (e.g. "20-day", "RSI(14)") are allowed when present in the digest text.
 */
const NUM = /-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?/g;

function numbersIn(text: string): number[] {
  return (text.match(NUM) ?? []).map((s) => Number(s.replaceAll(",", ""))).filter((n) => Number.isFinite(n));
}

export function allowedNumbers(digest: unknown): number[] {
  const json = JSON.stringify(digest);
  const base = numbersIn(json);
  const extra: number[] = [];
  for (const n of base) {
    extra.push(Math.abs(n), Math.round(n), Math.round(n * 10) / 10, Math.round(n * 100) / 100, Math.round(n * 100)); // 0.62 → 62 (%)
  }
  return [...base, ...extra];
}

export function narrativeIsGrounded(texts: string[], digest: unknown): { ok: boolean; unknown: number[] } {
  const allowed = allowedNumbers(digest);
  const unknown: number[] = [];
  for (const t of texts) {
    for (const n of numbersIn(t)) {
      const a = Math.abs(n);
      const hit = allowed.some((x) => {
        const b = Math.abs(x);
        return a === b || (b !== 0 && Math.abs(a - b) / b < 0.006) || Math.abs(a - b) < 0.011;
      });
      if (!hit) unknown.push(n);
    }
  }
  return { ok: unknown.length === 0, unknown };
}
