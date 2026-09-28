/**
 * Resolves the Postgres connection URL. DATABASE_URL wins when it is a valid
 * URL; otherwise POSTGRES_URL, which the Vercel Supabase integration sets to
 * the transaction pooler. Keep in sync with scripts/migrate.mjs.
 */
export function databaseUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  for (const raw of [env.DATABASE_URL, env.POSTGRES_URL]) {
    const url = raw?.trim();
    if (url && URL.canParse(url)) return withoutUnknownParams(url);
  }
  return undefined;
}

/** True when a connection URL is configured but none of them parse. */
export function databaseUrlMalformed(env: NodeJS.ProcessEnv = process.env): boolean {
  return !databaseUrl(env) && [env.DATABASE_URL, env.POSTGRES_URL].some((v) => v?.trim());
}

/**
 * postgres.js forwards unknown query parameters to the server as runtime
 * settings; the integration's `supa=` marker would be rejected there.
 */
function withoutUnknownParams(url: string): string {
  const u = new URL(url);
  u.searchParams.delete("supa");
  return u.toString();
}
