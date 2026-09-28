-- ─────────────────────────────────────────────────────────────────────────────
-- Supabase exposes the `public` schema through its Data API to the `anon` and
-- `authenticated` roles, and the anon key is public. NSALGO never uses the Data
-- API — the server connects to Postgres directly — so those roles get nothing.
-- Every table also gets RLS (not forced, so the owning role the app connects
-- as is unaffected); tables without policies deny all other roles.
-- A no-op on plain Postgres, where these roles don't exist.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  r text;
  t record;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on all tables in schema public from %I', r);
      execute format('revoke all on all sequences in schema public from %I', r);
      execute format('revoke all on all functions in schema public from %I', r);
      execute format('revoke all on schema app from %I', r);
      execute format('revoke all on all functions in schema app from %I', r);
      execute format('alter default privileges in schema public revoke all on tables from %I', r);
      execute format('alter default privileges in schema public revoke all on sequences from %I', r);
      execute format('alter default privileges in schema public revoke all on functions from %I', r);
    end if;
  end loop;

  for t in select tablename from pg_tables where schemaname = 'public' and not rowsecurity loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;
