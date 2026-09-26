/** Black–Scholes helpers (no dividends). Used for mock chains and for estimating greeks when a provider omits them. */

export function normCdf(x: number): number {
  // Abramowitz–Stegun 7.1.26 via erf
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * z);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
  return 0.5 * (1 + sign * y);
}

export function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export interface BsResult {
  price: number;
  delta: number;
  gamma: number;
  theta: number; // per calendar day
  vega: number; // per 1 vol point
}

export function blackScholes(
  right: "call" | "put",
  spot: number,
  strike: number,
  years: number,
  vol: number,
  rate = 0.04,
): BsResult {
  const t = Math.max(years, 1 / 365 / 24);
  const sqrtT = Math.sqrt(t);
  const d1 = (Math.log(spot / strike) + (rate + 0.5 * vol * vol) * t) / (vol * sqrtT);
  const d2 = d1 - vol * sqrtT;
  const disc = Math.exp(-rate * t);
  const gamma = normPdf(d1) / (spot * vol * sqrtT);
  const vega = (spot * normPdf(d1) * sqrtT) / 100;
  if (right === "call") {
    const price = spot * normCdf(d1) - strike * disc * normCdf(d2);
    const theta = (-(spot * normPdf(d1) * vol) / (2 * sqrtT) - rate * strike * disc * normCdf(d2)) / 365;
    return { price, delta: normCdf(d1), gamma, theta, vega };
  }
  const price = strike * disc * normCdf(-d2) - spot * normCdf(-d1);
  const theta = (-(spot * normPdf(d1) * vol) / (2 * sqrtT) + rate * strike * disc * normCdf(-d2)) / 365;
  return { price, delta: normCdf(d1) - 1, gamma, theta, vega };
}

/** Standard strike increment by underlying price (approximation of listed grids). */
export function strikeStep(spot: number): number {
  if (spot < 5) return 0.5;
  if (spot < 25) return 1;
  if (spot < 100) return 2.5;
  if (spot < 250) return 5;
  if (spot < 1000) return 10;
  return 25;
}

export function occSymbol(underlying: string, expiration: string, right: "call" | "put", strike: number): string {
  const yymmdd = expiration.slice(2).replaceAll("-", "");
  const strikeInt = Math.round(strike * 1000)
    .toString()
    .padStart(8, "0");
  return `O:${underlying}${yymmdd}${right === "call" ? "C" : "P"}${strikeInt}`;
}
