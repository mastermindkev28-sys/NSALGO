-- Grants the site owner's account the admin role. Fails (and is retried on the
-- next deploy) if the account has not been registered yet, so the grant is
-- never silently skipped.
do $$
begin
  update users set role = 'admin' where email = 'kcfx128@gmail.com';
  if not found then
    raise exception 'Owner account kcfx128@gmail.com does not exist yet; sign up first, then redeploy.';
  end if;
end $$;
