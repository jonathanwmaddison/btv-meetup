# Deploy Guide

This guide follows the stack defined in `prd.md`:
- `Next.js` on `Vercel`
- `Supabase` for Postgres/Auth/RLS
- optional `Resend` for email

## 1. Prerequisites
- Node.js 20+
- GitHub repo connected to Vercel
- Supabase account and project
- Vercel account
- (Optional) Resend account + verified domain

## 2. Supabase Setup
1. Create a new Supabase project (`dev` first).
2. In Supabase SQL Editor, run `supabase/schema.sql` (or apply migrations from `supabase/migrations/`).
3. In Authentication settings:
- enable email auth (magic link recommended)
- set site URL for local and production
- set redirect URLs:
  - `http://localhost:8000/auth/callback`
  - `https://<your-prod-domain>/auth/callback`
4. Copy project values:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)

## 3. Local App Environment
Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:8000
```

Optional for Resend:

```bash
RESEND_API_KEY=...
EMAIL_FROM=noreply@yourdomain.com
CRON_SECRET=...
```

## 4. Production Deployment (Vercel)
1. Import repo into Vercel.
2. Add environment variables in Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL=https://<your-prod-domain>`
- Optional Resend vars + `CRON_SECRET` for reminder job auth.
3. Set production domain in Vercel.
4. Update Supabase auth allowed redirect URLs with production callback URL.
5. Deploy by pushing to `main`.

## 5. Migration Workflow
Recommended process:
1. Keep SQL changes under `supabase/` in version control.
2. Apply to `dev` project first.
3. Validate smoke tests.
4. Apply same migration to `prod` project.

`supabase/migrations/20260220_init.sql` contains a full schema snapshot for migrations-only deploys.

If using Supabase CLI, baseline commands:

```bash
supabase migration new <name>
supabase db push
```

## 6. Post-Deploy Smoke Tests
Run after each production deploy:
1. Public can load `/events`.
2. Auth login works via magic link.
3. Authenticated user can RSVP to a published event.
4. Full event places next RSVP on waitlist.
5. Cancelled `going` RSVP auto-promotes first waitlisted user.
6. Organizer can create/edit/cancel event.
7. Admin can update a user role to `organizer`.
8. RSVP confirmation email sends (if Resend configured).
9. Reminder endpoint works:
   - `GET /api/jobs/send-reminders`
   - include `Authorization: Bearer <CRON_SECRET>`.
10. Waitlist promotion endpoint works:
   - `GET /api/jobs/send-rsvp-updates`
   - include `Authorization: Bearer <CRON_SECRET>`.

## Reminder Cron (Simple)
Use one hourly Vercel Cron Job to call:

`/api/jobs/send-reminders`

The route sends reminders for events starting in roughly 24 hours and deduplicates by `(delivery_type, user_id, event_id)` to avoid duplicate sends.

Add one additional Vercel Cron Job every 15 minutes for:

`/api/jobs/send-rsvp-updates`

This route sends emails when users are auto-promoted from waitlist to confirmed (also deduplicated).

## 7. Monitoring and Alerts
- Add Sentry to app for runtime errors.
- Add uptime checks for:
  - `/`
  - `/events`
  - auth callback path health
- Review Supabase dashboard weekly for:
  - DB usage
  - auth activity
  - error logs

## 8. Free-Tier Guardrails
- Keep uploaded media minimal (or avoid uploads in MVP).
- Avoid polling and expensive background jobs.
- Use pagination on event lists and attendee exports.
- Add simple rate limits on RSVP and idea submission endpoints.

## 9. Rollback Plan
- Keep previous Vercel deployment available for instant rollback.
- Revert breaking SQL with a forward fix migration (avoid destructive manual edits).
- If auth misconfig occurs, temporarily disable protected write paths while fixing env or redirects.
