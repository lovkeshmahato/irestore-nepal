-- ============================================================================
-- Rewrite next_job_number() to avoid the UPDATE ... RETURNING ... INTO
-- multi-column pattern (suspected trigger of the intermittent 21000
-- cardinality_violation), using a plain SELECT followed by a separate
-- UPDATE instead.
-- ============================================================================

drop function if exists next_job_number();

create function next_job_number()
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
  select id, job_sheet_prefix, job_sheet_next_number
    into v_id, v_prefix, v_number
    from settings
    limit 1;

  if v_id is null then
    raise exception 'settings row not found';
  end if;

  update settings
  set job_sheet_next_number = job_sheet_next_number + 1
  where id = v_id;

  return v_prefix || to_char(v_number, 'FM00000');
end;
$$;

revoke execute on function next_job_number() from public;
revoke execute on function next_job_number() from anon;
grant execute on function next_job_number() to authenticated;

notify pgrst, 'reload schema';
