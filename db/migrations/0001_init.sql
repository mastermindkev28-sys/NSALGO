-- ─────────────────────────────────────────────────────────────────────────────
-- NSALGO — initial schema (PostgreSQL 15+ / Supabase compatible)
-- UUID primary keys, timestamptz everywhere, normalised, indexed, RLS enforced.
-- The application connects as `nsalgo_app` and sets per-transaction context:
--   select set_config('app.user_id', '<uuid>', true);
--   select set_config('app.role',    'member' | 'service', true);
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;
create extension if not exists citext;

create schema if not exists app;

create or replace function app.current_user_id() returns uuid
language sql stable as $$ select nullif(current_setting('app.user_id', true), '')::uuid $$;

create or replace function app.is_service() returns boolean
language sql stable as $$ select coalesce(current_setting('app.role', true), '') = 'service' $$;

create or replace function app.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- ── Identity ────────────────────────────────────────────────────────────────
create table users (
  id               uuid primary key default gen_random_uuid(),
  email            citext not null unique,
  password_hash    text not null,
  role             text not null default 'member' check (role in ('member','analyst','editor','admin')),
  email_verified_at timestamptz,
  disabled_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger users_touch before update on users for each row execute function app.touch_updated_at();

create table profiles (
  user_id          uuid primary key references users(id) on delete cascade,
  display_name     text,
  timezone         text not null default 'America/New_York',
  experience       text check (experience in ('new','intermediate','advanced')),
  default_mode     text not null default 'swing' check (default_mode in ('day','swing')),
  marketing_opt_in boolean not null default false,
  updated_at       timestamptz not null default now()
);

create table admin_users (
  user_id     uuid primary key references users(id) on delete cascade,
  permissions text[] not null default '{}',
  granted_by  uuid references users(id),
  created_at  timestamptz not null default now()
);

create table sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  token_hash   text not null unique,
  expires_at   timestamptz not null,
  last_seen_at timestamptz not null default now(),
  ip           inet,
  user_agent   text,
  created_at   timestamptz not null default now()
);
create index sessions_user_idx on sessions(user_id);
create index sessions_expiry_idx on sessions(expires_at);

create table one_time_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  purpose     text not null check (purpose in ('verify-email','reset-password')),
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index ott_user_idx on one_time_tokens(user_id, purpose);

-- ── Membership & billing ────────────────────────────────────────────────────
create table plans (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique check (code in ('monthly','annual')),
  name             text not null,
  interval         text not null check (interval in ('month','year')),
  amount           integer check (amount >= 0),          -- minor units; null = not configured
  currency         text not null default 'USD',
  stripe_price_id  text,
  active           boolean not null default true,
  features         text[] not null default '{}',
  updated_at       timestamptz not null default now()
);

create table memberships (
  user_id     uuid primary key references users(id) on delete cascade,
  state       text not null check (state in ('free','active','past_due','canceled')),
  source_subscription_id uuid,
  updated_at  timestamptz not null default now()
);

create table subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references users(id) on delete cascade,
  plan_code                text references plans(code),
  provider                 text not null check (provider in ('stripe','mock')),
  provider_customer_id     text,
  provider_subscription_id text unique,
  status                   text not null,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index subscriptions_user_idx on subscriptions(user_id);
create index subscriptions_status_idx on subscriptions(status);
create trigger subscriptions_touch before update on subscriptions for each row execute function app.touch_updated_at();

create table transactions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  subscription_id     uuid references subscriptions(id) on delete set null,
  provider_invoice_id text unique,
  amount              integer not null,
  currency            text not null,
  status              text not null check (status in ('paid','open','failed','refunded','void')),
  hosted_invoice_url  text,
  created_at          timestamptz not null default now()
);
create index transactions_user_idx on transactions(user_id, created_at desc);

create table stripe_events (
  id          text primary key,         -- Stripe event id; guarantees idempotent processing
  type        text not null,
  received_at timestamptz not null default now()
);

-- ── Market reference & cache tables ─────────────────────────────────────────
create table tickers (
  symbol      text primary key,
  name        text not null,
  exchange    text,
  asset_class text not null,
  sector      text,
  industry    text,
  market_cap  numeric,
  active      boolean not null default true,
  updated_at  timestamptz not null default now()
);
create index tickers_name_trgm on tickers using gin (to_tsvector('simple', name));

create table market_quotes (
  symbol      text primary key references tickers(symbol) on delete cascade,
  last        numeric, change numeric, change_percent numeric,
  open numeric, high numeric, low numeric, prev_close numeric,
  volume bigint, avg_volume bigint,
  source      text not null,
  as_of       timestamptz,
  fetched_at  timestamptz not null default now()
);

create table market_history (
  symbol    text not null references tickers(symbol) on delete cascade,
  interval  text not null,
  ts        timestamptz not null,
  open numeric not null, high numeric not null, low numeric not null, close numeric not null,
  volume    bigint not null default 0,
  source    text not null,
  primary key (symbol, interval, ts)
);

create table options_contracts (
  contract        text primary key,
  underlying      text not null,
  right_type      text not null check (right_type in ('call','put')),
  strike          numeric not null,
  expiration      date not null,
  bid numeric, ask numeric, last numeric,
  volume bigint, open_interest bigint,
  implied_volatility numeric, delta numeric, gamma numeric, theta numeric, vega numeric,
  source          text not null,
  as_of           timestamptz not null default now()
);
create index options_contracts_underlying_idx on options_contracts(underlying, expiration);

create table iv_history (
  symbol  text not null,
  day     date not null,
  atm_iv  numeric not null,
  source  text not null,
  primary key (symbol, day)
);

create table options_flow (
  id               text primary key,
  ts               timestamptz not null,
  underlying       text not null,
  right_type       text not null,
  strike           numeric not null,
  expiration       date not null,
  premium          numeric not null,
  contracts        integer not null,
  price            numeric not null,
  spot             numeric,
  volume           bigint, open_interest bigint, implied_volatility numeric,
  execution        text,     -- null when provider does not classify
  side             text,
  intent           text,     -- opening/closing only when provider supplies it
  sentiment        text,
  source           text not null
);
create index options_flow_ts_idx on options_flow(ts desc);
create index options_flow_underlying_idx on options_flow(underlying, ts desc);

-- ── ATLAS ───────────────────────────────────────────────────────────────────
create table atlas_config (
  id          uuid primary key default gen_random_uuid(),
  version     text not null unique,
  config      jsonb not null,
  active      boolean not null default false,
  created_by  uuid references users(id),
  created_at  timestamptz not null default now()
);
create unique index atlas_config_one_active on atlas_config(active) where active;

create table atlas_setups (
  id              text primary key,             -- deterministic: symbol|mode|session|direction
  symbol          text not null,
  mode            text not null check (mode in ('day','swing')),
  direction       text not null check (direction in ('long','short')),
  trade_type      text not null,
  score           integer not null check (score between 0 and 100),
  coverage        numeric not null,
  status          text not null check (status in ('generated','active','triggered','invalidated','target-reached','expired')),
  entry_low numeric not null, entry_high numeric not null,
  target_low numeric not null, target_high numeric not null,
  invalidation    numeric not null,
  payload         jsonb not null,               -- full AtlasSetup snapshot at generation (incl. explanation inputs)
  config_version  text not null,
  data_mode       text not null,
  generated_at    timestamptz not null,
  expires_at      timestamptz not null,
  closed_at       timestamptz,
  return_pct      numeric,
  updated_at      timestamptz not null default now()
);
create index atlas_setups_generated_idx on atlas_setups(generated_at desc);
create index atlas_setups_symbol_idx on atlas_setups(symbol, generated_at desc);
create index atlas_setups_status_idx on atlas_setups(status) where status in ('active','triggered');

create table atlas_setup_events (
  id        bigserial primary key,
  setup_id  text not null references atlas_setups(id) on delete cascade,
  status    text not null,
  price     numeric,
  at        timestamptz not null,
  unique (setup_id, status)                    -- append-only lifecycle; outcomes are never rewritten
);

create table atlas_scores (
  id          bigserial primary key,
  symbol      text not null,
  mode        text not null,
  score       integer not null,
  coverage    numeric not null,
  config_version text not null,
  computed_at timestamptz not null default now()
);
create index atlas_scores_symbol_idx on atlas_scores(symbol, computed_at desc);

create table atlas_factors (
  score_id  bigint not null references atlas_scores(id) on delete cascade,
  factor    text not null,
  score     integer,              -- null = input unavailable
  weight    numeric not null,
  inputs    jsonb not null,
  primary key (score_id, factor)
);

-- ── Content & intelligence ──────────────────────────────────────────────────
create table news_sources (
  id          text primary key,
  name        text not null,
  licence     text not null,
  retention_days integer not null default 30,
  active      boolean not null default true
);

create table news_articles (
  id           text primary key,
  source_id    text not null references news_sources(id),
  headline     text not null,
  summary      text,                 -- only fields permitted by the provider licence
  publisher    text not null,
  url          text not null,
  image_url    text,
  tickers      text[] not null default '{}',
  categories   text[] not null default '{}',
  sentiment    text,
  impact       text,
  published_at timestamptz not null,
  fetched_at   timestamptz not null default now()
);
create index news_published_idx on news_articles(published_at desc);
create index news_tickers_idx on news_articles using gin(tickers);

create table market_commentary (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text not null,
  author_id    uuid references users(id),
  author_name  text not null,
  tickers      text[] not null default '{}',
  status       text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table insider_transactions (
  id                 text primary key,
  person             text not null,
  company            text not null,
  ticker             text not null,
  role               text,
  form               text not null,
  transaction_type   text not null,
  transaction_code   text,
  shares             numeric, price numeric, value numeric, shares_owned_after numeric,
  transaction_date   date not null,
  filing_date        date not null,
  filing_url         text not null,
  source             text not null,
  ingested_at        timestamptz not null default now()
);
create index insider_ticker_idx on insider_transactions(ticker, filing_date desc);
create index insider_filing_idx on insider_transactions(filing_date desc);

create table institutional_activity (
  id               text primary key,
  category         text not null,
  entity           text not null,
  ticker           text,
  asset            text not null,
  transaction      text not null,
  estimated_value  numeric,
  shares           numeric,
  change_percent   numeric,
  date             date not null,
  source           text not null,
  source_url       text,
  source_timestamp timestamptz not null
);
create index inst_ticker_idx on institutional_activity(ticker, date desc);

create table congressional_disclosures (
  id               text primary key,
  member           text not null,
  chamber          text not null check (chamber in ('house','senate')),
  party            text,
  state            text,
  owner            text,
  issuer           text not null,
  ticker           text,
  transaction      text not null,
  value_range      text not null,
  value_min        numeric,
  value_max        numeric,
  transaction_date date,
  disclosure_date  date not null,
  document_url     text not null,
  source           text not null
);
create index congress_member_idx on congressional_disclosures(member, disclosure_date desc);
create index congress_ticker_idx on congressional_disclosures(ticker, disclosure_date desc);

create table economic_events (
  id          text primary key,
  datetime    timestamptz not null,
  country     text not null,
  event       text not null,
  category    text not null,
  importance  text not null,
  previous    text, forecast text, actual text,   -- null until published; never estimated
  source      text not null,
  updated_at  timestamptz not null default now()
);
create index econ_datetime_idx on economic_events(datetime);

create table educational_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text not null default '',
  position    integer not null default 0
);

create table educational_articles (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title          text not null,
  description    text not null,
  author_name    text not null,
  category_slug  text not null references educational_categories(slug) on update cascade,
  difficulty     text not null check (difficulty in ('foundational','intermediate','advanced')),
  read_minutes   integer not null default 5,
  content        text not null,
  featured_image text,
  featured       boolean not null default false,
  status         text not null default 'draft' check (status in ('draft','published')),
  related_slugs  text[] not null default '{}',
  published_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index edu_category_idx on educational_articles(category_slug, published_at desc);
create index edu_search_idx on educational_articles using gin (to_tsvector('english', title || ' ' || description));
create trigger edu_touch before update on educational_articles for each row execute function app.touch_updated_at();

create table site_content (
  id          smallint primary key default 1 check (id = 1),
  content     jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ── Member data ─────────────────────────────────────────────────────────────
create table watchlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);
create index watchlists_user_idx on watchlists(user_id, position);

create table watchlist_items (
  id           uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references watchlists(id) on delete cascade,
  symbol       text not null,
  note         text,
  position     integer not null default 0,
  added_at     timestamptz not null default now(),
  unique (watchlist_id, symbol)
);

create table alerts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  kind              text not null,
  symbol            text,
  threshold         numeric,
  channel           text not null default 'in-app' check (channel in ('in-app','email','push')),
  active            boolean not null default true,
  last_triggered_at timestamptz,
  created_at        timestamptz not null default now()
);
create index alerts_active_idx on alerts(kind, active) where active;
create index alerts_user_idx on alerts(user_id);

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  title      text not null,
  body       text not null,
  href       text,
  kind       text not null,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications(user_id, created_at desc);

-- ── Operations ──────────────────────────────────────────────────────────────
create table system_logs (
  id         uuid primary key default gen_random_uuid(),
  level      text not null check (level in ('info','warn','error')),
  scope      text not null,
  message    text not null,
  context    jsonb,
  created_at timestamptz not null default now()
);
create index system_logs_created_idx on system_logs(created_at desc);
create index system_logs_level_idx on system_logs(level, created_at desc);

create table audit_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references users(id) on delete set null,
  action     text not null,
  target     text,
  metadata   jsonb,
  ip         inet,
  created_at timestamptz not null default now()
);
create index audit_created_idx on audit_logs(created_at desc);

create table analytics_events (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  user_id      uuid references users(id) on delete set null,
  anonymous_id text,
  path         text,
  properties   jsonb,
  created_at   timestamptz not null default now()
);
create index analytics_name_idx on analytics_events(name, created_at desc);

create table job_runs (
  id          uuid primary key default gen_random_uuid(),
  job         text not null,
  status      text not null check (status in ('running','succeeded','failed')),
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  detail      jsonb
);
create index job_runs_job_idx on job_runs(job, started_at desc);

-- ── Row Level Security ──────────────────────────────────────────────────────
-- Member-owned rows are visible only to their owner; the service role (used by
-- jobs, webhooks and admin actions after server-side authorisation) bypasses.
do $$
declare t text;
begin
  foreach t in array array['profiles','watchlists','alerts','notifications','subscriptions','transactions','memberships','sessions','one_time_tokens'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
  end loop;
end $$;

create policy owner_profiles on profiles using (user_id = app.current_user_id() or app.is_service()) with check (user_id = app.current_user_id() or app.is_service());
create policy owner_watchlists on watchlists using (user_id = app.current_user_id() or app.is_service()) with check (user_id = app.current_user_id() or app.is_service());
create policy owner_alerts on alerts using (user_id = app.current_user_id() or app.is_service()) with check (user_id = app.current_user_id() or app.is_service());
create policy owner_notifications on notifications using (user_id = app.current_user_id() or app.is_service()) with check (user_id = app.current_user_id() or app.is_service());
create policy owner_subscriptions on subscriptions using (user_id = app.current_user_id() or app.is_service()) with check (app.is_service());
create policy owner_transactions on transactions using (user_id = app.current_user_id() or app.is_service()) with check (app.is_service());
create policy owner_memberships on memberships using (user_id = app.current_user_id() or app.is_service()) with check (app.is_service());
create policy service_sessions on sessions using (app.is_service()) with check (app.is_service());
create policy service_tokens on one_time_tokens using (app.is_service()) with check (app.is_service());

alter table watchlist_items enable row level security;
alter table watchlist_items force row level security;
create policy owner_watchlist_items on watchlist_items
  using (app.is_service() or exists (select 1 from watchlists w where w.id = watchlist_id and w.user_id = app.current_user_id()))
  with check (app.is_service() or exists (select 1 from watchlists w where w.id = watchlist_id and w.user_id = app.current_user_id()));

-- ── Seed reference rows ─────────────────────────────────────────────────────
insert into plans (code, name, interval, features) values
  ('monthly', 'NSALGO Monthly', 'month', array['ATLAS','Options intelligence','Swing analysis','Market news','Whale activity','Insider & congressional disclosures','Education','Watchlists','Alerts']),
  ('annual',  'NSALGO Annual',  'year',  array['ATLAS','Options intelligence','Swing analysis','Market news','Whale activity','Insider & congressional disclosures','Education','Watchlists','Alerts'])
on conflict (code) do nothing;

insert into news_sources (id, name, licence, retention_days) values
  ('polygon', 'Polygon.io News', 'Per Polygon.io subscription terms — headline, description, link, image URL', 30)
on conflict (id) do nothing;
