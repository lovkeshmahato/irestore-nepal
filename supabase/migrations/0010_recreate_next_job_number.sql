-- ============================================================================
-- Fix "Failed to create job sheet": POST /rest/v1/rpc/next_job_number was
-- intermittently returning PostgREST error 21000 (cardinality_violation)
-- in production, though it could never be reproduced via direct SQL. Drop
-- and recreate (rather than CREATE OR REPLACE) to force a fresh function
-- OID and a clean PostgREST schema cache reload.
-- ============================================================================

drop function if exists next_job_number();

create function next_job_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_number int;
begin
  update settings
  set job_sheet_next_number = job_sheet_next_number + 1
  returning job_sheet_prefix, job_sheet_next_number - 1 into v_prefix, v_number;
  return v_prefix || to_char(v_number, 'FM00000');
end;
$$;

grant execute on function next_job_number() to authenticated;

notify pgrst, 'reload schema';
