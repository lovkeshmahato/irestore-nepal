-- warranty_claims and sell_requests were missing DELETE policies (every
-- other CRUD table already had one). Adding them, matching the same
-- super_admin/admin-only pattern used by customers/parts/vendors/devices.
create policy "warranty claims delete" on warranty_claims for delete
  using (current_role_name() in ('super_admin', 'admin'));

create policy "sell requests delete" on sell_requests for delete
  using (current_role_name() in ('super_admin', 'admin'));

notify pgrst, 'reload schema';
