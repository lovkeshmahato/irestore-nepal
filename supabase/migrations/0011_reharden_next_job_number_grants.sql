-- ============================================================================
-- CREATE FUNCTION re-triggers ALTER DEFAULT PRIVILEGES, which auto-grants
-- EXECUTE to anon/authenticated directly (not via the PUBLIC pseudo-role).
-- The 0010 recreate of next_job_number() re-opened that grant; re-revoke it.
-- ============================================================================

revoke execute on function next_job_number() from public;
revoke execute on function next_job_number() from anon;
grant execute on function next_job_number() to authenticated;
