import "server-only";
/**
 * Claude adapter for the AI layer. Uses structured outputs so responses are
 * schema-validated, and server-side refusal fallbacks. The model only writes
 * prose around the supplied digest; numeric claims are verified afterwards
 * (see guard.ts) and rejected if they don't trace back to the inputs.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import { log } from "@/lib/logger";
import type { AIProvider, MarketDigest, MarketNarrative, SetupDigest, SetupNarrative } from "./types";

const SetupSchema = z.object({
  whyItAppeared: z.string().describe("2–3 sentences: which measured conditions caused the setup to rank."),
  risks: z.string().describe("2–3 sentences: invalidation level and the adverse factors."),
  catalystSummary: z.string().describe("One sentence summarising the listed catalysts, or stating none were identified."),
  thesis: z.string().describe("2 sentences describing the setup framework using the supplied levels."),
});

const MarketSchema = z.object({
  headline: z.string().describe("Max 12 words."),
  summary: z.string().describe("3–4 sentences."),
  watch: z.array(z.string()).max(3).describe("Up to three items to watch, drawn from the digest."),
});

const SYSTEM = `You are the explanation layer of ATLAS, a market-intelligence engine.
You receive a JSON digest of signals that the engine has already computed. Your job is to explain them clearly to experienced traders.

Rules:
- Use only facts and numbers present in the digest. Never introduce a price, level, percentage, date or statistic that is not in it.
- The ATLAS score is an analytical ranking, not a probability or a prediction. Never imply certainty, guaranteed outcomes or profit.
- Do not give personalised advice or tell the reader to buy or sell. Describe the setup, its conditions and its risks.
- If coverage is below 0.8, mention that some inputs were unavailable.
- Tone: precise, calm, institutional. No hype, no exclamation marks.`;

export class AnthropicAIProvider implements AIProvider {
  readonly id = "anthropic";
  private client: Anthropic;
  constructor(
    apiKey: string,
    readonly model: string,
  ) {
    this.client = new Anthropic({ apiKey, maxRetries: 2, timeout: 60_000 });
  }

  private async run<T>(schema: z.ZodType<T>, user: string): Promise<T | null> {
    try {
      const res = await this.client.beta.messages.parse({
        model: this.model,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: SYSTEM,
        output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
        messages: [{ role: "user", content: user }],
      });
      if (res.stop_reason === "refusal") {
        log.warn("ai", "AI provider declined request; using template narrative");
        return null;
      }
      return (res.parsed_output as T | null) ?? null;
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) log.warn("ai", "AI rate limited; using template narrative");
      else if (err instanceof Anthropic.AuthenticationError) log.error("ai", "AI credentials rejected");
      else if (err instanceof Anthropic.APIConnectionError) log.warn("ai", "AI provider unreachable");
      else if (err instanceof Anthropic.APIError) log.error("ai", "AI provider error", { status: err.status });
      else log.error("ai", "AI explanation failed", { error: (err as Error).message });
      return null;
    }
  }

  explainSetup(d: SetupDigest): Promise<SetupNarrative | null> {
    return this.run(SetupSchema, `Explain this ATLAS setup.\n\n<digest>\n${JSON.stringify(d)}\n</digest>`);
  }

  summarizeMarket(d: MarketDigest): Promise<MarketNarrative | null> {
    return this.run(MarketSchema, `Write the market intelligence brief for this session.\n\n<digest>\n${JSON.stringify(d)}\n</digest>`);
  }

  async healthCheck() {
    try {
      await this.client.models.retrieve(this.model);
      return { ok: true, message: `Operational (${this.model})` };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  }
}
