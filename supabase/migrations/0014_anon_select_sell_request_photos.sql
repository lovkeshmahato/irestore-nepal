-- ============================================================================
-- Fix "new row violates row-level security policy" on public device-photo
-- upload for the Sell Your Device form.
--
-- Postgres requires SELECT visibility on a row for INSERT ... RETURNING to
-- succeed (see 0013). The Storage upload API performs an INSERT ...
-- RETURNING against storage.objects, and the existing SELECT policy
-- ("staff read sell request photos") requires is_staff(), which is false
-- for anon. Grant anon a narrowly scoped SELECT policy on just the
-- sell-request-photos bucket so uploads can complete.
--
-- Trade-off (accepted): anyone holding the public anon key can list/read
-- objects in this bucket. It holds buyback device photos only — no
-- customer contact information — matching the common pattern for
-- public-upload Supabase buckets.
-- ============================================================================

create policy "anon read own sell request photos" on storage.objects for select
  to anon
  using (bucket_id = 'sell-request-photos');

notify pgrst, 'reload schema';
