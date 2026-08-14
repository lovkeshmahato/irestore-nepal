-- ============================================================================
-- Phase 3 schema: sell request issue fields, vendor payments, settings
-- additions (default tax rate, print header alignment, editable terms text).
-- ============================================================================

alter table sell_requests
  add column device_issues text[] not null default '{}',
  add column issue_details text;

create table vendor_payments (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  po_id uuid references purchase_orders(id) on delete set null,
  amount numeric(12,2) not null,
  method text not null default 'cash',
  is_advance boolean not null default false,
  payment_date date not null default current_date,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index vendor_payments_vendor_idx on vendor_payments(vendor_id);
create index vendor_payments_po_idx on vendor_payments(po_id);

alter table vendor_payments enable row level security;
create policy "vendor payments select" on vendor_payments for select
  using (current_role_name() in ('super_admin', 'admin', 'accountant'));
create policy "vendor payments insert" on vendor_payments for insert
  with check (current_role_name() in ('super_admin', 'admin', 'accountant'));
create policy "vendor payments update" on vendor_payments for update
  using (current_role_name() in ('super_admin', 'admin', 'accountant'));
create policy "vendor payments delete" on vendor_payments for delete
  using (current_role_name() in ('super_admin', 'admin'));

alter table settings
  add column default_tax_rate numeric(5,2) not null default 13,
  add column print_header_alignment text not null default 'left',
  add column terms_conditions_text text not null default
    'TERMS & CONDITIONS: All repairs carry a 30-day warranty unless otherwise stated. i-Restore is not responsible for data loss during repair. Please backup your data before submitting. Uncollected devices after 90 days will be subject to storage charges.';

notify pgrst, 'reload schema';
