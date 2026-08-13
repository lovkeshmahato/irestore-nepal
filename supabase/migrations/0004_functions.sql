-- ============================================================================
-- Numbering helpers (atomic, avoid race conditions on concurrent creates)
-- ============================================================================
create or replace function next_job_number()
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

create or replace function next_invoice_number()
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
  set invoice_next_number = invoice_next_number + 1
  returning invoice_prefix, invoice_next_number - 1 into v_prefix, v_number;
  return v_prefix || to_char(v_number, 'FM00000');
end;
$$;
grant execute on function next_invoice_number() to authenticated;

create or replace function next_po_number()
returns text
language sql
security definer
set search_path = public
as $$
  select 'PO-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((count(*) + 1)::text, 3, '0')
  from purchase_orders
  where created_at::date = current_date;
$$;
grant execute on function next_po_number() to authenticated;

create or replace function next_sell_request_number()
returns text
language sql
security definer
set search_path = public
as $$
  select 'SR-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((count(*) + 1)::text, 3, '0')
  from sell_requests
  where created_at::date = current_date;
$$;
grant execute on function next_sell_request_number() to authenticated, anon;

-- ----------------------------------------------------------------------------
-- Atomic stock deduction when a part is used on a job sheet.
-- ----------------------------------------------------------------------------
create or replace function use_part_on_job(
  p_job_sheet_id uuid,
  p_part_id uuid,
  p_quantity int,
  p_unit_cost numeric,
  p_unit_price numeric,
  p_part_serial_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into job_parts_used (job_sheet_id, part_id, part_serial_id, quantity, unit_cost, unit_price)
  values (p_job_sheet_id, p_part_id, p_part_serial_id, p_quantity, p_unit_cost, p_unit_price)
  returning id into v_id;

  update parts set stock_qty = stock_qty - p_quantity where id = p_part_id;

  insert into stock_movements (part_id, movement_type, quantity, reference_type, reference_id, created_by)
  values (p_part_id, 'used', -p_quantity, 'job_sheet', p_job_sheet_id, auth.uid());

  if p_part_serial_id is not null then
    update part_serials set status = 'used', job_sheet_id = p_job_sheet_id where id = p_part_serial_id;
  end if;

  return v_id;
end;
$$;
grant execute on function use_part_on_job(uuid, uuid, int, numeric, numeric, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Receive PO: bump stock + log movement + mark PO received, per item.
-- ----------------------------------------------------------------------------
create or replace function receive_purchase_order(p_po_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
begin
  for v_item in select * from po_items where po_id = p_po_id loop
    update parts set stock_qty = stock_qty + v_item.quantity where id = v_item.part_id;
    insert into stock_movements (part_id, movement_type, quantity, reference_type, reference_id, created_by)
    values (v_item.part_id, 'received', v_item.quantity, 'purchase_order', p_po_id, auth.uid());
  end loop;

  update purchase_orders set status = 'received', received_at = now() where id = p_po_id;
end;
$$;
grant execute on function receive_purchase_order(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Create warranty automatically when a job sheet is marked delivered.
-- ----------------------------------------------------------------------------
create or replace function create_warranty_on_delivery()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days int;
begin
  if new.status = 'delivered' and old.status is distinct from 'delivered' then
    new.delivered_at = now();
    v_days := coalesce(new.warranty_period_days, 30);
    insert into warranties (job_sheet_id, warranty_type, coverage_description, period_days, start_date, end_date, status)
    values (new.id, 'labor', 'Repair workmanship & labor', v_days, current_date, current_date + v_days, 'active');

    -- also cover any serialized/non-serialized parts used, per-part default periods can be tuned later
    insert into warranties (job_sheet_id, warranty_type, part_id, coverage_description, period_days, start_date, end_date, status)
    select new.id, 'part', jpu.part_id, 'Installed part: ' || p.name, 90, current_date, current_date + 90, 'active'
    from job_parts_used jpu
    join parts p on p.id = jpu.part_id
    where jpu.job_sheet_id = new.id;
  end if;
  return new;
end;
$$;

create trigger create_warranty_on_delivery
before update on job_sheets
for each row execute function create_warranty_on_delivery();
