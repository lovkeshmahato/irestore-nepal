-- ============================================================================
-- Row Level Security: helper functions + policies
-- ============================================================================

-- Returns the caller's role from profiles, or null if not staff / inactive.
create or replace function current_role_name()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid() and is_active = true;
$$;

create or replace function is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and is_active = true);
$$;

-- Prevent non-super-admins from changing a profile's role.
create or replace function guard_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and current_role_name() is distinct from 'super_admin' then
    raise exception 'Only Super Admin can change staff roles';
  end if;
  return new;
end;
$$;

create trigger guard_profile_role_change
before update on profiles
for each row execute function guard_profile_role_change();

-- ----------------------------------------------------------------------------
-- Enable RLS everywhere
-- ----------------------------------------------------------------------------
alter table profiles enable row level security;
alter table customers enable row level security;
alter table devices enable row level security;
alter table job_sheets enable row level security;
alter table job_status_history enable row level security;
alter table job_photos enable row level security;
alter table job_notes enable row level security;
alter table parts enable row level security;
alter table part_serials enable row level security;
alter table job_parts_used enable row level security;
alter table stock_movements enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table payments enable row level security;
alter table credit_notes enable row level security;
alter table warranties enable row level security;
alter table warranty_claims enable row level security;
alter table vendors enable row level security;
alter table purchase_orders enable row level security;
alter table po_items enable row level security;
alter table sell_requests enable row level security;
alter table sell_request_photos enable row level security;
alter table sell_request_inspection enable row level security;
alter table sell_request_payouts enable row level security;
alter table refurb_items enable row level security;
alter table appointments enable row level security;
alter table staff_attendance enable row level security;
alter table settings enable row level security;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
create policy "staff can view all profiles" on profiles for select
  using (is_staff());
create policy "super admin manages profiles" on profiles for insert
  with check (current_role_name() = 'super_admin');
create policy "super admin deletes profiles" on profiles for delete
  using (current_role_name() = 'super_admin');
create policy "self or admin updates profile" on profiles for update
  using (id = auth.uid() or current_role_name() in ('super_admin', 'admin'))
  with check (id = auth.uid() or current_role_name() in ('super_admin', 'admin'));

-- ----------------------------------------------------------------------------
-- customers / devices — all active staff
-- ----------------------------------------------------------------------------
create policy "staff read customers" on customers for select using (is_staff());
create policy "staff write customers" on customers for insert with check (is_staff());
create policy "staff update customers" on customers for update using (is_staff());
create policy "admin delete customers" on customers for delete
  using (current_role_name() in ('super_admin', 'admin'));

create policy "staff read devices" on devices for select using (is_staff());
create policy "staff write devices" on devices for insert with check (is_staff());
create policy "staff update devices" on devices for update using (is_staff());
create policy "admin delete devices" on devices for delete
  using (current_role_name() in ('super_admin', 'admin'));

-- ----------------------------------------------------------------------------
-- job sheets — technician limited to assigned jobs
-- ----------------------------------------------------------------------------
create policy "job sheets select" on job_sheets for select
  using (
    current_role_name() in ('super_admin', 'admin', 'front_desk', 'accountant')
    or (current_role_name() = 'technician' and assigned_technician_id = auth.uid())
  );
create policy "job sheets insert" on job_sheets for insert
  with check (current_role_name() in ('super_admin', 'admin', 'front_desk'));
create policy "job sheets update" on job_sheets for update
  using (
    current_role_name() in ('super_admin', 'admin', 'front_desk')
    or (current_role_name() = 'technician' and assigned_technician_id = auth.uid())
  );
create policy "job sheets delete" on job_sheets for delete
  using (current_role_name() = 'super_admin');

create policy "job status history select" on job_status_history for select
  using (
    exists (
      select 1 from job_sheets js where js.id = job_status_history.job_sheet_id
      and (
        current_role_name() in ('super_admin', 'admin', 'front_desk', 'accountant')
        or (current_role_name() = 'technician' and js.assigned_technician_id = auth.uid())
      )
    )
  );
create policy "job status history insert" on job_status_history for insert
  with check (
    exists (
      select 1 from job_sheets js where js.id = job_status_history.job_sheet_id
      and (
        current_role_name() in ('super_admin', 'admin', 'front_desk')
        or (current_role_name() = 'technician' and js.assigned_technician_id = auth.uid())
      )
    )
  );

create policy "job photos select" on job_photos for select
  using (
    exists (
      select 1 from job_sheets js where js.id = job_photos.job_sheet_id
      and (
        current_role_name() in ('super_admin', 'admin', 'front_desk', 'accountant')
        or (current_role_name() = 'technician' and js.assigned_technician_id = auth.uid())
      )
    )
  );
create policy "job photos insert" on job_photos for insert
  with check (
    exists (
      select 1 from job_sheets js where js.id = job_photos.job_sheet_id
      and (
        current_role_name() in ('super_admin', 'admin', 'front_desk')
        or (current_role_name() = 'technician' and js.assigned_technician_id = auth.uid())
      )
    )
  );

create policy "job notes select" on job_notes for select
  using (
    exists (
      select 1 from job_sheets js where js.id = job_notes.job_sheet_id
      and (
        current_role_name() in ('super_admin', 'admin', 'front_desk')
        or (current_role_name() = 'technician' and js.assigned_technician_id = auth.uid())
      )
    )
  );
create policy "job notes insert" on job_notes for insert
  with check (
    exists (
      select 1 from job_sheets js where js.id = job_notes.job_sheet_id
      and (
        current_role_name() in ('super_admin', 'admin', 'front_desk')
        or (current_role_name() = 'technician' and js.assigned_technician_id = auth.uid())
      )
    )
  );

-- ----------------------------------------------------------------------------
-- inventory: parts, serials, usage, stock movements
-- NOTE: RLS is row-level only. Hiding cost_price/sale_price specifically from
-- Front Desk is enforced in the frontend query layer (select only needed columns).
-- ----------------------------------------------------------------------------
create policy "staff read parts" on parts for select using (is_staff());
create policy "admin write parts" on parts for insert
  with check (current_role_name() in ('super_admin', 'admin'));
create policy "admin update parts" on parts for update
  using (current_role_name() in ('super_admin', 'admin'));
create policy "admin delete parts" on parts for delete
  using (current_role_name() in ('super_admin', 'admin'));

create policy "staff read part_serials" on part_serials for select using (is_staff());
create policy "admin write part_serials" on part_serials for insert
  with check (current_role_name() in ('super_admin', 'admin'));
create policy "admin update part_serials" on part_serials for update
  using (current_role_name() in ('super_admin', 'admin'));

create policy "job parts used select" on job_parts_used for select using (is_staff());
create policy "job parts used insert" on job_parts_used for insert
  with check (current_role_name() in ('super_admin', 'admin', 'front_desk', 'technician'));
create policy "job parts used delete" on job_parts_used for delete
  using (current_role_name() in ('super_admin', 'admin'));

create policy "stock movements select" on stock_movements for select
  using (current_role_name() in ('super_admin', 'admin', 'accountant'));
create policy "stock movements insert" on stock_movements for insert
  with check (current_role_name() in ('super_admin', 'admin', 'front_desk', 'technician'));

-- ----------------------------------------------------------------------------
-- invoices / payments — no technician access
-- ----------------------------------------------------------------------------
create policy "invoices select" on invoices for select
  using (current_role_name() in ('super_admin', 'admin', 'front_desk', 'accountant'));
create policy "invoices insert" on invoices for insert
  with check (current_role_name() in ('super_admin', 'admin', 'front_desk'));
create policy "invoices update" on invoices for update
  using (current_role_name() in ('super_admin', 'admin', 'front_desk', 'accountant'));
create policy "invoices delete" on invoices for delete
  using (current_role_name() = 'super_admin');

create policy "invoice items follow invoice" on invoice_items for select
  using (exists (select 1 from invoices i where i.id = invoice_items.invoice_id));
create policy "invoice items insert" on invoice_items for insert
  with check (current_role_name() in ('super_admin', 'admin', 'front_desk'));
create policy "invoice items update" on invoice_items for update
  using (current_role_name() in ('super_admin', 'admin', 'front_desk'));
create policy "invoice items delete" on invoice_items for delete
  using (current_role_name() in ('super_admin', 'admin', 'front_desk'));

create policy "payments select" on payments for select
  using (current_role_name() in ('super_admin', 'admin', 'front_desk', 'accountant'));
create policy "payments insert" on payments for insert
  with check (current_role_name() in ('super_admin', 'admin', 'front_desk', 'accountant'));
create policy "payments delete" on payments for delete
  using (current_role_name() in ('super_admin', 'admin', 'accountant'));

create policy "credit notes all" on credit_notes for all
  using (current_role_name() in ('super_admin', 'admin', 'accountant'))
  with check (current_role_name() in ('super_admin', 'admin', 'accountant'));

-- ----------------------------------------------------------------------------
-- warranties
-- ----------------------------------------------------------------------------
create policy "warranties select" on warranties for select using (is_staff());
create policy "warranties insert" on warranties for insert
  with check (current_role_name() in ('super_admin', 'admin', 'front_desk'));
create policy "warranties update" on warranties for update
  using (current_role_name() in ('super_admin', 'admin', 'front_desk'));

create policy "warranty claims select" on warranty_claims for select using (is_staff());
create policy "warranty claims insert" on warranty_claims for insert
  with check (current_role_name() in ('super_admin', 'admin', 'front_desk'));
create policy "warranty claims update" on warranty_claims for update
  using (current_role_name() in ('super_admin', 'admin', 'front_desk'));

-- ----------------------------------------------------------------------------
-- vendors / purchase orders
-- ----------------------------------------------------------------------------
create policy "vendors select" on vendors for select
  using (current_role_name() in ('super_admin', 'admin', 'accountant'));
create policy "vendors write" on vendors for insert
  with check (current_role_name() in ('super_admin', 'admin'));
create policy "vendors update" on vendors for update
  using (current_role_name() in ('super_admin', 'admin'));
create policy "vendors delete" on vendors for delete
  using (current_role_name() in ('super_admin', 'admin'));

create policy "po select" on purchase_orders for select
  using (current_role_name() in ('super_admin', 'admin', 'accountant'));
create policy "po write" on purchase_orders for insert
  with check (current_role_name() in ('super_admin', 'admin'));
create policy "po update" on purchase_orders for update
  using (current_role_name() in ('super_admin', 'admin'));

create policy "po items select" on po_items for select
  using (current_role_name() in ('super_admin', 'admin', 'accountant'));
create policy "po items write" on po_items for insert
  with check (current_role_name() in ('super_admin', 'admin'));
create policy "po items update" on po_items for update
  using (current_role_name() in ('super_admin', 'admin'));
create policy "po items delete" on po_items for delete
  using (current_role_name() in ('super_admin', 'admin'));

-- ----------------------------------------------------------------------------
-- sell requests (buyback) — public inserts via anon, staff manage pipeline
-- ----------------------------------------------------------------------------
create policy "anon submit sell request" on sell_requests for insert
  to anon
  with check (true);
create policy "staff read sell requests" on sell_requests for select
  using (is_staff());
create policy "staff update sell requests" on sell_requests for update
  using (current_role_name() in ('super_admin', 'admin', 'front_desk'));

create policy "anon submit sell request photos" on sell_request_photos for insert
  to anon
  with check (true);
create policy "staff read sell request photos" on sell_request_photos for select
  using (is_staff());

create policy "staff manage inspection" on sell_request_inspection for all
  using (current_role_name() in ('super_admin', 'admin', 'front_desk'))
  with check (current_role_name() in ('super_admin', 'admin', 'front_desk'));

create policy "staff manage payouts" on sell_request_payouts for all
  using (current_role_name() in ('super_admin', 'admin', 'front_desk', 'accountant'))
  with check (current_role_name() in ('super_admin', 'admin', 'front_desk', 'accountant'));

create policy "staff manage refurb items" on refurb_items for all
  using (current_role_name() in ('super_admin', 'admin', 'front_desk'))
  with check (current_role_name() in ('super_admin', 'admin', 'front_desk'));

-- ----------------------------------------------------------------------------
-- appointments — public inserts via anon, staff manage
-- ----------------------------------------------------------------------------
create policy "anon submit appointment" on appointments for insert
  to anon
  with check (true);
create policy "staff read appointments" on appointments for select
  using (is_staff());
create policy "staff update appointments" on appointments for update
  using (current_role_name() in ('super_admin', 'admin', 'front_desk'));

-- ----------------------------------------------------------------------------
-- staff attendance
-- ----------------------------------------------------------------------------
create policy "attendance select" on staff_attendance for select
  using (
    current_role_name() in ('super_admin', 'admin')
    or staff_id = auth.uid()
  );
create policy "attendance insert" on staff_attendance for insert
  with check (
    current_role_name() in ('super_admin', 'admin')
    or staff_id = auth.uid()
  );
create policy "attendance update" on staff_attendance for update
  using (
    current_role_name() in ('super_admin', 'admin')
    or staff_id = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- settings — Super Admin only writes, all staff can read (needed for print
-- templates / invoice numbering context), anon can read basic business info
-- via the security-definer function below (not the table directly).
-- ----------------------------------------------------------------------------
create policy "staff read settings" on settings for select using (is_staff());
create policy "super admin writes settings" on settings for insert
  with check (current_role_name() = 'super_admin');
create policy "super admin updates settings" on settings for update
  using (current_role_name() = 'super_admin');

insert into settings (business_name) values ('i-Restore') on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Public "Track My Repair" lookup — security-definer function so anonymous
-- visitors never get direct table access to job_sheets/customers.
-- ----------------------------------------------------------------------------
create or replace function track_repair(p_query text)
returns table (
  job_number text,
  status job_status,
  device_type text,
  model text,
  created_at timestamptz,
  updated_at timestamptz,
  delivered_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select js.job_number, js.status, d.device_type, d.model, js.created_at, js.updated_at, js.delivered_at
  from job_sheets js
  join devices d on d.id = js.device_id
  join customers c on c.id = js.customer_id
  where js.job_number = p_query or c.phone = p_query
  order by js.created_at desc;
$$;

grant execute on function track_repair(text) to anon, authenticated;
