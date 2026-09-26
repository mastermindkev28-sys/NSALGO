# NSALGO

Financial intelligence and trading-technology membership platform. The flagship product is **ATLAS**, an explainable setup-ranking engine for day-trade and swing ideas.

> NSALGO provides information and analytics for educational purposes only. It does not give individualized investment advice. ATLAS scores are analytical rankings. They are not predictions or probabilities of profit.

## Stack

- Next.js 16 (App Router, React 19, Turbopack), with `proxy.ts` handling the CSP nonce and optimistic auth redirects
- TypeScript (strict, `noUncheckedIndexedAccess`) and Tailwind CSS v4 (design tokens in `app/globals.css`)
- Radix primitives, cmdk, sonner, lucide, and lightweight-charts. TradingView widgets are used where embedding is licensed.
- PostgreSQL / Supabase through `postgres.js`, with row-level security driven by `app.user_id` / `app.role`
- Stripe subscriptions with webhooks
- Anthropic Claude for the AI explanation layer, with a deterministic template fallback
- Vitest (unit) and Playwright (e2e)

## Quick start

```bash
npm install
cp .env.example .env.local        # DATA_MODE=mock needs no keys
npm run dev                       # http://localhost:3000
```

In mock mode everything runs in memory. Data persists to `.data/nsalgo-dev.json` during development. Demo accounts are seeded **only in mock mode**:

| Account | Email | Password |
| --- | --- | --- |
| Paid member | `member@nsalgo.dev` | `Northstar-2026!` |
| Free account | `free@nsalgo.dev` | `Northstar-2026!` |
| Admin | `admin@nsalgo.dev` | `Northstar-2026!` |

## Data modes

`DATA_MODE` selects how every provider is wired (`providers/registry.ts`):

- **`mock`**: a deterministic, seeded market simulator (`providers/mock/*`). All simulated data carries `meta.mode = "mock"` and is labelled in the UI ("Simulated data" badges and the dev banner). Mock people and entities are fictional and marked "(simulated)". Mock news comes from "NSALGO Simulated Wire" and has no external URL.
- **`production`**: only configured, licensed providers are used. A provider with a missing key returns `PROVIDER_NOT_CONFIGURED`, and the UI shows a "data source not configured" state. **Nothing falls back to mock data.** Without `DATABASE_URL`, public pages still render, writes fail explicitly, and `/api/health` returns 503.

Every data call returns `DataResult<T>`: either `{ ok: true, data, meta }` or `{ ok: false, error }`. The `meta` block records source, mode (mock/live/delayed/eod), `asOf` and staleness, and `DataSourceBadge` shows it next to the data. A stale-if-error cache (`lib/cache.ts`) keeps the last good value when a provider fails.

### Swapping providers

The provider interfaces live in `providers/types.ts`: `MarketDataProvider`, `OptionsProvider`, `NewsProvider`, `InsiderProvider`, `InstitutionalProvider`, `CongressionalProvider`, `EconomicCalendarProvider` and `AIProvider`. To add a vendor:

1. Implement the interface under `providers/<vendor>/`.
2. Register it in `providers/registry.ts`, keyed by the `*_PROVIDER` env var.
3. Declare its env vars in `config/env.ts` and `.env.example`.

Included adapters:

- **Polygon**: market data, options chains and news. Options flow returns `UNSUPPORTED` until a licensed trade-level feed is configured.
- **SEC EDGAR**: Form 4 XML and 13F. Requests use a declared User-Agent and are throttled to respect SEC fair-access limits.
- **Congressional**: a disclosure-aggregator adapter.
- **TradingEconomics**: the economic calendar.

Yahoo Finance is intentionally **not** used or scraped. API keys are read server-side only.

## ATLAS engine (`services/atlas/`)

`features` → `inferDirection` → 16 factor scorers (`factors.ts`) → `scoreSetup` (`scoring.ts`) → `buildLevels` → `buildOptionsPlan` → catalysts and confirmations → AI explanation → persisted setup → lifecycle.

- **Factors return `null` when their inputs are unavailable.** Weights are re-normalised over the factors that have data. Coverage is reported, and when coverage is thin the score shrinks toward 50.
- **Weights, thresholds and liquidity rules** are configurable per mode in Admin → Atlas config. Each save creates a new config version, and every setup records the version it was scored with.
- **The regime engine** (`regime.ts`) classifies risk-on/off, volatility and trend/range from index, VIX, breadth, sector and rate inputs. Missing inputs are reported as unavailable; they are never defaulted.
- **Lifecycle** (`lifecycle.ts`): generated → active → triggered → target-reached / invalidated / expired. Setups are immutable once generated. Only the status and its history advance. Losing setups stay in History and count toward the published statistics.
- **AI layer** (`services/ai/`): the model receives only a structured digest and returns structured output. A numeric fabrication guard (`guard.ts`) rejects any narrative that states a number not present in the digest. Rejected or failed responses fall back to the deterministic template.

## Membership, auth and billing

- Passwords are hashed with scrypt. Session tokens are opaque; only their HMAC is stored. The cookie is `__Host-nsalgo_session` in production.
- States: visitor, free, active, past_due (with a 7-day grace period), canceled, and admin. **Paid access comes only from server-side subscription records written by Stripe webhooks** (`services/billing`). Webhooks are idempotent on the Stripe event id. The mock billing provider refuses to run in production.
- RBAC roles are admin, editor and analyst (`lib/auth/permissions.ts`). Every admin action is checked server-side and written to the audit log.
- Prices are never hard-coded. Set `MONTHLY_PRICE` / `ANNUAL_PRICE` and the matching Stripe price ids, or manage plans in Admin → Subscriptions.

## Security

- CSP uses a per-request nonce with `strict-dynamic`, alongside HSTS, frame-ancestors and the other headers set in `next.config.ts` and `proxy.ts`.
- API routes go through `lib/api.ts`, which applies:
  - rate limits
  - zod validation of query strings and bodies
  - auth and entitlement checks
  - same-origin enforcement on mutations (CSRF)
- Server actions use Next's built-in origin checks.

## Database

```bash
DATABASE_URL=postgres://… npm run db:migrate   # applies db/migrations/*.sql
```

`0001_init.sql` creates the full schema, row-level security policies and seed rows (default plans and news-source licence records). Education content is seeded by the app on first run.

## Scheduled jobs

These jobs are defined in `services/jobs/index.ts`:

- `market-refresh`
- `news-ingest`
- `sec-ingest`
- `congress-ingest`
- `calendar-refresh`
- `options-flow-ingest`
- `atlas-day`
- `atlas-swing`
- `atlas-lifecycle`
- `alerts`
- `cleanup`

Ways to run them:

- **Vercel cron**: `vercel.json` calls `/api/cron/<job>` with `Authorization: Bearer $CRON_SECRET`.
- **Manually**: `npm run jobs:run -- atlas-day`.

Each run is recorded and shown in Admin → System.

## Testing

```bash
npm run check          # typecheck + lint + unit tests
npm run build
npm run test:e2e       # Playwright; builds must exist (npm run build). Runs desktop + mobile.
# If a Chromium is preinstalled: PLAYWRIGHT_CHROMIUM_PATH=/path/to/chromium npm run test:e2e
```

Unit tests cover the Atlas engine, indicators, scoring, lifecycle, regime, the AI fabrication guard, markdown sanitising, membership, auth, Stripe webhooks, providers and the API wrapper. The e2e smoke tests cover every public page, the sign-in flow, entitlement gating, admin RBAC and API auth.

## Project layout

```
app/          routes — (site) public, (auth), dashboard (members), admin, api
components/   UI primitives, layout, market/atlas/chart components
features/     page-level feature modules (client + server actions)
services/     domain services (market, intel, atlas, ai, billing, auth, jobs)
providers/    data-provider adapters (mock, polygon, sec, congress, calendar)
db/           repositories (memory, postgres), migrations, seeds
config/       env schema, universe, Atlas defaults, site content
lib/          utilities (cache, http, security, formatting, markdown)
types/        shared domain types
tests/        unit (vitest) and e2e (playwright)
```
