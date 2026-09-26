"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { can, type Permission } from "@/lib/auth/permissions";
import { requestMeta } from "@/lib/security/request";
import { saveAtlasConfig, getAtlasConfig } from "@/services/atlas/config-store";
import { audit } from "@/services/audit";
import { getViewer } from "@/services/membership";
import { isJob, runJob } from "@/services/jobs";
import { FACTOR_KEYS, type AtlasConfig } from "@/types/atlas";

export interface AdminState {
  ok?: boolean;
  error?: string;
  message?: string;
}

async function guard(permission: Permission) {
  const v = await getViewer();
  if (!v.user || !can(v.user.role, permission)) throw new Error("Forbidden");
  return v.user;
}

async function log(actorId: string, action: string, target: string | null, metadata?: Record<string, unknown>) {
  await audit(action, { actorId, target, metadata, ip: (await requestMeta()).ip });
}

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens.").max(80);

/* ── Education CMS ───────────────────────────────────────────────────────── */
const ArticleSchema = z.object({
  id: z.string().uuid().optional(),
  slug,
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(10).max(300),
  authorName: z.string().trim().min(2).max(80),
  categorySlug: slug,
  difficulty: z.enum(["foundational", "intermediate", "advanced"]),
  readMinutes: z.coerce.number().int().min(1).max(120),
  content: z.string().min(20).max(60_000),
  featuredImage: z.string().trim().url().max(500).nullable().or(z.literal("").transform(() => null)),
  featured: z.boolean(),
  status: z.enum(["draft", "published"]),
  relatedSlugs: z.array(slug).max(6),
});

export async function saveArticleAction(_: AdminState, form: FormData): Promise<AdminState> {
  let user;
  try {
    user = await guard("education.manage");
  } catch {
    return { error: "You don't have permission to manage education content." };
  }
  const parsed = ArticleSchema.safeParse({
    id: form.get("id") || undefined,
    slug: form.get("slug"),
    title: form.get("title"),
    description: form.get("description"),
    authorName: form.get("authorName"),
    categorySlug: form.get("categorySlug"),
    difficulty: form.get("difficulty"),
    readMinutes: form.get("readMinutes"),
    content: form.get("content"),
    featuredImage: form.get("featuredImage") ?? "",
    featured: form.get("featured") === "on",
    status: form.get("status"),
    relatedSlugs: String(form.get("relatedSlugs") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  });
  if (!parsed.success) return { error: parsed.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`).join(" · ") };
  const existing = parsed.data.id ? await db().education.getArticleById(parsed.data.id) : null;
  const publishedAt = parsed.data.status === "published" ? (existing?.publishedAt ?? new Date().toISOString()) : null;
  let saved;
  try {
    saved = await db().education.upsertArticle({ ...parsed.data, publishedAt });
  } catch (e) {
    return { error: (e as Error).message.includes("slug") || (e as Error).message.includes("duplicate") ? "That slug is already in use." : "Could not save article." };
  }
  await log(user.id, existing ? "education.article_updated" : "education.article_created", saved.slug, { status: saved.status });
  revalidatePath("/learn");
  revalidatePath(`/learn/${saved.slug}`);
  if (!existing) redirect(`/admin/education/${saved.id}?created=1`);
  return { ok: true, message: "Saved." };
}

export async function deleteArticleAction(form: FormData) {
  const user = await guard("education.manage");
  const id = z.string().uuid().parse(form.get("id"));
  const a = await db().education.getArticleById(id);
  await db().education.deleteArticle(id);
  await log(user.id, "education.article_deleted", a?.slug ?? id);
  revalidatePath("/learn");
  redirect("/admin/education");
}

export async function toggleFeaturedAction(form: FormData) {
  const user = await guard("education.manage");
  const id = z.string().uuid().parse(form.get("id"));
  const a = await db().education.getArticleById(id);
  if (!a) return;
  const { id: _id, createdAt, updatedAt, ...rest } = a;
  void createdAt;
  void updatedAt;
  await db().education.upsertArticle({ ...rest, id: _id, featured: !a.featured });
  await log(user.id, "education.article_featured", a.slug, { featured: !a.featured });
  revalidatePath("/admin/education");
  revalidatePath("/");
}

const CategorySchema = z.object({ id: z.string().uuid().optional(), slug, name: z.string().trim().min(2).max(60), description: z.string().trim().max(200), position: z.coerce.number().int().min(0).max(999) });

export async function saveCategoryAction(_: AdminState, form: FormData): Promise<AdminState> {
  let user;
  try {
    user = await guard("education.manage");
  } catch {
    return { error: "Forbidden." };
  }
  const parsed = CategorySchema.safeParse({ id: form.get("id") || undefined, slug: form.get("slug"), name: form.get("name"), description: form.get("description") ?? "", position: form.get("position") ?? 0 });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  await db().education.upsertCategory(parsed.data);
  await log(user.id, "education.category_saved", parsed.data.slug);
  revalidatePath("/admin/education");
  return { ok: true, message: "Category saved." };
}

export async function deleteCategoryAction(form: FormData) {
  const user = await guard("education.manage");
  const id = z.string().uuid().parse(form.get("id"));
  const ok = await db().education.deleteCategory(id);
  await log(user.id, "education.category_deleted", id, { ok });
  revalidatePath("/admin/education");
}

/* ── Market commentary ───────────────────────────────────────────────────── */
const CommentarySchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(10).max(8000),
  authorName: z.string().trim().min(2).max(80),
  tickers: z.array(z.string().regex(/^[A-Z.]{1,8}$/)).max(10),
  status: z.enum(["draft", "published"]),
});

export async function saveCommentaryAction(_: AdminState, form: FormData): Promise<AdminState> {
  let user;
  try {
    user = await guard("commentary.manage");
  } catch {
    return { error: "Forbidden." };
  }
  const parsed = CommentarySchema.safeParse({
    id: form.get("id") || undefined,
    title: form.get("title"),
    body: form.get("body"),
    authorName: form.get("authorName"),
    tickers: String(form.get("tickers") ?? "").split(",").map((t) => t.trim().toUpperCase()).filter(Boolean),
    status: form.get("status"),
  });
  if (!parsed.success) return { error: parsed.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`).join(" · ") };
  const existing = parsed.data.id ? await db().commentary.get(parsed.data.id) : null;
  const c = await db().commentary.upsert({ ...parsed.data, publishedAt: parsed.data.status === "published" ? (existing?.publishedAt ?? new Date().toISOString()) : null });
  await log(user.id, "commentary.saved", c.id, { status: c.status });
  revalidatePath("/news");
  revalidatePath("/admin/news");
  return { ok: true, message: existing ? "Commentary updated." : "Commentary created." };
}

export async function deleteCommentaryAction(form: FormData) {
  const user = await guard("commentary.manage");
  const id = z.string().uuid().parse(form.get("id"));
  await db().commentary.delete(id);
  await log(user.id, "commentary.deleted", id);
  revalidatePath("/admin/news");
}

/* ── Homepage content ────────────────────────────────────────────────────── */
export async function saveSiteContentAction(_: AdminState, form: FormData): Promise<AdminState> {
  let user;
  try {
    user = await guard("content.manage");
  } catch {
    return { error: "Forbidden." };
  }
  const parsed = z
    .object({
      heroEyebrow: z.string().trim().min(2).max(60),
      heroHeadline: z.string().trim().min(5).max(80),
      heroSubhead: z.string().trim().min(10).max(300),
      announcement: z.string().trim().max(200).transform((v) => v || null),
      featuredTickers: z.array(z.string().regex(/^[A-Z0-9.^-]{1,12}$/)).min(3).max(9),
    })
    .safeParse({
      heroEyebrow: form.get("heroEyebrow"),
      heroHeadline: form.get("heroHeadline"),
      heroSubhead: form.get("heroSubhead"),
      announcement: form.get("announcement") ?? "",
      featuredTickers: String(form.get("featuredTickers") ?? "").split(",").map((t) => t.trim().toUpperCase()).filter(Boolean),
    });
  if (!parsed.success) return { error: parsed.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`).join(" · ") };
  await db().ops.saveSiteContent({ ...parsed.data, updatedAt: new Date().toISOString() });
  await log(user.id, "content.homepage_updated", null);
  revalidatePath("/", "layout");
  return { ok: true, message: "Homepage content published." };
}

/* ── Users ───────────────────────────────────────────────────────────────── */
export async function updateUserAction(form: FormData) {
  const actor = await guard("users.manage");
  const id = z.string().uuid().parse(form.get("id"));
  const role = z.enum(["member", "analyst", "editor", "admin"]).optional().parse(form.get("role") || undefined);
  const disable = form.get("disable");
  if (id === actor.id && (role && role !== "admin")) throw new Error("You can't remove your own admin role.");
  if (role) await db().users.update(id, { role });
  if (disable === "1") {
    if (id === actor.id) throw new Error("You can't disable your own account.");
    await db().users.update(id, { disabledAt: new Date().toISOString() });
    await db().sessions.deleteForUser(id);
  } else if (disable === "0") await db().users.update(id, { disabledAt: null });
  await log(actor.id, "users.updated", id, { role, disable });
  revalidatePath("/admin/users");
}

/* ── Plans (pricing is configured here, never hard-coded) ────────────────── */
export async function savePlanAction(_: AdminState, form: FormData): Promise<AdminState> {
  let user;
  try {
    user = await guard("users.manage");
  } catch {
    return { error: "Only administrators can change pricing." };
  }
  const parsed = z
    .object({
      code: z.enum(["monthly", "annual"]),
      name: z.string().trim().min(2).max(40),
      amount: z.string().trim().transform((v, ctx) => {
        if (!v) return null;
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0 || n > 100_000) {
          ctx.addIssue({ code: "custom", message: "Invalid amount" });
          return z.NEVER;
        }
        return Math.round(n * 100);
      }),
      currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
      stripePriceId: z.string().trim().max(120).transform((v) => v || null),
      active: z.boolean(),
    })
    .safeParse({ code: form.get("code"), name: form.get("name"), amount: form.get("amount") ?? "", currency: form.get("currency") ?? "USD", stripePriceId: form.get("stripePriceId") ?? "", active: form.get("active") === "on" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const current = (await db().billing.listPlans()).find((p) => p.code === parsed.data.code);
  await db().billing.upsertPlan({ id: current?.id ?? crypto.randomUUID(), interval: parsed.data.code === "annual" ? "year" : "month", features: current?.features ?? [], ...parsed.data });
  await log(user.id, "billing.plan_updated", parsed.data.code, { amount: parsed.data.amount, active: parsed.data.active });
  revalidatePath("/pricing");
  return { ok: true, message: `${parsed.data.name} plan saved.` };
}

/* ── Atlas configuration ─────────────────────────────────────────────────── */
export async function saveAtlasConfigAction(_: AdminState, form: FormData): Promise<AdminState> {
  let user;
  try {
    user = await guard("atlas.configure");
  } catch {
    return { error: "Forbidden." };
  }
  const cur = await getAtlasConfig();
  const weight = (mode: "day" | "swing", k: string) => {
    const n = Number(form.get(`w_${mode}_${k}`));
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : cur.weights[mode][k as keyof AtlasConfig["weights"]["day"]];
  };
  const weights = {
    day: Object.fromEntries(FACTOR_KEYS.map((k) => [k, weight("day", k)])) as AtlasConfig["weights"]["day"],
    swing: Object.fromEntries(FACTOR_KEYS.map((k) => [k, weight("swing", k)])) as AtlasConfig["weights"]["swing"],
  };
  if (Object.values(weights.day).every((w) => w === 0) || Object.values(weights.swing).every((w) => w === 0)) return { error: "Each mode needs at least one non-zero weight." };
  const T = z.object({
    minScore: z.coerce.number().int().min(0).max(100),
    minCoverage: z.coerce.number().min(0).max(1),
    maxSetupsPerRun: z.coerce.number().int().min(1).max(50),
    minOptionOpenInterest: z.coerce.number().int().min(0).max(1_000_000),
    maxOptionSpreadPct: z.coerce.number().min(0.5).max(100),
  }).safeParse(Object.fromEntries(["minScore", "minCoverage", "maxSetupsPerRun", "minOptionOpenInterest", "maxOptionSpreadPct"].map((k) => [k, form.get(k)])));
  if (!T.success) return { error: T.error.issues[0]?.message };
  const list = (name: string) => String(form.get(name) ?? "").split(/[\s,]+/).map((t) => t.trim().toUpperCase()).filter((t) => /^[A-Z.]{1,8}$/.test(t));
  const universe = [...new Set(list("universe"))];
  if (universe.length < 5 || universe.length > 500) return { error: "Universe must contain 5–500 symbols." };
  const saved = await saveAtlasConfig({ ...cur, weights, thresholds: T.data, universe, featuredTickers: list("featuredTickers").slice(0, 12) }, user.email);
  await log(user.id, "atlas.config_saved", saved.version);
  revalidatePath("/admin/atlas");
  return { ok: true, message: `Configuration ${saved.version} is now active. New scans use it immediately.` };
}

/* ── Jobs ────────────────────────────────────────────────────────────────── */
export async function runJobAction(form: FormData) {
  const user = await guard("system.view");
  const job = String(form.get("job"));
  if (!isJob(job)) throw new Error("Unknown job");
  await log(user.id, "system.job_run", job);
  await runJob(job);
  revalidatePath("/admin/system");
}
