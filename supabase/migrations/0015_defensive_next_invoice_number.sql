-- ============================================================================
-- Fix "Failed to create invoice": next_invoice_number() had the same
-- UPDATE ... RETURNING ... INTO multi-column pattern that caused the
-- intermittent PostgREST 21000 (cardinality_violation) on job sheet
-- creation (see 0010/0012), but was missed when that was first fixed.
-- Rewritten the same way — separate SELECT + UPDATE — and recreated with
-- a fresh OID.
-- ============================================================================

drop function if exists next_invoice_number();

create function next_invoice_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_prefix text;
  v_number int;
begin
  select id, invoice_prefix, invoice_next_number
    into v_id, v_prefix, v_number
    from settings
    limit 1;

  if v_id is null then
    raise exception 'settings row not found';
  end if;

  update settings
  set invoice_next_number = invoice_next_number + 1
  where id = v_id;

  return v_prefix || to_char(v_number, 'FM00000');
end;
$$;

revoke execute on function next_invoice_number() from public;
revoke execute on function next_invoice_number() from anon;
grant execute on function next_invoice_number() to authenticated;

notify pgrst, 'reload schema';
