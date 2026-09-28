#!/usr/bin/env node
/**
 * Applies SQL migrations in db/migrations (lexical order) to DATABASE_URL, or
 * POSTGRES_URL when DATABASE_URL is unset or malformed (see db/url.ts).
 * Tracks applied files in schema_migrations. Usage: DATABASE_URL=... npm run db:migrate
 *
 * With --if-configured (used by the Vercel build) a missing URL is a no-op
 * instead of an error, so deploys without a database still build.
 */
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

function databaseUrl() {
  for (const raw of [process.env.DATABASE_URL, process.env.POSTGRES_URL]) {
    const url = raw?.trim();
    if (url && URL.canParse(url)) {
      const u = new URL(url);
      u.searchParams.delete("supa");
      return u.toString();
    }
  }
  return undefined;
}

const url = databaseUrl();
if (!url) {
  if (process.argv.includes("--if-configured")) {
    console.log("No database URL configured; skipping migrations.");
    process.exit(0);
  }
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const sql = postgres(url, { max: 1, prepare: false });
const dir = path.join(process.cwd(), "db", "migrations");
try {
  await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
  const applied = new Set((await sql`select name from schema_migrations`).map((r) => r.name));
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (applied.has(file)) continue;
    console.log(`Applying ${file}…`);
    await sql.begin(async (tx) => {
      await tx.unsafe(fs.readFileSync(path.join(dir, file), "utf8"));
      await tx`insert into schema_migrations (name) values (${file})`;
    });
  }
  console.log("Migrations complete.");
} catch (e) {
  console.error("Migration failed:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
