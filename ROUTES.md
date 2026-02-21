# Next.js MVP Route Map

This route map targets `Next.js App Router` with Supabase auth.

## 1. Public Routes
- `/`
  - Purpose: landing page with upcoming events preview.
  - Access: public.
  - Data: `events` where `status = published` and `starts_at >= now()`.

- `/events`
  - Purpose: full event listing with filters (upcoming/past).
  - Access: public.
  - Data: `events`.

- `/events/[eventId]`
  - Purpose: event detail, RSVP CTA, capacity/waitlist state.
  - Access: public read; RSVP action requires auth.
  - Data: `events`, `rsvps` summary.

- `/ideas`
  - Purpose: canonical meetup idea hub (information + authenticated submission).
  - Access: public read; submission requires auth.
  - Data: signed-in user's recent `ideas`.

- `/auth/login`
  - Purpose: email/magic-link sign-in.
  - Access: public.

- `/auth/callback`
  - Purpose: Supabase auth callback handler.
  - Access: public.

## 2. Authenticated User Routes
- `/dashboard`
  - Purpose: user home with upcoming RSVPs and recent ideas.
  - Access: authenticated.
  - Data: `rsvps` filtered by current user, `ideas` filtered by current user.

- `/dashboard/rsvps`
  - Purpose: manage my RSVPs (cancel/join waitlist state view).
  - Access: authenticated.
  - Data: `rsvps`, `events` join.

- `/dashboard/ideas/new`
  - Purpose: legacy route that redirects to `/ideas`.
  - Access: authenticated redirect behavior not required.

- `/settings/integrations`
  - Purpose: create/revoke personal MCP tokens and install AI integrations.
  - Access: authenticated.
  - Data: `mcp_tokens`.

- `/settings/notifications`
  - Purpose: manage reminder and update email preferences.
  - Access: authenticated.
  - Data: `notification_preferences`.

## 3. Organizer/Admin Routes
- `/organizer/events`
  - Purpose: organizer list view for managed events.
  - Access: `organizer` or `admin`.
  - Data: `events`.

- `/organizer/events/new`
  - Purpose: create event.
  - Access: `organizer` or `admin`.
  - Data write: `events`.

- `/organizer/events/[eventId]/edit`
  - Purpose: edit/cancel event.
  - Access: `organizer` or `admin`.
  - Data write: `events`.

- `/organizer/events/[eventId]/attendees`
  - Purpose: attendee export and RSVP status list.
  - Access: `organizer` or `admin`.
  - Data: `rsvps`, `profiles`.

- `/admin/users`
  - Purpose: grant/revoke organizer role.
  - Access: `admin` only.
  - Data write: `profiles.role`.

- `/admin/email-jobs`
  - Purpose: manual email-job operations and recent delivery visibility.
  - Access: `admin` only.
  - Data: `email_deliveries`, `events`, `profiles`.

## 4. API/Server Action Surface
- `POST /api/rsvps`
  - Create RSVP for current user.
  - Input: `event_id`.
  - Notes: DB trigger assigns `going` or `waitlist` automatically.

- `PATCH /api/rsvps/[rsvpId]`
  - Cancel RSVP.
  - Input: `status=cancelled`.

- `GET /api/jobs/send-reminders`
  - Send 24-hour reminder emails for upcoming events.
  - Auth: `Authorization: Bearer <CRON_SECRET>`.
  - Notes: deduplicated per `(delivery_type, user_id, event_id)`.

- `GET /api/jobs/send-rsvp-updates`
  - Send waitlist-promotion emails when RSVP status changes from `waitlist -> going`.
  - Auth: `Authorization: Bearer <CRON_SECRET>`.
  - Notes: reads `rsvp_status_history` and deduplicates with `email_deliveries`.

- `POST /api/ideas`
  - Submit idea.
  - Input: `title`, `description`.

- `GET /api/mcp/tokens`
  - List MCP tokens for current user.

- `POST /api/mcp/tokens`
  - Create MCP token (plaintext token returned once).

- `DELETE /api/mcp/tokens/[tokenId]`
  - Revoke MCP token.

- `POST /api/mcp`
  - JSON-RPC MCP endpoint for attendee tools.

- `GET /api/health`
  - Returns resolved app URL and MCP/OAuth endpoints for diagnostics.

- `POST /api/organizer/events`
  - Create event (organizer/admin only).

- `PATCH /api/organizer/events/[eventId]`
  - Edit/cancel event (organizer/admin only).

- `POST /api/admin/email-jobs/run`
  - Manually run email jobs as admin.
  - Input: `job` = `send-reminders` or `send-rsvp-updates`.

## 5. Route Guards
- Middleware should redirect unauthenticated users from `/dashboard/*`, `/organizer/*`, `/admin/*`, `/settings/*` to `/auth/login`.
- Server-side role checks must gate organizer and admin routes, not only client checks.
- RLS remains the final access control boundary even if route checks are bypassed.
