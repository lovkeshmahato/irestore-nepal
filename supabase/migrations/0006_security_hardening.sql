-- ============================================================================
-- Security hardening per Supabase advisor: pin search_path, and restrict
-- EXECUTE on functions that are only meant to run as triggers (never called
-- directly via RPC) so they don't appear in the public REST API surface.
-- ============================================================================
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger-only functions: Postgres fires triggers regardless of the
-- invoking role's EXECUTE grant on the trigger function (it runs under the
-- function owner via SECURITY DEFINER), so revoking direct RPC access here
-- does not break the triggers themselves.
revoke execute on function guard_profile_role_change() from public, anon, authenticated;
revoke execute on function sync_invoice_totals() from public, anon, authenticated;
revoke execute on function create_warranty_on_delivery() from public, anon, authenticated;
