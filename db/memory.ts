import "server-only";
/**
 * In-memory repositories for development and DATA_MODE=mock without a
 * database. State lives on globalThis (survives hot reload) and, in
 * development, is snapshotted to .data/nsalgo-dev.json so accounts and
 * watchlists persist across restarts. Never used when DATABASE_URL is set.
 */
import fs from "node:fs";
import path from "node:path";
import type { AtlasConfig, AtlasSetup } from "@/types/atlas";
import type { Commentary } from "@/types/news";
import type {
  Alert,
  AnalyticsEvent,
  AuditLog,
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
  UserWithSecret,
  Watchlist,
} from "@/types/domain";
import { TERMINAL } from "@/services/atlas/lifecycle";
import type { Repositories } from "./types";
import { seedState } from "./seed";

export interface MemoryState {
  users: UserWithSecret[];
  profiles: Profile[];
  sessions: Session[];
  tokens: OneTimeToken[];
  plans: Plan[];
  subscriptions: Subscription[];
  transactions: BillingTransaction[];
  stripeEvents: string[];
  watchlists: Watchlist[];
  alerts: Alert[];
  notifications: Notification[];
  categories: EducationCategory[];
  articles: EducationArticle[];
  commentary: Commentary[];
  atlasConfigs: (AtlasConfig & { active: boolean })[];
  setups: AtlasSetup[];
  logs: SystemLog[];
  audit: AuditLog[];
  siteContent: SiteContent | null;
  analytics: AnalyticsEvent[];
  jobs: { id: string; job: string; status: string; startedAt: string; finishedAt: string | null; detail: Record<string, unknown> | null }[];
}

const SNAPSHOT = path.join(process.cwd(), ".data", "nsalgo-dev.json");
const g = globalThis as unknown as { __nsalgoMem?: MemoryState; __nsalgoMemTimer?: ReturnType<typeof setTimeout> };

function load(): MemoryState {
  if (g.__nsalgoMem) return g.__nsalgoMem;
  let state: MemoryState | null = null;
  if (process.env.NODE_ENV === "development") {
    try {
      state = JSON.parse(fs.readFileSync(SNAPSHOT, "utf8")) as MemoryState;
    } catch {
      state = null;
    }
  }
  g.__nsalgoMem = state ?? seedState();
  return g.__nsalgoMem;
}

function persist() {
  if (process.env.NODE_ENV !== "development") return;
  if (g.__nsalgoMemTimer) clearTimeout(g.__nsalgoMemTimer);
  g.__nsalgoMemTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(SNAPSHOT), { recursive: true });
      fs.writeFileSync(SNAPSHOT, JSON.stringify(g.__nsalgoMem));
    } catch {
      /* read-only filesystem — keep in memory only */
    }
  }, 250);
}

const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();
const strip = ({ passwordHash, ...u }: UserWithSecret) => {
  void passwordHash;
  return u;
};

export function memoryRepositories(): Repositories {
  const s = () => load();
  const write = <T>(v: T): T => {
    persist();
    return v;
  };

  return {
    kind: "memory",
    users: {
      async create({ email, passwordHash, role = "member" }) {
        const u: UserWithSecret = { id: uuid(), email: email.toLowerCase(), passwordHash, role, emailVerifiedAt: null, createdAt: now(), updatedAt: now(), disabledAt: null };
        s().users.push(u);
        return write(strip(u));
      },
      async findByEmail(email) {
        return s().users.find((u) => u.email === email.toLowerCase()) ?? null;
      },
      async findById(id) {
        const u = s().users.find((x) => x.id === id);
        return u ? strip(u) : null;
      },
      async update(id, patch) {
        const u = s().users.find((x) => x.id === id);
        if (!u) return null;
        Object.assign(u, patch, { updatedAt: now() });
        return write(strip(u));
      },
      async list({ q, role, page, pageSize }) {
        let rows = s().users;
        if (q) rows = rows.filter((u) => u.email.includes(q.toLowerCase()));
        if (role) rows = rows.filter((u) => u.role === role);
        rows = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return { items: rows.slice((page - 1) * pageSize, page * pageSize).map(strip), total: rows.length };
      },
      async count(opts) {
        return s().users.filter((u) => !opts?.since || u.createdAt >= opts.since).length;
      },
    },
    profiles: {
      async get(userId) {
        return s().profiles.find((p) => p.userId === userId) ?? null;
      },
      async upsert(p) {
        const list = s().profiles;
        const i = list.findIndex((x) => x.userId === p.userId);
        if (i >= 0) list[i] = p;
        else list.push(p);
        return write(p);
      },
    },
    sessions: {
      async create(x) {
        const sess: Session = { ...x, id: uuid(), createdAt: now(), lastSeenAt: now() };
        s().sessions.push(sess);
        return write(sess);
      },
      async findByTokenHash(hash) {
        return s().sessions.find((x) => x.tokenHash === hash) ?? null;
      },
      async touch(id, expiresAt) {
        const x = s().sessions.find((y) => y.id === id);
        if (x) {
          x.lastSeenAt = now();
          x.expiresAt = expiresAt;
          persist();
        }
      },
      async delete(id) {
        s().sessions = s().sessions.filter((x) => x.id !== id);
        persist();
      },
      async deleteForUser(userId) {
        s().sessions = s().sessions.filter((x) => x.userId !== userId);
        persist();
      },
      async purgeExpired() {
        const before = s().sessions.length;
        s().sessions = s().sessions.filter((x) => x.expiresAt > now());
        persist();
        return before - s().sessions.length;
      },
    },
    tokens: {
      async create(t) {
        const tok: OneTimeToken = { ...t, id: uuid(), usedAt: null };
        s().tokens.push(tok);
        return write(tok);
      },
      async findValid(purpose, hash) {
        return s().tokens.find((t) => t.purpose === purpose && t.tokenHash === hash && !t.usedAt && t.expiresAt > now()) ?? null;
      },
      async markUsed(id) {
        const t = s().tokens.find((x) => x.id === id);
        if (t) t.usedAt = now();
        persist();
      },
      async invalidateForUser(userId, purpose) {
        for (const t of s().tokens) if (t.userId === userId && t.purpose === purpose && !t.usedAt) t.usedAt = now();
        persist();
      },
    },
    billing: {
      async listPlans() {
        return s().plans;
      },
      async upsertPlan(p) {
        const i = s().plans.findIndex((x) => x.code === p.code);
        if (i >= 0) s().plans[i] = p;
        else s().plans.push(p);
        return write(p);
      },
      async getSubscriptionForUser(userId) {
        return [...s().subscriptions].filter((x) => x.userId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
      },
      async getSubscriptionByProviderId(pid) {
        return s().subscriptions.find((x) => x.providerSubscriptionId === pid) ?? null;
      },
      async findUserIdByCustomer(cid) {
        return s().subscriptions.find((x) => x.providerCustomerId === cid)?.userId ?? null;
      },
      async upsertSubscription(sub) {
        const list = s().subscriptions;
        const existing = list.find((x) => (sub.id && x.id === sub.id) || (sub.providerSubscriptionId && x.providerSubscriptionId === sub.providerSubscriptionId));
        if (existing) {
          Object.assign(existing, sub, { id: existing.id, updatedAt: now() });
          return write(existing);
        }
        const created: Subscription = { ...sub, id: sub.id ?? uuid(), createdAt: now(), updatedAt: now() };
        list.push(created);
        return write(created);
      },
      async listSubscriptions({ status, page, pageSize }) {
        let rows = s().subscriptions;
        if (status) rows = rows.filter((x) => x.status === status);
        rows = [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        const items = rows.slice((page - 1) * pageSize, page * pageSize).map((x) => ({ ...x, email: s().users.find((u) => u.id === x.userId)?.email ?? "—" }));
        return { items, total: rows.length };
      },
      async insertTransaction(t) {
        const existing = t.providerInvoiceId ? s().transactions.find((x) => x.providerInvoiceId === t.providerInvoiceId) : undefined;
        if (existing) {
          Object.assign(existing, t);
          return write(existing);
        }
        const tx: BillingTransaction = { ...t, id: uuid(), createdAt: t.createdAt ?? now() };
        s().transactions.push(tx);
        return write(tx);
      },
      async listTransactions(userId) {
        return s()
          .transactions.filter((t) => t.userId === userId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
      async allTransactions(since) {
        return s().transactions.filter((t) => !since || t.createdAt >= since);
      },
      async unmarkEvent(id) {
        s().stripeEvents = s().stripeEvents.filter((e) => e !== id);
        persist();
      },
      async markEventProcessed(id) {
        if (s().stripeEvents.includes(id)) return false;
        s().stripeEvents.push(id);
        persist();
        return true;
      },
    },
    watchlists: {
      async list(userId) {
        return s()
          .watchlists.filter((w) => w.userId === userId)
          .sort((a, b) => a.position - b.position);
      },
      async get(userId, id) {
        return s().watchlists.find((w) => w.id === id && w.userId === userId) ?? null;
      },
      async create(userId, name) {
        const mine = s().watchlists.filter((w) => w.userId === userId);
        if (mine.some((w) => w.name.toLowerCase() === name.toLowerCase())) throw new Error("A watchlist with that name already exists.");
        const w: Watchlist = { id: uuid(), userId, name, position: mine.length, createdAt: now(), items: [] };
        s().watchlists.push(w);
        return write(w);
      },
      async rename(userId, id, name) {
        const w = s().watchlists.find((x) => x.id === id && x.userId === userId);
        if (!w) return null;
        w.name = name;
        return write(w);
      },
      async delete(userId, id) {
        const before = s().watchlists.length;
        s().watchlists = s().watchlists.filter((w) => !(w.id === id && w.userId === userId));
        persist();
        return s().watchlists.length < before;
      },
      async addItem(userId, id, symbol, note = null) {
        const w = s().watchlists.find((x) => x.id === id && x.userId === userId);
        if (!w) return null;
        const existing = w.items.find((i) => i.symbol === symbol);
        if (existing) return existing;
        const item = { id: uuid(), watchlistId: id, symbol, note, position: w.items.length, addedAt: now() };
        w.items.push(item);
        return write(item);
      },
      async removeItem(userId, id, symbol) {
        const w = s().watchlists.find((x) => x.id === id && x.userId === userId);
        if (!w) return false;
        const before = w.items.length;
        w.items = w.items.filter((i) => i.symbol !== symbol);
        persist();
        return w.items.length < before;
      },
      async countAll() {
        return s().watchlists.length;
      },
      async popularSymbols(limit) {
        const counts = new Map<string, number>();
        for (const w of s().watchlists) for (const i of w.items) counts.set(i.symbol, (counts.get(i.symbol) ?? 0) + 1);
        return [...counts.entries()]
          .map(([symbol, count]) => ({ symbol, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);
      },
    },
    alerts: {
      async list(userId) {
        return s().alerts.filter((a) => a.userId === userId);
      },
      async create(a) {
        const alert: Alert = { ...a, id: uuid(), createdAt: now(), lastTriggeredAt: null };
        s().alerts.push(alert);
        return write(alert);
      },
      async update(userId, id, patch) {
        const a = s().alerts.find((x) => x.id === id && x.userId === userId);
        if (!a) return null;
        Object.assign(a, patch);
        return write(a);
      },
      async delete(userId, id) {
        const before = s().alerts.length;
        s().alerts = s().alerts.filter((a) => !(a.id === id && a.userId === userId));
        persist();
        return s().alerts.length < before;
      },
      async listActive(kind) {
        return s().alerts.filter((a) => a.active && (!kind || a.kind === kind));
      },
      async markTriggered(id, at) {
        const a = s().alerts.find((x) => x.id === id);
        if (a) a.lastTriggeredAt = at;
        persist();
      },
    },
    notifications: {
      async list(userId, limit = 30) {
        return s()
          .notifications.filter((n) => n.userId === userId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, limit);
      },
      async create(n) {
        const note: Notification = { ...n, id: uuid(), createdAt: now(), readAt: null };
        s().notifications.push(note);
        return write(note);
      },
      async markRead(userId, ids) {
        for (const n of s().notifications) if (n.userId === userId && !n.readAt && (ids === "all" || ids.includes(n.id))) n.readAt = now();
        persist();
      },
      async unreadCount(userId) {
        return s().notifications.filter((n) => n.userId === userId && !n.readAt).length;
      },
    },
    education: {
      async listCategories() {
        return [...s().categories].sort((a, b) => a.position - b.position);
      },
      async upsertCategory(c) {
        const list = s().categories;
        const existing = list.find((x) => (c.id && x.id === c.id) || x.slug === c.slug);
        if (existing) {
          Object.assign(existing, c, { id: existing.id });
          return write(existing);
        }
        const created = { ...c, id: c.id ?? uuid() };
        list.push(created);
        return write(created);
      },
      async deleteCategory(id) {
        const cat = s().categories.find((c) => c.id === id);
        if (!cat || s().articles.some((a) => a.categorySlug === cat.slug)) return false;
        s().categories = s().categories.filter((c) => c.id !== id);
        persist();
        return true;
      },
      async listArticles({ category, q, difficulty, status = "published", featured, limit }) {
        let rows = s().articles;
        if (status !== "all") rows = rows.filter((a) => a.status === status);
        if (category) rows = rows.filter((a) => a.categorySlug === category);
        if (difficulty) rows = rows.filter((a) => a.difficulty === difficulty);
        if (featured !== undefined) rows = rows.filter((a) => a.featured === featured);
        if (q) {
          const t = q.toLowerCase();
          rows = rows.filter((a) => a.title.toLowerCase().includes(t) || a.description.toLowerCase().includes(t) || a.content.toLowerCase().includes(t));
        }
        rows = [...rows].sort((a, b) => (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt));
        return limit ? rows.slice(0, limit) : rows;
      },
      async getArticleBySlug(slug) {
        return s().articles.find((a) => a.slug === slug) ?? null;
      },
      async getArticleById(id) {
        return s().articles.find((a) => a.id === id) ?? null;
      },
      async upsertArticle(a) {
        const list = s().articles;
        const conflict = list.find((x) => x.slug === a.slug && x.id !== a.id);
        if (conflict) throw new Error("An article with that slug already exists.");
        const existing = a.id ? list.find((x) => x.id === a.id) : undefined;
        if (existing) {
          Object.assign(existing, a, { id: existing.id, updatedAt: now() });
          return write(existing);
        }
        const created: EducationArticle = { ...a, id: uuid(), createdAt: now(), updatedAt: now() };
        list.push(created);
        return write(created);
      },
      async deleteArticle(id) {
        const before = s().articles.length;
        s().articles = s().articles.filter((a) => a.id !== id);
        persist();
        return s().articles.length < before;
      },
    },
    commentary: {
      async list({ status = "published", limit }) {
        let rows = s().commentary;
        if (status !== "all") rows = rows.filter((c) => c.status === status);
        rows = [...rows].sort((a, b) => (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt));
        return limit ? rows.slice(0, limit) : rows;
      },
      async get(id) {
        return s().commentary.find((c) => c.id === id) ?? null;
      },
      async upsert(c) {
        const existing = c.id ? s().commentary.find((x) => x.id === c.id) : undefined;
        if (existing) {
          Object.assign(existing, c, { id: existing.id, updatedAt: now() });
          return write(existing);
        }
        const created: Commentary = { ...c, id: uuid(), createdAt: now(), updatedAt: now() };
        s().commentary.push(created);
        return write(created);
      },
      async delete(id) {
        const before = s().commentary.length;
        s().commentary = s().commentary.filter((c) => c.id !== id);
        persist();
        return s().commentary.length < before;
      },
    },
    atlas: {
      async getActiveConfig() {
        const c = s().atlasConfigs.find((x) => x.active);
        if (!c) return null;
        const { active, ...rest } = c;
        void active;
        return rest;
      },
      async saveConfig(c) {
        for (const x of s().atlasConfigs) x.active = false;
        s().atlasConfigs.push({ ...c, active: true });
        persist();
      },
      async listConfigVersions(limit) {
        return [...s().atlasConfigs]
          .reverse()
          .slice(0, limit)
          .map((c) => ({ version: c.version, updatedAt: c.updatedAt, updatedBy: c.updatedBy, active: c.active }));
      },
      async upsertSetup(setup) {
        const list = s().setups;
        const i = list.findIndex((x) => x.id === setup.id);
        if (i >= 0) {
          const prev = list[i]!;
          // Generation facts are immutable; lifecycle only moves forward.
          const merged: AtlasSetup = TERMINAL.includes(prev.status)
            ? prev
            : { ...prev, status: setup.status, statusHistory: setup.statusHistory.length >= prev.statusHistory.length ? setup.statusHistory : prev.statusHistory };
          list[i] = merged;
          persist();
          return merged;
        }
        list.push(setup);
        if (list.length > 5000) list.splice(0, list.length - 5000);
        return write(setup);
      },
      async getSetup(id) {
        return s().setups.find((x) => x.id === id) ?? null;
      },
      async listSetups({ mode, status, symbol, since, limit = 200 }) {
        let rows = s().setups;
        if (mode) rows = rows.filter((x) => x.mode === mode);
        if (symbol) rows = rows.filter((x) => x.symbol === symbol.toUpperCase());
        if (since) rows = rows.filter((x) => x.generatedAt >= since);
        if (status === "open") rows = rows.filter((x) => !TERMINAL.includes(x.status));
        else if (status === "closed") rows = rows.filter((x) => TERMINAL.includes(x.status));
        else if (status) rows = rows.filter((x) => x.status === status);
        return [...rows].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)).slice(0, limit);
      },
      async countSetups() {
        return s().setups.length;
      },
    },
    ops: {
      async insertLog(l) {
        s().logs.unshift(l);
        if (s().logs.length > 2000) s().logs.length = 2000;
      },
      async listLogs({ level, limit }) {
        return s()
          .logs.filter((l) => !level || l.level === level)
          .slice(0, limit);
      },
      async audit(a) {
        s().audit.unshift({ ...a, id: uuid(), createdAt: now() });
        if (s().audit.length > 5000) s().audit.length = 5000;
        persist();
      },
      async listAudit(limit) {
        return s().audit.slice(0, limit);
      },
      async getSiteContent() {
        return s().siteContent;
      },
      async saveSiteContent(c) {
        s().siteContent = c;
        persist();
      },
      async track(e) {
        s().analytics.push({ ...e, id: uuid(), createdAt: now() });
        if (s().analytics.length > 20000) s().analytics.splice(0, 5000);
      },
      async eventCounts(since) {
        const m = new Map<string, number>();
        for (const e of s().analytics) if (e.createdAt >= since) m.set(e.name, (m.get(e.name) ?? 0) + 1);
        return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
      },
      async topProperty(name, property, since, limit) {
        const m = new Map<string, number>();
        for (const e of s().analytics) {
          if (e.name !== name || e.createdAt < since) continue;
          const v = e.properties?.[property];
          if (typeof v === "string") m.set(v, (m.get(v) ?? 0) + 1);
        }
        return [...m.entries()]
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);
      },
      async distinctUsers(since) {
        return new Set(s().analytics.filter((e) => e.createdAt >= since && e.userId).map((e) => e.userId)).size;
      },
      async recordJob(job, status, detail, id) {
        if (id) {
          const j = s().jobs.find((x) => x.id === id);
          if (j) {
            j.status = status;
            j.finishedAt = status === "running" ? null : now();
            j.detail = detail ?? j.detail;
          }
          return id;
        }
        const nid = uuid();
        s().jobs.unshift({ id: nid, job, status, startedAt: now(), finishedAt: null, detail: detail ?? null });
        if (s().jobs.length > 500) s().jobs.length = 500;
        return nid;
      },
      async listJobs(limit) {
        return s().jobs.slice(0, limit);
      },
    },
  };
}
