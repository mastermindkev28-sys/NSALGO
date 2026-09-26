import type { NewsCategory } from "@/types/news";

/**
 * Keyword classifier used when a licensed feed does not supply NSALGO's
 * category taxonomy. Output is labelled as NSALGO classification in the UI.
 */
const RULES: { category: NewsCategory; patterns: RegExp[] }[] = [
  { category: "fed", patterns: [/\bfed\b/i, /federal reserve/i, /\bfomc\b/i, /powell/i, /rate (cut|hike)/i, /central bank/i] },
  { category: "economy", patterns: [/\bcpi\b/i, /inflation/i, /payrolls?/i, /jobless/i, /\bgdp\b/i, /retail sales/i, /\bpmi\b/i, /consumer (confidence|sentiment)/i, /unemployment/i] },
  { category: "earnings", patterns: [/earnings/i, /quarterly (results|revenue)/i, /\beps\b/i, /guidance/i, /beats? estimates/i, /misses? estimates/i] },
  { category: "ai", patterns: [/\bai\b/i, /artificial intelligence/i, /\bllm\b/i, /generative/i, /data[- ]cent(er|re)/i, /\bgpu\b/i] },
  { category: "technology", patterns: [/semiconductor/i, /\bchip/i, /software/i, /cloud/i, /apple|microsoft|nvidia|alphabet|google|meta|amazon/i] },
  { category: "options", patterns: [/options?\b/i, /\bcalls?\b/i, /\bputs?\b/i, /implied volatility/i, /\bvix\b/i] },
  { category: "crypto", patterns: [/bitcoin/i, /ethereum/i, /crypto/i, /\bbtc\b/i, /stablecoin/i] },
  { category: "macro", patterns: [/treasur(y|ies)/i, /yields?/i, /dollar/i, /\boil\b|crude/i, /tariff/i, /geopolit/i, /commodit/i] },
];

export function classifyHeadline(text: string): NewsCategory[] {
  const cats = RULES.filter((r) => r.patterns.some((p) => p.test(text))).map((r) => r.category);
  return cats.length ? [...new Set(cats)] : ["markets"];
}
