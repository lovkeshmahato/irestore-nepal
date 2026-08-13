-- ============================================================================
-- Supabase's default privileges grant EXECUTE directly to `anon` and
-- `authenticated` (not via the PUBLIC pseudo-role) at function-creation
-- time, so the previous migration's `revoke ... from public` did not
-- actually remove anon's access. Revoke from the real roles directly and
-- re-grant only where intended.
-- ============================================================================
revoke execute on function next_job_number() from anon;
revoke execute on function next_invoice_number() from anon;
revoke execute on function next_po_number() from anon;
revoke execute on function use_part_on_job(uuid, uuid, int, numeric, numeric, uuid) from anon;
revoke execute on function receive_purchase_order(uuid) from anon;
revoke execute on function mark_overdue_invoices() from anon, authenticated;
grant execute on function mark_overdue_invoices() to authenticated;
revoke execute on function current_role_name() from anon;
revoke execute on function is_staff() from anon;

-- track_repair and next_sell_request_number remain intentionally callable
-- by anon (public forms) — no change needed there.
