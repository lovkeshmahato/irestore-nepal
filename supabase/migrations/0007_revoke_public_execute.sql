-- ============================================================================
-- Postgres grants EXECUTE to the implicit PUBLIC role on function creation
-- unless revoked, so `anon` could call staff-only RPCs (e.g. spam
-- next_job_number() to burn through the sequence) even though the earlier
-- migrations only explicitly granted these to `authenticated`. Revoke from
-- PUBLIC and re-grant precisely per function.
-- ============================================================================
revoke execute on function next_job_number() from public;
revoke execute on function next_invoice_number() from public;
revoke execute on function next_po_number() from public;
revoke execute on function use_part_on_job(uuid, uuid, int, numeric, numeric, uuid) from public;
revoke execute on function receive_purchase_order(uuid) from public;
revoke execute on function mark_overdue_invoices() from public;
revoke execute on function current_role_name() from public;
revoke execute on function is_staff() from public;

-- Staff-only (authenticated), never anon:
grant execute on function next_job_number() to authenticated;
grant execute on function next_invoice_number() to authenticated;
grant execute on function next_po_number() to authenticated;
grant execute on function use_part_on_job(uuid, uuid, int, numeric, numeric, uuid) to authenticated;
grant execute on function receive_purchase_order(uuid) to authenticated;
grant execute on function mark_overdue_invoices() to authenticated;
grant execute on function current_role_name() to authenticated;
grant execute on function is_staff() to authenticated;

-- Intentionally public (used by anonymous visitors / public forms):
revoke execute on function next_sell_request_number() from public;
grant execute on function next_sell_request_number() to anon, authenticated;
revoke execute on function track_repair(text) from public;
grant execute on function track_repair(text) to anon, authenticated;
