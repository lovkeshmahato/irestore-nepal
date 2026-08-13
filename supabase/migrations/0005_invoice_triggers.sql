-- ============================================================================
-- Keep invoice amount_paid / balance_due / status in sync with payments and
-- credit notes, regardless of which client wrote the row.
-- ============================================================================
create or replace function sync_invoice_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid;
  v_paid numeric;
  v_credits numeric;
  v_total numeric;
begin
  v_invoice_id := coalesce(new.invoice_id, old.invoice_id);

  select coalesce(sum(amount), 0) into v_paid from payments where invoice_id = v_invoice_id;
  select coalesce(sum(amount), 0) into v_credits from credit_notes where invoice_id = v_invoice_id;
  select total into v_total from invoices where id = v_invoice_id;

  update invoices
  set amount_paid = v_paid,
      balance_due = greatest(v_total - v_paid - v_credits, 0),
      status = case
        when v_total - v_paid - v_credits <= 0 then 'paid'
        when v_paid > 0 then 'partially_paid'
        else status
      end
  where id = v_invoice_id;

  return coalesce(new, old);
end;
$$;

create trigger sync_invoice_totals_on_payment
after insert or update or delete on payments
for each row execute function sync_invoice_totals();

create trigger sync_invoice_totals_on_credit_note
after insert or update or delete on credit_notes
for each row execute function sync_invoice_totals();

-- Mark invoices overdue once older than the configured reminder window and
-- still unpaid. Callable on a schedule (pg_cron) or manually from Reports.
create or replace function mark_overdue_invoices()
returns void
language sql
security definer
set search_path = public
as $$
  update invoices
  set status = 'overdue'
  where status in ('sent', 'partially_paid')
    and balance_due > 0
    and created_at < now() - ((select overdue_reminder_days from settings limit 1) || ' days')::interval;
$$;
grant execute on function mark_overdue_invoices() to authenticated;
