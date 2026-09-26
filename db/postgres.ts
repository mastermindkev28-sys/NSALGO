import "server-only";
/**
 * PostgreSQL repositories (Supabase-compatible). All statements use
 * parameterised tagged templates (no string interpolation of values).
 * Each unit of work runs in a transaction that sets `app.user_id` /
 * `app.role` so the Row Level Security policies in 0001_init.sql apply.
 */
import postgres from "postgres";
import type { AtlasConfig, AtlasSetup } from "@/types/atlas";
import type { Commentary } from "@/types/news";
import type {
  Alert,
  BillingTransaction,
  EducationArticle,
  EducationCategory,
  Notification,
  OneTimeToken,
  Plan,
  Profile,
  Session,
  SiteContent,
  Subscription,
  SystemLog,
  User,
  UserWithSecret,
  Watchlist,
  WatchlistItem,
} from "@/types/domain";
import type { Repositories } from "./types";

type Tx = postgres.TransactionSql<Record<string, never>>;

const g = globalThis as unknown as { __nsalgoSql?: postgres.Sql };

function client(url: string): postgres.Sql {
  if (g.__nsalgoSql) return g.__nsalgoSql;
  g.__nsalgoSql = postgres(url, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: false, // compatible with Supabase transaction pooler
    transform: {
      column: { from: postgres.toCamel },
      value: { from: (v: unknown) => (v instanceof Date ? v.toISOString() : v) },
    },
    types: {
      numeric: { to: 1700, from: [1700, 20], serialize: (x: unknown) => String(x), parse: (x: string) => Number(x) },
      date: { to: 1082, from: [1082], serialize: (x: unknown) => String(x), parse: (x: string) => x },
    },
  });
  return g.__nsalgoSql;
}

export function postgresRepositories(url: string): Repositories {
  const sql = client(url);
  const svc = <T>(fn: (tx: Tx) => Promise<T>) =>
    sql.begin(async (tx) => {
      await tx`select set_config('app.role', 'service', true)`;
      return fn(tx as unknown as Tx);
    }) as Promise<T>;
  const asUser = <T>(userId: string, fn: (tx: Tx) => Promise<T>) =>
    sql.begin(async (tx) => {
      await tx`select set_config('app.user_id', ${userId}, true), set_config('app.role', 'member', true)`;
      return fn(tx as unknown as Tx);
    }) as Promise<T>;

  const userCols = (tx: Tx) => tx`id, email::text as email, role, email_verified_at, disabled_at, created_at, updated_at`;

  async function loadWatchlists(tx: Tx, userId: string, id?: string): Promise<Watchlist[]> {
    const lists = id
      ? await tx<Omit<Watchlist, "items">[]>`select id, user_id, name, position, created_at from watchlists where user_id = ${userId} and id = ${id}`
      : await tx<Omit<Watchlist, "items">[]>`select id, user_id, name, position, created_at from watchlists where user_id = ${userId} order by position, created_at`;
    if (!lists.length) return [];
    const items = await tx<WatchlistItem[]>`select id, watchlist_id, symbol, note, position, added_at from watchlist_items where watchlist_id in ${tx(lists.map((l) => l.id))} order by position, added_at`;
    return lists.map((l) => ({ ...l, items: items.filter((i) => i.watchlistId === l.id) }));
  }

  const setupFromRow = (r: { payload: AtlasSetup; status: AtlasSetup["status"] }): AtlasSetup => ({ ...r.payload, status: r.status });

  return {
    kind: "postgres",
    users: {
      create: ({ email, passwordHash, role = "member" }) =>
        svc(async (tx) => {
          const [u] = await tx<User[]>`insert into users (email, password_hash, role) values (${email.toLowerCase()}, ${passwordHash}, ${role}) returning ${userCols(tx)}`;
          await tx`insert into profiles (user_id) values (${u!.id}) on conflict do nothing`;
          await tx`insert into memberships (user_id, state) values (${u!.id}, 'free') on conflict do nothing`;
          return u!;
        }),
      findByEmail: (email) =>
        svc(async (tx) => (await tx<UserWithSecret[]>`select ${userCols(tx)}, password_hash from users where email = ${email.toLowerCase()}`)[0] ?? null),
      findById: (id) => svc(async (tx) => (await tx<User[]>`select ${userCols(tx)} from users where id = ${id}`)[0] ?? null),
      update: (id, patch) =>
        svc(async (tx) => {
          const cols: Record<string, unknown> = {};
          if (patch.role !== undefined) cols.role = patch.role;
          if (patch.emailVerifiedAt !== undefined) cols.email_verified_at = patch.emailVerifiedAt;
          if (patch.passwordHash !== undefined) cols.password_hash = patch.passwordHash;
          if (patch.disabledAt !== undefined) cols.disabled_at = patch.disabledAt;
          if (!Object.keys(cols).length) return (await tx<User[]>`select ${userCols(tx)} from users where id = ${id}`)[0] ?? null;
          return (await tx<User[]>`update users set ${tx(cols)} where id = ${id} returning ${userCols(tx)}`)[0] ?? null;
        }),
      list: ({ q, role, page, pageSize }) =>
        svc(async (tx) => {
          const where = tx`where (${q ?? null}::text is null or email ilike ${"%" + (q ?? "") + "%"}) and (${role ?? null}::text is null or role = ${role ?? null})`;
          const items = await tx<User[]>`select ${userCols(tx)} from users ${where} order by created_at desc limit ${pageSize} offset ${(page - 1) * pageSize}`;
          const count = (await tx<{ count: number }[]>`select count(*)::int as count from users ${where}`)[0]!.count;
          return { items, total: count };
        }),
      count: (opts) =>
        svc(async (tx) => (await tx<{ c: number }[]>`select count(*)::int as c from users where (${opts?.since ?? null}::timestamptz is null or created_at >= ${opts?.since ?? null})`)[0]!.c),
    },
    profiles: {
      get: (userId) => asUser(userId, async (tx) => (await tx<Profile[]>`select user_id, display_name, timezone, experience, default_mode, marketing_opt_in from profiles where user_id = ${userId}`)[0] ?? null),
      upsert: (p) =>
        asUser(p.userId, async (tx) => {
          await tx`insert into profiles (user_id, display_name, timezone, experience, default_mode, marketing_opt_in)
            values (${p.userId}, ${p.displayName}, ${p.timezone}, ${p.experience}, ${p.defaultMode}, ${p.marketingOptIn})
            on conflict (user_id) do update set display_name = excluded.display_name, timezone = excluded.timezone,
              experience = excluded.experience, default_mode = excluded.default_mode, marketing_opt_in = excluded.marketing_opt_in, updated_at = now()`;
          return p;
        }),
    },
    sessions: {
      create: (s) =>
        svc(async (tx) => (await tx<Session[]>`insert into sessions (user_id, token_hash, expires_at, ip, user_agent) values (${s.userId}, ${s.tokenHash}, ${s.expiresAt}, ${s.ip}, ${s.userAgent}) returning id, user_id, token_hash, expires_at, created_at, last_seen_at, host(ip) as ip, user_agent`)[0]!),
      findByTokenHash: (hash) =>
        svc(async (tx) => (await tx<Session[]>`select id, user_id, token_hash, expires_at, created_at, last_seen_at, host(ip) as ip, user_agent from sessions where token_hash = ${hash}`)[0] ?? null),
      touch: (id, expiresAt) => svc(async (tx) => void (await tx`update sessions set last_seen_at = now(), expires_at = ${expiresAt} where id = ${id}`)),
      delete: (id) => svc(async (tx) => void (await tx`delete from sessions where id = ${id}`)),
      deleteForUser: (userId) => svc(async (tx) => void (await tx`delete from sessions where user_id = ${userId}`)),
      purgeExpired: () => svc(async (tx) => (await tx`delete from sessions where expires_at < now()`).count),
    },
    tokens: {
      create: (t) =>
        svc(async (tx) => (await tx<OneTimeToken[]>`insert into one_time_tokens (user_id, purpose, token_hash, expires_at) values (${t.userId}, ${t.purpose}, ${t.tokenHash}, ${t.expiresAt}) returning id, user_id, purpose, token_hash, expires_at, used_at`)[0]!),
      findValid: (purpose, hash) =>
        svc(async (tx) => (await tx<OneTimeToken[]>`select id, user_id, purpose, token_hash, expires_at, used_at from one_time_tokens where purpose = ${purpose} and token_hash = ${hash} and used_at is null and expires_at > now()`)[0] ?? null),
      markUsed: (id) => svc(async (tx) => void (await tx`update one_time_tokens set used_at = now() where id = ${id}`)),
      invalidateForUser: (userId, purpose) => svc(async (tx) => void (await tx`update one_time_tokens set used_at = now() where user_id = ${userId} and purpose = ${purpose} and used_at is null`)),
    },
    billing: {
      listPlans: () => svc(async (tx) => tx<Plan[]>`select id, code, name, interval, amount, currency, stripe_price_id, active, features from plans order by code desc`),
      upsertPlan: (p) =>
        svc(async (tx) => (await tx<Plan[]>`insert into plans (code, name, interval, amount, currency, stripe_price_id, active, features)
          values (${p.code}, ${p.name}, ${p.interval}, ${p.amount}, ${p.currency}, ${p.stripePriceId}, ${p.active}, ${p.features})
          on conflict (code) do update set name = excluded.name, amount = excluded.amount, currency = excluded.currency,
            stripe_price_id = excluded.stripe_price_id, active = excluded.active, features = excluded.features, updated_at = now()
          returning id, code, name, interval, amount, currency, stripe_price_id, active, features`)[0]!),
      getSubscriptionForUser: (userId) =>
        svc(async (tx) => (await tx<Subscription[]>`select * from subscriptions where user_id = ${userId} order by updated_at desc limit 1`)[0] ?? null),
      getSubscriptionByProviderId: (pid) => svc(async (tx) => (await tx<Subscription[]>`select * from subscriptions where provider_subscription_id = ${pid}`)[0] ?? null),
      findUserIdByCustomer: (cid) => svc(async (tx) => (await tx<{ userId: string }[]>`select user_id from subscriptions where provider_customer_id = ${cid} limit 1`)[0]?.userId ?? null),
      upsertSubscription: (s) =>
        svc(async (tx) => {
          const row = {
            user_id: s.userId,
            plan_code: s.planCode,
            provider: s.provider,
            provider_customer_id: s.providerCustomerId,
            provider_subscription_id: s.providerSubscriptionId,
            status: s.status,
            current_period_end: s.currentPeriodEnd,
            cancel_at_period_end: s.cancelAtPeriodEnd,
          };
          const [sub] = s.providerSubscriptionId
            ? await tx<Subscription[]>`insert into subscriptions ${tx(row)} on conflict (provider_subscription_id) do update set
                plan_code = excluded.plan_code, status = excluded.status, current_period_end = excluded.current_period_end,
                cancel_at_period_end = excluded.cancel_at_period_end, provider_customer_id = excluded.provider_customer_id returning *`
            : await tx<Subscription[]>`insert into subscriptions ${tx(row)} returning *`;
          const state = ["active", "trialing"].includes(sub!.status) ? "active" : sub!.status === "past_due" || sub!.status === "unpaid" ? "past_due" : sub!.status === "canceled" ? "canceled" : "free";
          await tx`insert into memberships (user_id, state, source_subscription_id) values (${sub!.userId}, ${state}, ${sub!.id})
            on conflict (user_id) do update set state = excluded.state, source_subscription_id = excluded.source_subscription_id, updated_at = now()`;
          return sub!;
        }),
      listSubscriptions: ({ status, page, pageSize }) =>
        svc(async (tx) => {
          const items = await tx<(Subscription & { email: string })[]>`select s.*, u.email::text as email from subscriptions s join users u on u.id = s.user_id
            where (${status ?? null}::text is null or s.status = ${status ?? null}) order by s.updated_at desc limit ${pageSize} offset ${(page - 1) * pageSize}`;
          const c = (await tx<{ c: number }[]>`select count(*)::int as c from subscriptions where (${status ?? null}::text is null or status = ${status ?? null})`)[0]!.c;
          return { items, total: c };
        }),
      insertTransaction: (t) =>
        svc(async (tx) => (await tx<BillingTransaction[]>`insert into transactions (user_id, subscription_id, provider_invoice_id, amount, currency, status, hosted_invoice_url, created_at)
          values (${t.userId}, ${t.subscriptionId}, ${t.providerInvoiceId}, ${t.amount}, ${t.currency}, ${t.status}, ${t.hostedInvoiceUrl}, ${t.createdAt ?? new Date().toISOString()})
          on conflict (provider_invoice_id) do update set status = excluded.status, hosted_invoice_url = excluded.hosted_invoice_url returning *`)[0]!),
      listTransactions: (userId) => asUser(userId, async (tx) => tx<BillingTransaction[]>`select * from transactions where user_id = ${userId} order by created_at desc limit 100`),
      allTransactions: (since) => svc(async (tx) => tx<BillingTransaction[]>`select * from transactions where (${since ?? null}::timestamptz is null or created_at >= ${since ?? null})`),
      unmarkEvent: (id) => svc(async (tx) => void (await tx`delete from stripe_events where id = ${id}`)),
      markEventProcessed: (id, type) => svc(async (tx) => (await tx`insert into stripe_events (id, type) values (${id}, ${type}) on conflict do nothing`).count === 1),
    },
    watchlists: {
      list: (userId) => asUser(userId, (tx) => loadWatchlists(tx, userId)),
      get: (userId, id) => asUser(userId, async (tx) => (await loadWatchlists(tx, userId, id))[0] ?? null),
      create: (userId, name) =>
        asUser(userId, async (tx) => {
          const n = (await tx<{ n: number }[]>`select count(*)::int as n from watchlists where user_id = ${userId}`)[0]!.n;
          const [w] = await tx<Omit<Watchlist, "items">[]>`insert into watchlists (user_id, name, position) values (${userId}, ${name}, ${n}) returning id, user_id, name, position, created_at`;
          return { ...w!, items: [] };
        }),
      rename: (userId, id, name) =>
        asUser(userId, async (tx) => {
          await tx`update watchlists set name = ${name} where id = ${id} and user_id = ${userId}`;
          return (await loadWatchlists(tx, userId, id))[0] ?? null;
        }),
      delete: (userId, id) => asUser(userId, async (tx) => (await tx`delete from watchlists where id = ${id} and user_id = ${userId}`).count > 0),
      addItem: (userId, id, symbol, note = null) =>
        asUser(userId, async (tx) => {
          const owns = await tx`select 1 from watchlists where id = ${id} and user_id = ${userId}`;
          if (!owns.length) return null;
          const [item] = await tx<WatchlistItem[]>`insert into watchlist_items (watchlist_id, symbol, note, position)
            values (${id}, ${symbol}, ${note}, (select count(*) from watchlist_items where watchlist_id = ${id}))
            on conflict (watchlist_id, symbol) do update set note = coalesce(excluded.note, watchlist_items.note)
            returning id, watchlist_id, symbol, note, position, added_at`;
          return item ?? null;
        }),
      removeItem: (userId, id, symbol) =>
        asUser(userId, async (tx) => (await tx`delete from watchlist_items where watchlist_id = ${id} and symbol = ${symbol} and exists (select 1 from watchlists where id = ${id} and user_id = ${userId})`).count > 0),
      countAll: () => svc(async (tx) => (await tx<{ c: number }[]>`select count(*)::int as c from watchlists`)[0]!.c),
      popularSymbols: (limit) => svc(async (tx) => tx<{ symbol: string; count: number }[]>`select symbol, count(*)::int as count from watchlist_items group by symbol order by count desc limit ${limit}`),
    },
    alerts: {
      list: (userId) => asUser(userId, async (tx) => tx<Alert[]>`select * from alerts where user_id = ${userId} order by created_at desc`),
      create: (a) =>
        asUser(a.userId, async (tx) => (await tx<Alert[]>`insert into alerts (user_id, kind, symbol, threshold, channel, active) values (${a.userId}, ${a.kind}, ${a.symbol}, ${a.threshold}, ${a.channel}, ${a.active}) returning *`)[0]!),
      update: (userId, id, patch) =>
        asUser(userId, async (tx) => {
          const cols: Record<string, unknown> = {};
          if (patch.active !== undefined) cols.active = patch.active;
          if (patch.threshold !== undefined) cols.threshold = patch.threshold;
          if (!Object.keys(cols).length) return null;
          return (await tx<Alert[]>`update alerts set ${tx(cols)} where id = ${id} and user_id = ${userId} returning *`)[0] ?? null;
        }),
      delete: (userId, id) => asUser(userId, async (tx) => (await tx`delete from alerts where id = ${id} and user_id = ${userId}`).count > 0),
      listActive: (kind) => svc(async (tx) => tx<Alert[]>`select * from alerts where active and (${kind ?? null}::text is null or kind = ${kind ?? null})`),
      markTriggered: (id, at) => svc(async (tx) => void (await tx`update alerts set last_triggered_at = ${at} where id = ${id}`)),
    },
    notifications: {
      list: (userId, limit = 30) => asUser(userId, async (tx) => tx<Notification[]>`select * from notifications where user_id = ${userId} order by created_at desc limit ${limit}`),
      create: (n) =>
        svc(async (tx) => (await tx<Notification[]>`insert into notifications (user_id, title, body, href, kind) values (${n.userId}, ${n.title}, ${n.body}, ${n.href}, ${n.kind}) returning *`)[0]!),
      markRead: (userId, ids) =>
        asUser(userId, async (tx) => {
          if (ids === "all") await tx`update notifications set read_at = now() where user_id = ${userId} and read_at is null`;
          else if (ids.length) await tx`update notifications set read_at = now() where user_id = ${userId} and id in ${tx(ids)}`;
        }),
      unreadCount: (userId) => asUser(userId, async (tx) => (await tx<{ c: number }[]>`select count(*)::int as c from notifications where user_id = ${userId} and read_at is null`)[0]!.c),
    },
    education: {
      listCategories: () => svc(async (tx) => tx<EducationCategory[]>`select * from educational_categories order by position`),
      upsertCategory: (c) =>
        svc(async (tx) => (await tx<EducationCategory[]>`insert into educational_categories (slug, name, description, position) values (${c.slug}, ${c.name}, ${c.description}, ${c.position})
          on conflict (slug) do update set name = excluded.name, description = excluded.description, position = excluded.position returning *`)[0]!),
      deleteCategory: (id) =>
        svc(async (tx) => (await tx`delete from educational_categories c where id = ${id} and not exists (select 1 from educational_articles a where a.category_slug = c.slug)`).count > 0),
      listArticles: ({ category, q, difficulty, status = "published", featured, limit }) =>
        svc(async (tx) => tx<EducationArticle[]>`select * from educational_articles
          where (${status}::text = 'all' or status = ${status})
            and (${category ?? null}::text is null or category_slug = ${category ?? null})
            and (${difficulty ?? null}::text is null or difficulty = ${difficulty ?? null})
            and (${featured ?? null}::boolean is null or featured = ${featured ?? null})
            and (${q ?? null}::text is null or to_tsvector('english', title || ' ' || description || ' ' || content) @@ plainto_tsquery('english', ${q ?? ""}))
          order by coalesce(published_at, updated_at) desc limit ${limit ?? 200}`),
      getArticleBySlug: (slug) => svc(async (tx) => (await tx<EducationArticle[]>`select * from educational_articles where slug = ${slug}`)[0] ?? null),
      getArticleById: (id) => svc(async (tx) => (await tx<EducationArticle[]>`select * from educational_articles where id = ${id}`)[0] ?? null),
      upsertArticle: (a) =>
        svc(async (tx) => {
          const row = {
            slug: a.slug,
            title: a.title,
            description: a.description,
            author_name: a.authorName,
            category_slug: a.categorySlug,
            difficulty: a.difficulty,
            read_minutes: a.readMinutes,
            content: a.content,
            featured_image: a.featuredImage,
            featured: a.featured,
            status: a.status,
            related_slugs: a.relatedSlugs,
            published_at: a.publishedAt,
          };
          const [r] = a.id
            ? await tx<EducationArticle[]>`update educational_articles set ${tx(row)} where id = ${a.id} returning *`
            : await tx<EducationArticle[]>`insert into educational_articles ${tx(row)} returning *`;
          return r!;
        }),
      deleteArticle: (id) => svc(async (tx) => (await tx`delete from educational_articles where id = ${id}`).count > 0),
    },
    commentary: {
      list: ({ status = "published", limit }) =>
        svc(async (tx) => tx<Commentary[]>`select * from market_commentary where (${status}::text = 'all' or status = ${status}) order by coalesce(published_at, updated_at) desc limit ${limit ?? 100}`),
      get: (id) => svc(async (tx) => (await tx<Commentary[]>`select * from market_commentary where id = ${id}`)[0] ?? null),
      upsert: (c) =>
        svc(async (tx) => {
          const row = { title: c.title, body: c.body, author_name: c.authorName, tickers: c.tickers, status: c.status, published_at: c.publishedAt };
          const [r] = c.id
            ? await tx<Commentary[]>`update market_commentary set ${tx(row)}, updated_at = now() where id = ${c.id} returning *`
            : await tx<Commentary[]>`insert into market_commentary ${tx(row)} returning *`;
          return r!;
        }),
      delete: (id) => svc(async (tx) => (await tx`delete from market_commentary where id = ${id}`).count > 0),
    },
    atlas: {
      getActiveConfig: () => svc(async (tx) => (await tx<{ config: AtlasConfig }[]>`select config from atlas_config where active`)[0]?.config ?? null),
      saveConfig: (c) =>
        svc(async (tx) => {
          await tx`update atlas_config set active = false where active`;
          await tx`insert into atlas_config (version, config, active) values (${c.version}, ${tx.json(c as never)}, true)`;
        }),
      listConfigVersions: (limit) =>
        svc(async (tx) =>
          (await tx<{ version: string; createdAt: string; active: boolean; config: AtlasConfig }[]>`select version, created_at, active, config from atlas_config order by created_at desc limit ${limit}`).map((r) => ({
            version: r.version,
            updatedAt: r.createdAt,
            updatedBy: r.config.updatedBy,
            active: r.active,
          })),
        ),
      upsertSetup: (s) =>
        svc(async (tx) => {
          const existing = (await tx<{ payload: AtlasSetup; status: AtlasSetup["status"] }[]>`select payload, status from atlas_setups where id = ${s.id} for update`)[0];
          if (existing && ["invalidated", "target-reached", "expired"].includes(existing.status)) return setupFromRow(existing);
          const payload: AtlasSetup = existing ? { ...existing.payload, status: s.status, statusHistory: s.statusHistory } : s;
          const closed = s.statusHistory.find((h) => ["invalidated", "target-reached", "expired"].includes(h.status));
          await tx`insert into atlas_setups (id, symbol, mode, direction, trade_type, score, coverage, status, entry_low, entry_high, target_low, target_high,
              invalidation, payload, config_version, data_mode, generated_at, expires_at, closed_at)
            values (${s.id}, ${s.symbol}, ${s.mode}, ${s.direction}, ${s.tradeType}, ${s.score.value}, ${s.score.coverage}, ${s.status},
              ${s.entry.low}, ${s.entry.high}, ${s.target.low}, ${s.target.high}, ${s.invalidation}, ${tx.json(payload as never)},
              ${s.score.configVersion}, ${s.dataMode}, ${payload.generatedAt}, ${s.expiresAt}, ${closed?.at ?? null})
            on conflict (id) do update set status = excluded.status, payload = excluded.payload, closed_at = excluded.closed_at, updated_at = now()`;
          for (const h of s.statusHistory) {
            await tx`insert into atlas_setup_events (setup_id, status, price, at) values (${s.id}, ${h.status}, ${h.price}, ${h.at}) on conflict do nothing`;
          }
          return payload;
        }),
      getSetup: (id) => svc(async (tx) => {
        const r = (await tx<{ payload: AtlasSetup; status: AtlasSetup["status"] }[]>`select payload, status from atlas_setups where id = ${id}`)[0];
        return r ? setupFromRow(r) : null;
      }),
      listSetups: ({ mode, status, symbol, since, limit = 200 }) =>
        svc(async (tx) =>
          (
            await tx<{ payload: AtlasSetup; status: AtlasSetup["status"] }[]>`select payload, status from atlas_setups
              where (${mode ?? null}::text is null or mode = ${mode ?? null})
                and (${symbol?.toUpperCase() ?? null}::text is null or symbol = ${symbol?.toUpperCase() ?? null})
                and (${since ?? null}::timestamptz is null or generated_at >= ${since ?? null})
                and (${status ?? null}::text is null
                  or (${status ?? null} = 'open' and status not in ('invalidated','target-reached','expired'))
                  or (${status ?? null} = 'closed' and status in ('invalidated','target-reached','expired'))
                  or status = ${status ?? null})
              order by generated_at desc limit ${limit}`
          ).map(setupFromRow),
        ),
      countSetups: () => svc(async (tx) => (await tx<{ c: number }[]>`select count(*)::int as c from atlas_setups`)[0]!.c),
    },
    ops: {
      insertLog: (l: SystemLog) =>
        svc(async (tx) => void (await tx`insert into system_logs (id, level, scope, message, context, created_at) values (${l.id}, ${l.level}, ${l.scope}, ${l.message}, ${l.context ? tx.json(l.context as never) : null}, ${l.createdAt})`)),
      listLogs: ({ level, limit }) => svc(async (tx) => tx<SystemLog[]>`select * from system_logs where (${level ?? null}::text is null or level = ${level ?? null}) order by created_at desc limit ${limit}`),
      audit: (a) =>
        svc(async (tx) => void (await tx`insert into audit_logs (actor_id, action, target, metadata, ip) values (${a.actorId}, ${a.action}, ${a.target}, ${a.metadata ? tx.json(a.metadata as never) : null}, ${a.ip})`)),
      listAudit: (limit) => svc(async (tx) => tx`select id, actor_id, action, target, metadata, host(ip) as ip, created_at from audit_logs order by created_at desc limit ${limit}`) as never,
      getSiteContent: () => svc(async (tx) => (await tx<{ content: SiteContent }[]>`select content from site_content where id = 1`)[0]?.content ?? null),
      saveSiteContent: (c) =>
        svc(async (tx) => void (await tx`insert into site_content (id, content) values (1, ${tx.json(c as never)}) on conflict (id) do update set content = excluded.content, updated_at = now()`)),
      track: (e) =>
        svc(async (tx) => void (await tx`insert into analytics_events (name, user_id, anonymous_id, path, properties) values (${e.name}, ${e.userId}, ${e.anonymousId}, ${e.path}, ${e.properties ? tx.json(e.properties as never) : null})`)),
      eventCounts: (since) => svc(async (tx) => tx<{ name: string; count: number }[]>`select name, count(*)::int as count from analytics_events where created_at >= ${since} group by name order by count desc`),
      topProperty: (name, property, since, limit) =>
        svc(async (tx) => tx<{ value: string; count: number }[]>`select properties->>${property} as value, count(*)::int as count from analytics_events
          where name = ${name} and created_at >= ${since} and properties ? ${property} group by 1 order by 2 desc limit ${limit}`),
      distinctUsers: (since) => svc(async (tx) => (await tx<{ c: number }[]>`select count(distinct user_id)::int as c from analytics_events where created_at >= ${since} and user_id is not null`)[0]!.c),
      recordJob: (job, status, detail, id) =>
        svc(async (tx) => {
          if (id) {
            await tx`update job_runs set status = ${status}, finished_at = case when ${status} = 'running' then null else now() end, detail = coalesce(${detail ? tx.json(detail as never) : null}, detail) where id = ${id}`;
            return id;
          }
          return (await tx<{ id: string }[]>`insert into job_runs (job, status, detail) values (${job}, ${status}, ${detail ? tx.json(detail as never) : null}) returning id`)[0]!.id;
        }),
      listJobs: (limit) => svc(async (tx) => tx`select id, job, status, started_at, finished_at, detail from job_runs order by started_at desc limit ${limit}`) as never,
    },
  };
}
