# btv-meetup

Burlington meetup MVP built with Next.js + Supabase.

## Requirements
- Node.js 20+
- Supabase project with schema applied from `supabase/schema.sql`

## Setup
1. Copy env template:
   - `cp .env.example .env.local`
2. Fill in Supabase keys.
3. Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:8000`.

### Local + ngrok
If you need a public URL (MCP install config, OAuth callbacks, check-in QR links), run:

```bash
npm run dev:ngrok
```

This starts a tunnel on port 8000, updates `NEXT_PUBLIC_APP_URL` and local Supabase auth URLs, and then boots Next.js.
You can bring your own tunnel by setting `TUNNEL_URL` before running the command.

```bash
TUNNEL_URL=https://your-public-url.example npm run dev:ngrok
```

### Maintainers: Why Tunnels Exist
- Remote MCP + OAuth requires a publicly reachable HTTPS URL. Claude cannot reach `localhost` and will not accept self-signed certs.
- For local-only testing, use the MCPB bundle (Claude Desktop local extension).
- For remote connector testing without exposing a dev machine, use a staging deploy with a real domain.
- Magic links from local Supabase include `127.0.0.1:54321` (local auth verify). They only work on the same machine unless auth is exposed publicly.

### Local vs Production
- Local: use the MCPB bundle for Claude Desktop. Remote MCP + OAuth requires a public HTTPS URL.
- Production: set `NEXT_PUBLIC_APP_URL` to your domain and configure Supabase Auth URL settings in the hosted dashboard.
- Health check: `GET /api/health` returns the resolved app URL and MCP/OAuth endpoints.
 - Debug login redirect: set `NEXT_PUBLIC_DEBUG_AUTH=1` to show the computed magic-link redirect URL on the login page.

## Key Paths
- `app/` UI routes and API handlers
- `supabase/schema.sql` database, triggers, and RLS
- `DEPLOY.md` production deployment checklist

## AI Integration (MCP)
- User setup page: `/settings/integrations`
- MCP endpoint: `/api/mcp`
- Personal tokens: `/api/mcp/tokens`
- `NEXT_PUBLIC_APP_URL` must be set for install config generation.

## Email Reminders (Optional)
- RSVP confirmation/waitlist emails use Resend when configured.
- 24-hour reminder job endpoint: `/api/jobs/send-reminders`
- Waitlist promotion job endpoint: `/api/jobs/send-rsvp-updates`
- Required env vars for email/reminders:
  - `RESEND_API_KEY`
  - `EMAIL_FROM`
  - `CRON_SECRET`

## Validation Commands
```bash
npm run typecheck
npm run lint
npm run build
```

## Local DB Reset
```bash
npm run supabase:reset
```

## Seed Sample Events
```bash
npm run seed:local
```

## Incremental SQL Migration
- Email-job rollout migration: `supabase/migrations/20260220_email_jobs.sql`
