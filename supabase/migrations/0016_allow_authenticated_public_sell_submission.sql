-- ============================================================================
-- The public Sell Your Device page is reachable while a staff member is
-- logged into the admin panel in the same browser (e.g. testing the page,
-- or a front-desk staff member submitting on a walk-in customer's behalf).
-- In that case supabase-js sends the staff's `authenticated` JWT, not
-- `anon`, on every request from that browser — including this public
-- page. The submit policies were scoped `to anon` only, so a logged-in
-- staff member got a flat RLS denial on the public form. Confirmed via
-- production edge logs: failed sell_requests/storage.objects inserts
-- carried an authenticated staff JWT (request.sb.auth_user set), not an
-- anonymous session.
--
-- Broaden to also allow `authenticated` — any logged-in user here is
-- staff, there is no separate customer-login system, so this doesn't
-- widen who can submit beyond "anyone with the site open".
-- ============================================================================

drop policy "anon submit sell request" on sell_requests;
create policy "public submit sell request" on sell_requests for insert
  to anon, authenticated
  with check (true);

drop policy "anon submit sell request photos" on sell_request_photos;
create policy "public submit sell request photos" on sell_request_photos for insert
  to anon, authenticated
  with check (true);

drop policy "anon upload sell request photos" on storage.objects;
create policy "public upload sell request photos" on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'sell-request-photos');

drop policy "anon read own sell request photos" on storage.objects;
create policy "public read own sell request photos" on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'sell-request-photos');

notify pgrst, 'reload schema';
