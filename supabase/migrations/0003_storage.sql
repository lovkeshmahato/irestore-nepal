-- ============================================================================
-- Storage buckets
-- ============================================================================
insert into storage.buckets (id, name, public)
values
  ('job-photos', 'job-photos', false),
  ('sell-request-photos', 'sell-request-photos', false),
  ('business-assets', 'business-assets', true)
on conflict (id) do nothing;

-- job-photos: staff-only read & write (internal repair photos)
create policy "staff read job photos" on storage.objects for select
  using (bucket_id = 'job-photos' and is_staff());
create policy "staff upload job photos" on storage.objects for insert
  to authenticated
  with check (bucket_id = 'job-photos' and is_staff());
create policy "staff delete job photos" on storage.objects for delete
  using (bucket_id = 'job-photos' and is_staff());

-- sell-request-photos: anon can upload (public buyback form submission),
-- only staff can read/list — write-only-on-submit bucket.
create policy "anon upload sell request photos" on storage.objects for insert
  to anon
  with check (bucket_id = 'sell-request-photos');
create policy "staff read sell request photos" on storage.objects for select
  using (bucket_id = 'sell-request-photos' and is_staff());

-- business-assets (logo etc): public read, super admin / admin write
create policy "public read business assets" on storage.objects for select
  using (bucket_id = 'business-assets');
create policy "admin upload business assets" on storage.objects for insert
  to authenticated
  with check (bucket_id = 'business-assets' and current_role_name() in ('super_admin', 'admin'));
create policy "admin update business assets" on storage.objects for update
  using (bucket_id = 'business-assets' and current_role_name() in ('super_admin', 'admin'));
