-- ============================================================================
-- i-Restore Service Centre Management SaaS — Core schema
-- ============================================================================
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- profiles (staff accounts, 1:1 with auth.users)
-- ----------------------------------------------------------------------------
create type user_role as enum ('super_admin', 'admin', 'front_desk', 'technician', 'accountant');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'front_desk',
  phone text,
  avatar_url text,
  commission_rate numeric(10,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- customers
-- ----------------------------------------------------------------------------
create table customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  address text,
  notes text,
  merged_into uuid references customers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customers_phone_idx on customers(phone);
create index customers_full_name_idx on customers using gin (to_tsvector('simple', full_name));

-- ----------------------------------------------------------------------------
-- devices (a customer's devices, tracked over time / across visits)
-- ----------------------------------------------------------------------------
create table devices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  device_type text not null, -- iPhone / iPad / MacBook / Watch / Other
  model text not null,
  color text,
  serial_number text,
  imei text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index devices_customer_idx on devices(customer_id);

-- ----------------------------------------------------------------------------
-- job sheets (core workflow)
-- ----------------------------------------------------------------------------
create type job_status as enum (
  'received', 'diagnosed', 'estimate_sent', 'approved', 'in_repair',
  'qc', 'ready_for_pickup', 'delivered', 'declined'
);

create table job_sheets (
  id uuid primary key default gen_random_uuid(),
  job_number text not null unique,
  customer_id uuid not null references customers(id),
  device_id uuid not null references devices(id),
  passcode text, -- confidential; cleared on delivery/close via app logic
  reported_issue text not null,
  condition_checklist jsonb not null default '{}'::jsonb, -- {screen, back_glass, buttons, water_damage, prior_repair_signs}
  accessories_received text[] not null default '{}',
  status job_status not null default 'received',
  assigned_technician_id uuid references profiles(id),
  estimated_cost numeric(12,2),
  approved_by_customer boolean,
  approval_timestamp timestamptz,
  approval_method text, -- 'customer_link' | 'in_person'
  warranty_period_days int,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delivered_at timestamptz
);
create index job_sheets_customer_idx on job_sheets(customer_id);
create index job_sheets_status_idx on job_sheets(status);
create index job_sheets_technician_idx on job_sheets(assigned_technician_id);

create table job_status_history (
  id uuid primary key default gen_random_uuid(),
  job_sheet_id uuid not null references job_sheets(id) on delete cascade,
  status job_status not null,
  changed_by uuid references profiles(id),
  notes text,
  created_at timestamptz not null default now()
);
create index job_status_history_job_idx on job_status_history(job_sheet_id);

create table job_photos (
  id uuid primary key default gen_random_uuid(),
  job_sheet_id uuid not null references job_sheets(id) on delete cascade,
  stage text not null default 'before', -- 'before' | 'after'
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);
create index job_photos_job_idx on job_photos(job_sheet_id);

create table job_notes (
  id uuid primary key default gen_random_uuid(),
  job_sheet_id uuid not null references job_sheets(id) on delete cascade,
  author_id uuid references profiles(id),
  note text not null,
  created_at timestamptz not null default now()
);
create index job_notes_job_idx on job_notes(job_sheet_id);

-- ----------------------------------------------------------------------------
-- parts / inventory
-- ----------------------------------------------------------------------------
create table parts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  compatible_models text[] not null default '{}',
  part_type text not null default 'compatible', -- 'genuine' | 'oem' | 'compatible'
  cost_price numeric(12,2) not null default 0,
  sale_price numeric(12,2) not null default 0,
  stock_qty int not null default 0,
  reorder_threshold int not null default 3,
  is_serialized boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index parts_name_idx on parts using gin (to_tsvector('simple', name));

create table part_serials (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references parts(id) on delete cascade,
  serial_number text not null,
  status text not null default 'in_stock', -- 'in_stock' | 'used' | 'damaged' | 'returned'
  job_sheet_id uuid references job_sheets(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (part_id, serial_number)
);

create table job_parts_used (
  id uuid primary key default gen_random_uuid(),
  job_sheet_id uuid not null references job_sheets(id) on delete cascade,
  part_id uuid not null references parts(id),
  part_serial_id uuid references part_serials(id),
  quantity int not null default 1,
  unit_cost numeric(12,2) not null default 0,
  unit_price numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create index job_parts_used_job_idx on job_parts_used(job_sheet_id);

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references parts(id) on delete cascade,
  movement_type text not null, -- 'received' | 'used' | 'adjusted' | 'damaged' | 'sold_retail'
  quantity int not null, -- signed: +in / -out
  reference_type text, -- 'purchase_order' | 'job_sheet' | 'manual'
  reference_id uuid,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index stock_movements_part_idx on stock_movements(part_id);

-- ----------------------------------------------------------------------------
-- invoices / payments
-- ----------------------------------------------------------------------------
create type invoice_status as enum ('draft', 'sent', 'paid', 'partially_paid', 'overdue');

create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  customer_id uuid not null references customers(id),
  job_sheet_id uuid references job_sheets(id),
  pan_vat_number text,
  vat_enabled boolean not null default false,
  vat_rate numeric(5,2) not null default 13,
  subtotal numeric(12,2) not null default 0,
  vat_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  balance_due numeric(12,2) not null default 0,
  status invoice_status not null default 'draft',
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index invoices_customer_idx on invoices(customer_id);
create index invoices_status_idx on invoices(status);

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  item_type text not null default 'other', -- 'part' | 'labor' | 'other'
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create index invoice_items_invoice_idx on invoice_items(invoice_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric(12,2) not null,
  method text not null, -- 'cash' | 'esewa' | 'khalti' | 'bank_transfer' | 'card'
  reference_note text,
  paid_at timestamptz not null default now(),
  received_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index payments_invoice_idx on payments(invoice_id);

create table credit_notes (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric(12,2) not null,
  reason text not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- warranties (in-house only)
-- ----------------------------------------------------------------------------
create type warranty_status as enum ('active', 'expired', 'claimed');

create table warranties (
  id uuid primary key default gen_random_uuid(),
  job_sheet_id uuid not null references job_sheets(id) on delete cascade,
  warranty_type text not null default 'labor', -- 'part' | 'labor'
  part_id uuid references parts(id),
  coverage_description text,
  period_days int not null default 30,
  start_date date not null,
  end_date date not null,
  status warranty_status not null default 'active',
  created_at timestamptz not null default now()
);
create index warranties_job_idx on warranties(job_sheet_id);
create index warranties_status_idx on warranties(status);

create type warranty_claim_status as enum ('open', 'in_progress', 'resolved', 'rejected');

create table warranty_claims (
  id uuid primary key default gen_random_uuid(),
  warranty_id uuid not null references warranties(id) on delete cascade,
  original_job_sheet_id uuid not null references job_sheets(id),
  rework_job_sheet_id uuid references job_sheets(id),
  issue_description text not null,
  status warranty_claim_status not null default 'open',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index warranty_claims_warranty_idx on warranty_claims(warranty_id);

-- ----------------------------------------------------------------------------
-- vendors / purchase orders
-- ----------------------------------------------------------------------------
create table vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  items_supplied text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  vendor_id uuid not null references vendors(id),
  status text not null default 'draft', -- 'draft' | 'ordered' | 'received' | 'cancelled'
  total_amount numeric(12,2) not null default 0,
  payment_status text not null default 'due', -- 'paid' | 'partial' | 'due'
  amount_paid numeric(12,2) not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  received_at timestamptz
);
create index purchase_orders_vendor_idx on purchase_orders(vendor_id);

create table po_items (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references purchase_orders(id) on delete cascade,
  part_id uuid not null references parts(id),
  quantity int not null,
  unit_cost numeric(12,2) not null default 0
);
create index po_items_po_idx on po_items(po_id);

-- ----------------------------------------------------------------------------
-- sell requests (device buyback)
-- ----------------------------------------------------------------------------
create type sell_request_status as enum (
  'new', 'under_review', 'offer_sent', 'negotiating',
  'accepted', 'rejected', 'device_received', 'inspected', 'paid_out'
);

create table sell_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique,
  seller_name text not null,
  seller_phone text not null,
  seller_email text,
  device_type text not null,
  model text not null,
  color text,
  storage_capacity text,
  condition_self_report jsonb not null default '{}'::jsonb,
  accessories text[] not null default '{}',
  additional_details text,
  status sell_request_status not null default 'new',
  offer_price numeric(12,2),
  offer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sell_request_photos (
  id uuid primary key default gen_random_uuid(),
  sell_request_id uuid not null references sell_requests(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table sell_request_inspection (
  id uuid primary key default gen_random_uuid(),
  sell_request_id uuid not null references sell_requests(id) on delete cascade,
  functional_test jsonb not null default '{}'::jsonb,
  mismatch_flags text[] not null default '{}',
  inspected_by uuid references profiles(id),
  inspected_at timestamptz not null default now(),
  notes text
);

create table sell_request_payouts (
  id uuid primary key default gen_random_uuid(),
  sell_request_id uuid not null references sell_requests(id) on delete cascade,
  amount numeric(12,2) not null,
  method text not null, -- 'cash' | 'bank_transfer' | 'esewa' | 'khalti'
  paid_at timestamptz not null default now(),
  paid_by uuid references profiles(id)
);

create table refurb_items (
  id uuid primary key default gen_random_uuid(),
  sell_request_id uuid not null references sell_requests(id) on delete cascade,
  status text not null default 'in_refurb', -- 'in_refurb' | 'listed' | 'sold'
  listed_price numeric(12,2),
  sold_price numeric(12,2),
  sold_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- appointments (public booking)
-- ----------------------------------------------------------------------------
create table appointments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  device text not null,
  issue text not null,
  preferred_date date not null,
  preferred_time_slot text not null,
  status text not null default 'pending', -- 'pending' | 'converted' | 'cancelled'
  converted_job_sheet_id uuid references job_sheets(id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- staff attendance
-- ----------------------------------------------------------------------------
create table staff_attendance (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  check_in time,
  check_out time,
  status text not null default 'present', -- 'present' | 'absent' | 'half_day' | 'leave'
  created_at timestamptz not null default now(),
  unique (staff_id, date)
);

-- ----------------------------------------------------------------------------
-- settings (singleton row)
-- ----------------------------------------------------------------------------
create table settings (
  id uuid primary key default gen_random_uuid(),
  business_name text not null default 'i-Restore',
  address text,
  pan_vat_number text,
  phone text,
  email text,
  logo_url text,
  warranty_defaults jsonb not null default '{"screen": 90, "battery": 180, "labor": 30}'::jsonb,
  invoice_prefix text not null default 'INV-',
  invoice_next_number int not null default 1,
  job_sheet_prefix text not null default 'JS-',
  job_sheet_next_number int not null default 1,
  low_stock_threshold_default int not null default 3,
  overdue_reminder_days int not null default 7,
  updated_at timestamptz not null default now()
);

-- updated_at trigger helper, applied to tables with an updated_at column
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  for t in select unnest(array[
    'profiles','customers','devices','job_sheets','parts','invoices',
    'vendors','sell_requests','refurb_items','settings'
  ])
  loop
    execute format('create trigger set_updated_at before update on %I for each row execute function set_updated_at()', t);
  end loop;
end $$;
