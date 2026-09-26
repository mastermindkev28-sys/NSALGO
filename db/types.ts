import type { AtlasConfig, AtlasMode, AtlasSetup, SetupStatus } from "@/types/atlas";
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
  Role,
  Session,
  SiteContent,
  Subscription,
  SystemLog,
  TokenPurpose,
  User,
  UserWithSecret,
  Watchlist,
  WatchlistItem,
} from "@/types/domain";

/**
 * Repository contracts. Two implementations exist: an in-memory store
 * (development / DATA_MODE=mock without DATABASE_URL) and PostgreSQL.
 * Business logic depends only on these interfaces.
 */
export interface Page<T> {
  items: T[];
  total: number;
}

export interface UsersRepo {
  create(input: { email: string; passwordHash: string; role?: Role }): Promise<User>;
  findByEmail(email: string): Promise<UserWithSecret | null>;
  findById(id: string): Promise<User | null>;
  update(id: string, patch: Partial<Pick<UserWithSecret, "role" | "emailVerifiedAt" | "passwordHash" | "disabledAt">>): Promise<User | null>;
  list(opts: { q?: string; role?: Role; page: number; pageSize: number }): Promise<Page<User>>;
  count(opts?: { since?: string }): Promise<number>;
}

export interface ProfilesRepo {
  get(userId: string): Promise<Profile | null>;
  upsert(p: Profile): Promise<Profile>;
}

export interface SessionsRepo {
  create(s: Omit<Session, "id" | "createdAt" | "lastSeenAt">): Promise<Session>;
  findByTokenHash(hash: string): Promise<Session | null>;
  touch(id: string, expiresAt: string): Promise<void>;
  delete(id: string): Promise<void>;
  deleteForUser(userId: string): Promise<void>;
  purgeExpired(): Promise<number>;
}

export interface TokensRepo {
  create(t: Omit<OneTimeToken, "id" | "usedAt">): Promise<OneTimeToken>;
  findValid(purpose: TokenPurpose, hash: string): Promise<OneTimeToken | null>;
  markUsed(id: string): Promise<void>;
  invalidateForUser(userId: string, purpose: TokenPurpose): Promise<void>;
}

export interface BillingRepo {
  listPlans(): Promise<Plan[]>;
  upsertPlan(p: Plan): Promise<Plan>;
  getSubscriptionForUser(userId: string): Promise<Subscription | null>;
  getSubscriptionByProviderId(providerSubscriptionId: string): Promise<Subscription | null>;
  findUserIdByCustomer(customerId: string): Promise<string | null>;
  upsertSubscription(s: Omit<Subscription, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<Subscription>;
  listSubscriptions(opts: { status?: string; page: number; pageSize: number }): Promise<Page<Subscription & { email: string }>>;
  insertTransaction(t: Omit<BillingTransaction, "id" | "createdAt"> & { createdAt?: string }): Promise<BillingTransaction>;
  listTransactions(userId: string): Promise<BillingTransaction[]>;
  allTransactions(since?: string): Promise<BillingTransaction[]>;
  markEventProcessed(eventId: string, type: string): Promise<boolean>; // false if already processed
  unmarkEvent(eventId: string): Promise<void>; // lets Stripe retry after a processing failure
}

export interface WatchlistsRepo {
  list(userId: string): Promise<Watchlist[]>;
  get(userId: string, id: string): Promise<Watchlist | null>;
  create(userId: string, name: string): Promise<Watchlist>;
  rename(userId: string, id: string, name: string): Promise<Watchlist | null>;
  delete(userId: string, id: string): Promise<boolean>;
  addItem(userId: string, id: string, symbol: string, note?: string | null): Promise<WatchlistItem | null>;
  removeItem(userId: string, id: string, symbol: string): Promise<boolean>;
  countAll(): Promise<number>;
  popularSymbols(limit: number): Promise<{ symbol: string; count: number }[]>;
}

export interface AlertsRepo {
  list(userId: string): Promise<Alert[]>;
  create(a: Omit<Alert, "id" | "createdAt" | "lastTriggeredAt">): Promise<Alert>;
  update(userId: string, id: string, patch: Partial<Pick<Alert, "active" | "threshold">>): Promise<Alert | null>;
  delete(userId: string, id: string): Promise<boolean>;
  listActive(kind?: Alert["kind"]): Promise<Alert[]>;
  markTriggered(id: string, at: string): Promise<void>;
}

export interface NotificationsRepo {
  list(userId: string, limit?: number): Promise<Notification[]>;
  create(n: Omit<Notification, "id" | "createdAt" | "readAt">): Promise<Notification>;
  markRead(userId: string, ids: string[] | "all"): Promise<void>;
  unreadCount(userId: string): Promise<number>;
}

export interface EducationRepo {
  listCategories(): Promise<EducationCategory[]>;
  upsertCategory(c: Omit<EducationCategory, "id"> & { id?: string }): Promise<EducationCategory>;
  deleteCategory(id: string): Promise<boolean>;
  listArticles(opts: { category?: string; q?: string; difficulty?: string; status?: "draft" | "published" | "all"; featured?: boolean; limit?: number }): Promise<EducationArticle[]>;
  getArticleBySlug(slug: string): Promise<EducationArticle | null>;
  getArticleById(id: string): Promise<EducationArticle | null>;
  upsertArticle(a: Omit<EducationArticle, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<EducationArticle>;
  deleteArticle(id: string): Promise<boolean>;
}

export interface CommentaryRepo {
  list(opts: { status?: "draft" | "published" | "all"; limit?: number }): Promise<Commentary[]>;
  get(id: string): Promise<Commentary | null>;
  upsert(c: Omit<Commentary, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<Commentary>;
  delete(id: string): Promise<boolean>;
}

export interface AtlasRepo {
  getActiveConfig(): Promise<AtlasConfig | null>;
  saveConfig(c: AtlasConfig): Promise<void>;
  listConfigVersions(limit: number): Promise<{ version: string; updatedAt: string; updatedBy: string | null; active: boolean }[]>;
  upsertSetup(s: AtlasSetup): Promise<AtlasSetup>; // preserves generatedAt + statusHistory of existing rows
  getSetup(id: string): Promise<AtlasSetup | null>;
  listSetups(opts: { mode?: AtlasMode; status?: SetupStatus | "open" | "closed"; symbol?: string; since?: string; limit?: number }): Promise<AtlasSetup[]>;
  countSetups(): Promise<number>;
}

export interface OpsRepo {
  insertLog(l: SystemLog): Promise<void>;
  listLogs(opts: { level?: SystemLog["level"]; limit: number }): Promise<SystemLog[]>;
  audit(a: Omit<AuditLog, "id" | "createdAt">): Promise<void>;
  listAudit(limit: number): Promise<AuditLog[]>;
  getSiteContent(): Promise<SiteContent | null>;
  saveSiteContent(c: SiteContent): Promise<void>;
  track(e: Omit<AnalyticsEvent, "id" | "createdAt">): Promise<void>;
  eventCounts(since: string): Promise<{ name: string; count: number }[]>;
  topProperty(name: string, property: string, since: string, limit: number): Promise<{ value: string; count: number }[]>;
  distinctUsers(since: string): Promise<number>;
  recordJob(job: string, status: "running" | "succeeded" | "failed", detail?: Record<string, unknown>, id?: string): Promise<string>;
  listJobs(limit: number): Promise<{ id: string; job: string; status: string; startedAt: string; finishedAt: string | null; detail: Record<string, unknown> | null }[]>;
}

export interface Repositories {
  kind: "memory" | "postgres" | "unavailable";
  users: UsersRepo;
  profiles: ProfilesRepo;
  sessions: SessionsRepo;
  tokens: TokensRepo;
  billing: BillingRepo;
  watchlists: WatchlistsRepo;
  alerts: AlertsRepo;
  notifications: NotificationsRepo;
  education: EducationRepo;
  commentary: CommentaryRepo;
  atlas: AtlasRepo;
  ops: OpsRepo;
}
