-- ============================================================================
-- Phase 2: legacy service history, job sheet fields (condition/security/
-- priority/ETA), invoice charge/discount/document fields, realtime leads.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Legacy service history — pre-system paper records logged against a
-- customer at creation time. Reference-only, never a live job sheet.
-- ----------------------------------------------------------------------------
create table legacy_service_records (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  device text not null,
  issue text not null,
  service_date date,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index legacy_service_records_customer_idx on legacy_service_records(customer_id);

alter table legacy_service_records enable row level security;
create policy "staff read legacy records" on legacy_service_records for select using (is_staff());
create policy "staff write legacy records" on legacy_service_records for insert with check (is_staff());
create policy "staff update legacy records" on legacy_service_records for update using (is_staff());
create policy "admin delete legacy records" on legacy_service_records for delete
  using (current_role_name() in ('super_admin', 'admin'));

-- ----------------------------------------------------------------------------
-- Job sheets: device condition, physical damage detail, security fields,
-- ETA, priority.
-- ----------------------------------------------------------------------------
create type device_condition as enum ('good', 'fair', 'poor', 'damaged');
create type job_priority as enum ('normal', 'high', 'urgent');

alter table job_sheets
  add column device_condition device_condition,
  add column physical_damage_details text,
  add column icloud_account text, -- sensitive, same handling as passcode
  add column security_notes text, -- sensitive, same handling as passcode
  add column estimated_completion_date date,
  add column priority job_priority not null default 'normal';

create index job_sheets_priority_idx on job_sheets(priority);

-- ----------------------------------------------------------------------------
-- Invoices: structured charges, discount, payment method, and per-document
-- print visibility toggles (Phase 1 already has vat_enabled/vat_rate/
-- subtotal/vat_amount/total which the new form continues to populate).
-- ----------------------------------------------------------------------------
alter table invoices
  add column repair_charge numeric(12,2) not null default 0,
  add column parts_cost numeric(12,2) not null default 0,
  add column labour_charge numeric(12,2) not null default 0,
  add column discount_type text not null default 'fixed', -- 'fixed' | 'percent'
  add column discount_value numeric(12,2) not null default 0,
  add column discount_amount numeric(12,2) not null default 0,
  add column payment_method text, -- 'cash' | 'bank_transfer' | 'card' | 'esewa' | 'khalti' | 'other'
  add column doc_show_vat boolean not null default true,
  add column doc_show_logo boolean not null default true,
  add column doc_show_address boolean not null default true,
  add column doc_show_phone boolean not null default true,
  add column doc_show_email boolean not null default true;

-- ----------------------------------------------------------------------------
-- Realtime: let the Dashboard "Leads" widget subscribe to new sell requests.
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table sell_requests;
