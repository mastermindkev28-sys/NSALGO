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

- **Polygon**: market data, options chains, news and options flow. Flow needs a Polygon options plan that includes trades; see below.
- **SEC EDGAR**: Form 4 XML and 13F. Requests use a declared User-Agent and are throttled to respect SEC fair-access limits.
- **Congressional**: a disclosure-aggregator adapter.
- **TradingEconomics**: the economic calendar.
- **Unusual Whales**: options chains and flow alerts, congressional trades, insider transactions, and the economic and earnings calendars, all from one `UNUSUAL_WHALES_API_KEY`. While the key is set, each of those slots uses Unusual Whales unless its `*_PROVIDER` variable names another vendor. Market data, news and 13F stay on their own providers.

Yahoo Finance is intentionally **not** used or scraped. API keys are read server-side only.

### Options flow

With Unusual Whales, flow is its flow-alerts feed (`providers/unusualwhales`). Sweeps are flagged by Unusual Whales. Side is where 60% or more of the premium traded (ask or bid, otherwise mid), and sentiment follows from side and call/put. Alerts made only of opening trades are marked opening.

Without it, `PolygonOptionsProvider.getFlow` scans the most active contracts (by premium traded today) for each underlying in `OPTIONS_FLOW_SYMBOLS` (or a built-in liquid list), pulls their trades, and turns them into large prints. Polygon doesn't label flow, so `providers/polygon/flow.ts` classifies it with documented heuristics:

- **Execution:** legs within 50 ms on 2+ exchanges are a sweep, on one exchange a split; a single print of 250+ contracts is a block.
- **Side and sentiment:** the order's price against the NBBO just before it (bought at the ask on a call is bullish, and so on). Needs quotes on your plan; without them side and sentiment are shown as unknown.
- **Intent:** an order larger than open interest is marked opening. Otherwise it's unknown.

Without a trades entitlement the flow pages show "not configured".

### Live quotes

Quote widgets (ticker tape, market pulse, dashboard indices, watchlists) subscribe to `/api/market/stream`, a Server-Sent Events route that refreshes every `QUOTE_STREAM_INTERVAL_MS` and sends only quotes that changed. Each connection lasts 50 seconds and the browser reconnects automatically; streams pause while the tab is hidden. If streaming fails the widgets fall back to polling `/api/market/quote`. API keys never reach the browser. Prices are only as fresh as your plan: with `MARKET_DATA_DELAY_MINUTES=15` they tick, but 15 minutes behind.

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

## Deploying to Vercel

1. Import the GitHub repository in Vercel. The Next.js preset needs no build overrides.
2. Set the environment variables:
   - `DATA_MODE`: `mock` for a demo, `production` with real provider keys.
   - `SESSION_SECRET`: 32 or more random characters (`openssl rand -base64 48`).
   - `CRON_SECRET`: random. Vercel sends it to the cron routes automatically.
   - `NEXT_PUBLIC_SITE_URL` (optional): defaults to the project's production domain.
3. Deploy.

Without `DATABASE_URL`, mock mode keeps accounts and sessions in server memory. Each serverless instance has its own copy, so data resets on cold starts and a sign-in can occasionally drop. That's fine for a demo. For anything real, add a Postgres `DATABASE_URL` (Supabase works) and run `npm run db:migrate`.

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

- **Vercel cron**: `vercel.json` calls `/api/cron/<job>` with `Authorization: Bearer $CRON_SECRET`. It only schedules jobs that run once a day, because Vercel's Hobby plan rejects anything more frequent. On Vercel Pro, or from any external scheduler, add the intraday jobs as well:
  - `market-refresh` and `atlas-day`: `*/5 13-21 * * 1-5`
  - `options-flow-ingest`: `*/2 13-21 * * 1-5`
  - `news-ingest`: `*/10 * * * *`
  - `alerts`: `*/5 * * * *`
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
