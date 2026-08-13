# Supabase setup

Migrations in `migrations/` are applied in filename order and define the
full schema, RLS policies, and storage buckets for i-Restore.

## Apply migrations

Using the Supabase CLI, linked to your project:

```
supabase link --project-ref <your-project-ref>
supabase db push
```

Or paste each file's contents into the Supabase SQL editor, in order:
`0001_schema.sql` → `0002_rls.sql` → `0003_storage.sql`.

## Create the first Super Admin

There is no public sign-up. After migrations are applied:

1. In the Supabase dashboard, go to **Authentication → Users → Add user**
   and create the first staff account (email + password).
2. In the SQL editor, insert their profile row:

```sql
insert into profiles (id, full_name, role)
values ('<the-new-user-uuid>', 'Your Name', 'super_admin');
```

From then on, the Super Admin creates every other staff account from the
**Staff** module in the app (Settings → Staff), which calls the Supabase
Auth Admin API from an Edge Function to create the `auth.users` row and the
matching `profiles` row together.

## Regenerating TypeScript types

```
supabase gen types typescript --project-id <your-project-ref> > src/types/database.ts
```
