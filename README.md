# i-Restore

Service Centre Management SaaS for an independent (non-authorized) Apple
device repair & buyback centre in Nepal. Manages customer intake, repair job
sheets, parts/inventory, invoicing, in-house warranties, device buyback
("Sell Requests"), staff/roles, and reporting.

Not an official Apple service centre. All warranty logic is in-house only.

## Tech stack

- React + Vite + TypeScript, TailwindCSS v4
- Supabase (Postgres, Auth, Storage, Row Level Security, Edge Functions)
- React Router, Recharts, qrcode.react
- Deployed as a static `vite build` — no Node server required in production

## Local setup

```
npm install
cp .env.example .env   # fill in your Supabase project URL + anon key
npm run dev
```

## Supabase backend

See [`supabase/README.md`](./supabase/README.md) for:

- Applying the schema/RLS/storage migrations (`supabase/migrations/`)
- Creating the first Super Admin account
- Deploying the Edge Functions in `supabase/functions/` (`send-estimate`,
  `create-staff`)
- Regenerating TypeScript types

## Deploying to Hostinger

### Automatic (GitHub Actions)

`.github/workflows/deploy-hostinger.yml` builds the app and FTP-uploads
`dist/` to Hostinger on every push to `main` (or manually via the Actions
tab → "Deploy to Hostinger" → Run workflow). Add these as **GitHub repo
secrets** (Settings → Secrets and variables → Actions) — nobody but you
enters these, they're never visible in the workflow logs:

| Secret | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://jonufenbiyqdscrjiowg.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | your Supabase anon key (Project Settings → API) |
| `FTP_SERVER` | Hostinger FTP hostname (hPanel → Files → FTP Accounts) |
| `FTP_USERNAME` | Hostinger FTP username |
| `FTP_PASSWORD` | Hostinger FTP password |
| `FTP_SERVER_DIR` | optional, defaults to `/public_html/` |

Once those are set, every push to `main` deploys automatically.

### Manual

1. `npm run build` — produces a static `dist/` folder.
2. Upload the contents of `dist/` to your Hostinger `public_html` (or
   subdomain folder) via File Manager or FTP. `public/.htaccess` is already
   included in the build output and rewrites all paths to `index.html` so
   client-side routing works.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at build time — never
   commit `.env`.
4. In the Supabase dashboard, set Auth → URL Configuration's Site URL and
   Redirect URLs to your Hostinger domain (needed for password reset links).

Supabase handles the entire backend — no Node process runs on Hostinger.

## Roles

| Role | Access |
|---|---|
| Super Admin | Full access, including Staff role management and Settings |
| Admin/Manager | Everything except staff role management and billing settings |
| Front Desk | Customers, Job Sheets (create/view), Invoices (create), Sell Requests intake |
| Technician | Assigned Job Sheets only — no financials |
| Accountant | Invoices, Payments, Reports — read-only on Job Sheets |

Enforced both via Supabase RLS policies (`supabase/migrations/0002_rls.sql`)
and frontend route guards (`src/components/ProtectedRoute.tsx`,
`src/config/nav.ts`).

## Project structure

```
src/
  components/       shared UI kit + layout (sidebar/topbar) + CustomerPicker
  contexts/         Auth + Theme (dark mode) providers
  pages/            one folder per module (customers, job-sheets, invoices, …)
  print/            print-only routes for Job Sheet / Invoice / Warranty / Buyback receipt
  types/            hand-written domain types matching the DB schema
supabase/
  migrations/       full DDL, RLS policies, storage buckets, DB functions
  functions/        Edge Functions (send-estimate, create-staff)
```

## Public pages (no login)

- `/sell-your-device` — buyback intake form
- `/track-repair` — repair status lookup by phone or job number
- `/book-appointment` — appointment request form
