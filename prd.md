# BTV Meetup Product Requirements Document

## Document Control
- Product: `btv-meetup`
- Version: `1.0`
- Last updated: February 20, 2026
- Owner: Product + Engineering
- Status: Active (MVP build/launch)

## 1. Product Summary
BTV Meetup is a lightweight community platform for Burlington-area tech meetups. It allows attendees to discover events and RSVP, organizers to create/manage events, and admins to manage role access.

## 2. Vision
Create a dependable local meetup operating system that is simple to run, free-tier friendly at small scale, and extensible into a larger community platform.

## 3. Goals and Non-Goals
### 3.1 Goals (MVP)
- Publish and discover meetup events from a single canonical site.
- Support RSVP flow with capacity handling and waitlist promotion.
- Provide organizer workflows for event lifecycle management.
- Keep hosting/ops within free-tier limits for early usage.
- Maintain production-safe role boundaries (`attendee`, `organizer`, `admin`).

### 3.2 Non-Goals (MVP)
- Paid ticketing and payment processing.
- Native iOS/Android applications.
- AI recommendations or ranking algorithms.
- Full bi-directional Slack/Discord bot orchestration.

## 4. Users and Personas
- Attendee
  - Needs: find relevant events fast, RSVP quickly, manage attendance.
  - Success: can RSVP/cancel in under 60 seconds.
- Organizer
  - Needs: create/edit events, view attendees, manage capacity.
  - Success: can publish event in one form flow, review RSVP list reliably.
- Admin
  - Needs: grant/revoke organizer role, moderate platform access.
  - Success: can update role assignments securely with auditability.

## 5. Problem Statement
Local meetup operations are fragmented across social feeds, docs, and chat messages. This causes poor discoverability, unreliable headcounts, and high organizer overhead.

## 6. Product Scope
### 6.1 In Scope
- Public home page with event highlights.
- Public event list with upcoming/past filtering.
- Event detail page with capacity and RSVP action.
- Auth via Supabase login/magic-link flow.
- Authenticated dashboard for attendee RSVPs and ideas.
- Organizer event CRUD and attendee view.
- Admin role management UI.
- Idea submission workflow.
- User-facing AI integration setup page with personal MCP tokens.

### 6.2 Out of Scope
- Multi-city tenancy.
- Sponsorship marketplace.
- Speaker CFP workflow automation.
- In-app messaging between users.

## 7. Functional Requirements
### 7.1 Public Discovery
- FR-1: System shall list published events sorted by start time.
- FR-2: System shall support `upcoming` and `past` event tabs.
- FR-3: Event detail shall display title, description, venue, schedule, and capacity state.

### 7.2 Authentication and Session
- FR-4: System shall support sign-in with Supabase auth.
- FR-5: Protected routes shall redirect unauthenticated users to login.

### 7.3 RSVP
- FR-6: Authenticated users shall RSVP to an event through `/api/rsvps`.
- FR-7: System shall assign `going` until capacity is reached, then `waitlist`.
- FR-8: Users shall cancel RSVP via `/api/rsvps/[rsvpId]`.
- FR-9: Waitlisted users shall auto-promote when a `going` slot opens.

### 7.4 Idea Submission
- FR-10: Authenticated users shall submit ideas with title and description.
- FR-11: Users shall only manage their own ideas unless elevated role.

### 7.5 Organizer/Admin
- FR-12: Organizer/admin shall create and edit events.
- FR-13: Organizer/admin shall view attendees for managed events.
- FR-14: Admin shall assign and revoke `organizer` role.

### 7.6 User-Facing MCP Integration
- FR-15: Authenticated users shall create and revoke personal MCP tokens.
- FR-16: System shall expose attendee-safe MCP tools over `/api/mcp` with bearer auth.
- FR-17: MCP tokens shall be shown only once in plaintext and stored hashed at rest.

### 7.7 Security and Authorization
- FR-18: RLS shall enforce data boundaries for all core tables.
- FR-19: Server-side role checks shall gate organizer/admin endpoints.
- FR-20: MCP endpoint shall reject calls without valid non-revoked token.

## 8. Non-Functional Requirements
- NFR-1: P95 page load for event list under 2.5s on mid-tier mobile networks.
- NFR-2: Maintain free-tier compatibility for Vercel + Supabase at early-stage usage.
- NFR-3: API endpoints shall return clear 4xx/5xx responses with stable JSON error keys.
- NFR-4: Critical user actions (RSVP, cancel, event CRUD, role update) must be observable in logs.
- NFR-5: Core data model must remain portable Postgres SQL (no hard lock-in).
- NFR-6: MCP token setup should complete in under 2 minutes for first-time users.

## 9. UX and Design Requirements
- Visual style shall feel intentional and modern, with clear hierarchy and CTA priority.
- Primary flows (discover event, RSVP, submit idea) must be obvious from top-level navigation.
- Desktop and mobile layouts must remain usable with no horizontal overflow.
- Forms must provide clear control states (`default`, `focus`, `disabled`, `error/success` message).

## 10. Information Architecture and Routes
Primary routes are defined in `ROUTES.md` and implemented in `app/`.

### 10.1 Public
- `/`
- `/events`
- `/events/[eventId]`
- `/ideas`
- `/auth/login`
- `/auth/callback`

### 10.2 Authenticated
- `/dashboard`
- `/dashboard/rsvps`
- `/settings/integrations`

### 10.3 Ideas Canonical Route
- `/ideas` is the single canonical route for viewing context and submitting meetup ideas.
- Legacy `/dashboard/ideas/new` redirects to `/ideas` for compatibility.

### 10.4 Organizer/Admin
- `/organizer/events`
- `/organizer/events/new`
- `/organizer/events/[eventId]/edit`
- `/organizer/events/[eventId]/attendees`
- `/admin/users`

## 11. Data Model (MVP)
Canonical schema lives in `supabase/schema.sql`.

### 11.1 Core Tables
- `profiles(id, email, name, role, created_at)`
- `events(id, title, description, starts_at, ends_at, venue, capacity, status, created_by, created_at)`
- `rsvps(id, event_id, user_id, status, created_at, updated_at)`
- `ideas(id, user_id, title, description, status, created_at)`
- `mcp_tokens(id, user_id, label, token_hash, last_used_at, revoked_at, created_at)`

### 11.2 Constraints
- Unique RSVP by `(event_id, user_id)`.
- `capacity >= 1`.
- Enum-like status validation for `events`, `rsvps`, `ideas`.

## 12. API Contract (MVP)
- `POST /api/rsvps`
  - Input: `{ event_id }`
  - Output: RSVP record/status
- `PATCH /api/rsvps/[rsvpId]`
  - Input: `{ status: "cancelled" }`
- `POST /api/ideas`
  - Input: `{ title, description }`
- `POST /api/organizer/events`
  - Organizer/admin only
- `PATCH /api/organizer/events/[eventId]`
  - Organizer/admin only
- `PATCH /api/admin/users`
  - Admin only role updates
- `GET /api/mcp/tokens`
  - List user-owned MCP tokens
- `POST /api/mcp/tokens`
  - Create token, return plaintext once
- `DELETE /api/mcp/tokens/[tokenId]`
  - Revoke user token
- `POST /api/mcp`
  - JSON-RPC MCP endpoint for attendee tools

## 13. User Journeys and Acceptance Criteria
### 13.1 Journey A: Public discovery to RSVP
1. User opens `/events`.
2. User selects event and navigates to detail page.
3. User signs in.
4. User submits RSVP.

Acceptance criteria:
- Event appears in dashboard RSVP list within 2 seconds after action refresh.
- Status is `going` when capacity remains, otherwise `waitlist`.
- RSVP action is idempotent against duplicate submissions.

### 13.2 Journey B: Organizer publishes event
1. Organizer opens `/organizer/events/new`.
2. Completes form with required fields.
3. Event appears on organizer list and public views when `published`.

Acceptance criteria:
- Unauthorized role cannot access or mutate organizer endpoints.
- New event appears in `/events` when published and start date is valid.

### 13.3 Journey C: Admin promotes organizer
1. Admin opens `/admin/users`.
2. Updates user role.
3. Target user gains organizer route access after next auth refresh.

Acceptance criteria:
- Non-admin calls fail with 403/unauthorized response.
- Updated role persists in `profiles.role` and is reflected in route access.

## 14. Metrics and KPIs
### 14.1 Primary Metrics
- Event detail to RSVP conversion rate.
- Monthly active RSVPers.
- RSVP cancellation rate.
- Organizer event publish count per month.

### 14.2 Operational Metrics
- API error rate by endpoint.
- Median and P95 server response latency.
- Auth success/failure ratio.

## 15. Analytics and Observability
- Track page views and core action events: `rsvp_created`, `rsvp_cancelled`, `idea_submitted`, `event_created`, `role_changed`.
- Capture server errors with contextual metadata (route, user role, request id).
- Maintain uptime checks for production base URL.

## 16. Privacy, Security, and Compliance
- Store least-privilege user profile data.
- Enforce RLS as final security boundary.
- Do not commit secrets; use environment config only.
- Document incident response owner and rollback procedure.

## 17. Environments and Deployment
### 17.1 Environments
- `dev`: local Next.js + Supabase project.
- `prod`: Vercel app + separate Supabase project.

### 17.2 Deployment Flow
1. Merge to `main`.
2. Vercel build/deploy runs.
3. Supabase migrations applied before release traffic shift.
4. Smoke tests validate critical flows.

## 18. Testing Strategy
- Unit/integration coverage for API handlers and auth guards.
- Manual smoke tests for:
  - browse events
  - RSVP/cancel RSVP
  - create/edit event
  - submit idea
  - role promotion
- CI gates: `npm run lint`, `npm run typecheck`, `npm run build`.

## 19. Rollout Plan
### Phase 1: Internal alpha
- Seed sample events.
- Validate role workflows with test accounts.

### Phase 2: Community beta
- Invite limited attendee cohort.
- Measure RSVP conversion and page performance.

### Phase 3: Public launch
- Announce publicly.
- Monitor errors and latency daily for first 2 weeks.

## 20. Risks and Mitigations
- Risk: free-tier limits reached unexpectedly.
  - Mitigation: threshold alerts, usage dashboard review, scale-up trigger doc.
- Risk: spam or abusive submissions.
  - Mitigation: auth gating, rate limiting, moderation workflow.
- Risk: organizer mistakes in event publishing.
  - Mitigation: status workflow (`draft`/`published`/`cancelled`) and validation.

## 21. Open Questions
- Should public idea browsing be enabled in MVP or held for post-launch?
- Should organizer access be scoped to owned events only, or all organizer events?
- Is calendar export (`ICS`) required before public launch?

## 22. Launch Readiness Checklist
- [ ] Seed at least 5 realistic events.
- [ ] Verify RLS policies in production project.
- [ ] Configure error monitoring and alert channels.
- [ ] Confirm backup/export process for events and RSVPs.
- [ ] Validate privacy/terms links are accessible.
- [ ] Execute full smoke test script.

## 23. Post-MVP Extensions
- Calendar integrations (Google/Outlook/ICS).
- Speaker profile and CFP workflow.
- Automated Discord announcements.
- Sponsorship and venue partner modules.
