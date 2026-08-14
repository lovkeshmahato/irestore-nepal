-- ============================================================================
-- Fix "permission denied for function is_staff" on public sell-request /
-- storage-upload inserts.
--
-- is_staff() and current_role_name() are referenced (with no explicit `TO`
-- clause, i.e. applying to every role) inside SELECT policies on
-- sell_requests, sell_request_photos, and storage.objects. Postgres
-- requires EXECUTE permission on any function used by a SELECT policy
-- whenever INSERT ... RETURNING is evaluated (which both `supabase-js`
-- `.insert().select()` and the Storage upload API use internally) — even
-- for a role, like anon, that will never satisfy the policy.
--
-- EXECUTE for anon was revoked during earlier hardening (0007/0008).
-- Restoring it is safe: both functions only reflect the calling role's own
-- identity, which is always false/null for anon, so it doesn't grant any
-- new read/write ability — it only unblocks policy evaluation.
-- ============================================================================

grant execute on function is_staff() to anon;
grant execute on function current_role_name() to anon;
