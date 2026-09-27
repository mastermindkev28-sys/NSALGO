import "server-only";
import { z } from "zod";

/**
 * Server environment. Parsed once, lazily, and never imported by client code
 * (enforced by `server-only`). Provider keys stay on the server.
 */
const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined));

const SecConfig = z.object({
  userAgent: z.string().min(8),
  maxRequestsPerSecond: z.number().int().min(1).max(10).default(8),
  trackedInstitutionCiks: z.array(z.string()).default([]),
});

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATA_MODE: z.enum(["mock", "production"]).default("mock"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  SESSION_SECRET: optional,
  DATABASE_URL: optional,
  CRON_SECRET: optional,

  MARKET_DATA_PROVIDER: z.string().default("polygon"),
  MARKET_DATA_API_KEY: optional,
  /** polygon | unusualwhales. Empty = unusualwhales when UNUSUAL_WHALES_API_KEY is set, else polygon. */
  OPTIONS_DATA_PROVIDER: optional,
  OPTIONS_API_KEY: optional,
  MARKET_DATA_DELAY_MINUTES: z.coerce.number().int().min(0).default(15),
  /** Comma-separated underlyings scanned for options flow. Empty = built-in liquid list. */
  OPTIONS_FLOW_SYMBOLS: optional,
  /** How often the live quote stream refreshes, in milliseconds. */
  QUOTE_STREAM_INTERVAL_MS: z.coerce.number().int().min(500).max(60_000).default(2000),

  /** Unusual Whales API token: options chains and flow, congress, insiders, calendars. */
  UNUSUAL_WHALES_API_KEY: optional,

  NEWS_PROVIDER: z.string().default("polygon"),
  NEWS_API_KEY: optional,

  SEC_API_CONFIG: optional,
  /** sec | unusualwhales. Empty = unusualwhales when UNUSUAL_WHALES_API_KEY is set, else sec. */
  INSIDER_PROVIDER: optional,

  /** vendor | unusualwhales. Empty = unusualwhales when UNUSUAL_WHALES_API_KEY is set, else vendor. */
  CONGRESS_PROVIDER: optional,
  CONGRESS_API_BASE_URL: optional,
  CONGRESS_API_KEY: optional,

  /** tradingeconomics | unusualwhales. Empty = unusualwhales when UNUSUAL_WHALES_API_KEY is set, else tradingeconomics. */
  ECONOMIC_CALENDAR_PROVIDER: optional,
  ECONOMIC_CALENDAR_API_KEY: optional,

  AI_PROVIDER: z.string().default("anthropic"),
  AI_API_KEY: optional,
  AI_MODEL: z.string().default("claude-opus-5"),

  STRIPE_SECRET_KEY: optional,
  STRIPE_WEBHOOK_SECRET: optional,
  STRIPE_PRICE_MONTHLY: optional,
  STRIPE_PRICE_ANNUAL: optional,
  MONTHLY_PRICE: optional,
  ANNUAL_PRICE: optional,
  BILLING_CURRENCY: z.string().default("USD"),

  EMAIL_PROVIDER: z.string().default("console"),
  EMAIL_API_KEY: optional,
  EMAIL_FROM: z.string().default("NSALGO <no-reply@nsalgo.com>"),
});

export type ServerEnv = z.infer<typeof EnvSchema> & {
  sec: z.infer<typeof SecConfig> | undefined;
};

let cached: ServerEnv | undefined;

export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }
  let sec: ServerEnv["sec"];
  if (parsed.data.SEC_API_CONFIG) {
    try {
      sec = SecConfig.parse(JSON.parse(parsed.data.SEC_API_CONFIG));
    } catch {
      sec = undefined;
    }
  }
  cached = { ...parsed.data, sec };
  return cached;
}

export const isMockMode = () => env().DATA_MODE === "mock";
export const isProduction = () => env().NODE_ENV === "production";

/** Test helper — reset memoised env between test cases. */
export function __resetEnvForTests() {
  cached = undefined;
}
