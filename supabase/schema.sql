-- btv-meetup schema for Supabase
-- Run in Supabase SQL Editor or via migration tool.

-- Extensions
create extension if not exists pgcrypto;

-- Enums
create type public.user_role as enum ('member', 'organizer', 'admin');
create type public.event_status as enum ('draft', 'published', 'cancelled');
create type public.rsvp_status as enum ('going', 'waitlist', 'cancelled');
create type public.idea_status as enum ('pending', 'approved', 'rejected', 'implemented');
create type public.cfp_status as enum ('pending', 'approved', 'rejected');
create type public.recurrence_freq as enum ('weekly', 'biweekly', 'monthly');

-- Tables
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  name text,
  role public.user_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  capacity integer check (capacity >= 1),
  accessibility_notes text,
  parking_info text,
  website text,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text not null,
  venue_id uuid references public.venues (id) on delete set null,
  capacity integer not null check (capacity >= 1),
  status public.event_status not null default 'draft',
  created_by uuid not null references public.profiles (id) on delete restrict,
  parent_event_id uuid references public.events (id) on delete set null,
  recurrence_freq public.recurrence_freq,
  recurrence_count integer check (recurrence_count is null or recurrence_count >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.rsvp_status not null default 'going',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table public.rsvp_status_history (
  id uuid primary key default gen_random_uuid(),
  rsvp_id uuid not null references public.rsvps (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  old_status public.rsvp_status not null,
  new_status public.rsvp_status not null,
  changed_at timestamptz not null default now()
);

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null,
  status public.idea_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.idea_votes (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (idea_id, user_id)
);

create table public.speakers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  name text not null,
  bio text,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cfp_submissions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events (id) on delete set null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  speaker_id uuid references public.speakers (id) on delete set null,
  title text not null,
  abstract text not null,
  status public.cfp_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating in (1, -1)),
  comment text,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table public.mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null default 'Personal MCP token',
  token_hash text not null unique,
  oauth_client_id uuid,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.oauth_clients (
  id uuid primary key default gen_random_uuid(),
  client_id text not null unique,
  client_secret_hash text not null,
  client_name text not null,
  redirect_uris text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.oauth_codes (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  code_hash text not null unique,
  code_challenge text,
  code_challenge_method text,
  resource text,
  redirect_uri text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade unique,
  email_new_events boolean not null default true,
  email_rsvp_updates boolean not null default true,
  email_weekly_digest boolean not null default false,
  email_cfp_updates boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  delivery_type text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (delivery_type, user_id, event_id)
);

-- Indexes
create index idx_events_status_starts_at on public.events (status, starts_at);
create index idx_events_parent on public.events (parent_event_id) where parent_event_id is not null;
create index idx_rsvps_event_status_created on public.rsvps (event_id, status, created_at);
create index idx_rsvps_user_id on public.rsvps (user_id);
create index idx_rsvp_status_history_event_changed on public.rsvp_status_history (event_id, changed_at desc);
create index idx_rsvp_status_history_user_changed on public.rsvp_status_history (user_id, changed_at desc);
create index idx_ideas_status_created on public.ideas (status, created_at);
create index idx_idea_votes_idea on public.idea_votes (idea_id);
create index idx_idea_votes_user on public.idea_votes (user_id);
create index idx_feedback_event on public.feedback (event_id);
create index idx_checkins_event on public.checkins (event_id);
create index idx_speakers_user on public.speakers (user_id) where user_id is not null;
create index idx_cfp_event on public.cfp_submissions (event_id) where event_id is not null;
create index idx_cfp_user on public.cfp_submissions (user_id);
create index idx_mcp_tokens_user_created on public.mcp_tokens (user_id, created_at desc);
create index idx_oauth_codes_hash on public.oauth_codes (code_hash);
create index idx_oauth_codes_expires on public.oauth_codes (expires_at);
create index idx_email_deliveries_user_created on public.email_deliveries (user_id, created_at desc);
create index idx_email_deliveries_event on public.email_deliveries (event_id);

-- Generic updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create trigger trg_events_set_updated_at
before update on public.events
for each row execute procedure public.set_updated_at();

create trigger trg_rsvps_set_updated_at
before update on public.rsvps
for each row execute procedure public.set_updated_at();

create trigger trg_ideas_set_updated_at
before update on public.ideas
for each row execute procedure public.set_updated_at();

create trigger trg_venues_set_updated_at
before update on public.venues
for each row execute procedure public.set_updated_at();

create trigger trg_speakers_set_updated_at
before update on public.speakers
for each row execute procedure public.set_updated_at();

create trigger trg_cfp_set_updated_at
before update on public.cfp_submissions
for each row execute procedure public.set_updated_at();

create trigger trg_notification_prefs_set_updated_at
before update on public.notification_preferences
for each row execute procedure public.set_updated_at();

-- Create profile row when a new auth user is created
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- Permission helpers
create or replace function public.is_organizer_or_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.role in ('organizer', 'admin')
  );
$$;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.role = 'admin'
  );
$$;

-- RSVP status assignment logic
create or replace function public.assign_rsvp_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity integer;
  v_going_count integer;
  v_event_status public.event_status;
begin
  select e.capacity, e.status
    into v_capacity, v_event_status
  from public.events e
  where e.id = new.event_id;

  if v_capacity is null then
    raise exception 'Event not found';
  end if;

  if v_event_status <> 'published' then
    raise exception 'RSVP allowed only for published events';
  end if;

  -- Explicit cancellation should stay cancellation.
  if new.status = 'cancelled' then
    return new;
  end if;

  select count(*)
    into v_going_count
  from public.rsvps r
  where r.event_id = new.event_id
    and r.status = 'going'
    and (tg_op <> 'UPDATE' or r.id <> new.id);

  if v_going_count < v_capacity then
    new.status := 'going';
  else
    new.status := 'waitlist';
  end if;

  return new;
end;
$$;

create trigger trg_assign_rsvp_status
before insert or update of status on public.rsvps
for each row execute procedure public.assign_rsvp_status();

-- Promote waitlisted users when capacity opens.
create or replace function public.promote_waitlist(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity integer;
  v_going_count integer;
  v_candidate uuid;
begin
  select capacity into v_capacity
  from public.events
  where id = p_event_id;

  if v_capacity is null then
    return;
  end if;

  loop
    select count(*) into v_going_count
    from public.rsvps
    where event_id = p_event_id
      and status = 'going';

    exit when v_going_count >= v_capacity;

    select id into v_candidate
    from public.rsvps
    where event_id = p_event_id
      and status = 'waitlist'
    order by created_at asc
    limit 1;

    exit when v_candidate is null;

    update public.rsvps
    set status = 'going', updated_at = now()
    where id = v_candidate;
  end loop;
end;
$$;

create or replace function public.on_rsvp_change_promote_waitlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'going' then
      perform public.promote_waitlist(old.event_id);
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'going' and new.status in ('cancelled', 'waitlist') then
      perform public.promote_waitlist(new.event_id);
    end if;
    return new;
  end if;

  return new;
end;
$$;

create trigger trg_promote_waitlist_on_rsvp_change
after update or delete on public.rsvps
for each row execute procedure public.on_rsvp_change_promote_waitlist();

create or replace function public.log_rsvp_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    insert into public.rsvp_status_history (rsvp_id, event_id, user_id, old_status, new_status)
    values (new.id, new.event_id, new.user_id, old.status, new.status);
  end if;

  return new;
end;
$$;

create trigger trg_log_rsvp_status_change
after update of status on public.rsvps
for each row execute procedure public.log_rsvp_status_change();

-- RLS
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.rsvps enable row level security;
alter table public.rsvp_status_history enable row level security;
alter table public.ideas enable row level security;
alter table public.idea_votes enable row level security;
alter table public.mcp_tokens enable row level security;
alter table public.venues enable row level security;
alter table public.speakers enable row level security;
alter table public.cfp_submissions enable row level security;
alter table public.feedback enable row level security;
alter table public.checkins enable row level security;
alter table public.oauth_clients enable row level security;
alter table public.oauth_codes enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.email_deliveries enable row level security;

-- Profiles policies
create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (true);

create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (
  auth.uid() = id
  and role = (select p.role from public.profiles p where p.id = auth.uid())
);

create policy "profiles_admin_manage"
on public.profiles
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Events policies
create policy "events_public_read_published"
on public.events
for select
to anon, authenticated
using (status = 'published' or public.is_organizer_or_admin(auth.uid()));

create policy "events_organizer_insert"
on public.events
for insert
to authenticated
with check (
  public.is_organizer_or_admin(auth.uid())
  and created_by = auth.uid()
);

create policy "events_organizer_update"
on public.events
for update
to authenticated
using (public.is_organizer_or_admin(auth.uid()))
with check (public.is_organizer_or_admin(auth.uid()));

create policy "events_organizer_delete"
on public.events
for delete
to authenticated
using (public.is_organizer_or_admin(auth.uid()));

-- RSVP policies
create policy "rsvps_select_self_or_organizer"
on public.rsvps
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_organizer_or_admin(auth.uid())
);

create policy "rsvps_select_published_event_rows"
on public.rsvps
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.status = 'published'
  )
);

create policy "rsvps_insert_self"
on public.rsvps
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.events e
    where e.id = event_id and e.status = 'published'
  )
);

create policy "rsvps_update_self_or_organizer"
on public.rsvps
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_organizer_or_admin(auth.uid())
)
with check (
  user_id = auth.uid()
  or public.is_organizer_or_admin(auth.uid())
);

create policy "rsvps_delete_self_or_organizer"
on public.rsvps
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.is_organizer_or_admin(auth.uid())
);

-- Ideas policies
create policy "ideas_select_authenticated"
on public.ideas
for select
to authenticated
using (true);

create policy "ideas_insert_self"
on public.ideas
for insert
to authenticated
with check (user_id = auth.uid());

create policy "ideas_update_self_or_organizer"
on public.ideas
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_organizer_or_admin(auth.uid())
)
with check (
  user_id = auth.uid()
  or public.is_organizer_or_admin(auth.uid())
);

create policy "ideas_delete_organizer"
on public.ideas
for delete
to authenticated
using (public.is_organizer_or_admin(auth.uid()));

-- Idea votes policies
create policy "idea_votes_select_all"
on public.idea_votes
for select
to authenticated
using (true);

create policy "idea_votes_insert_self"
on public.idea_votes
for insert
to authenticated
with check (user_id = auth.uid());

create policy "idea_votes_update_self"
on public.idea_votes
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "idea_votes_delete_self"
on public.idea_votes
for delete
to authenticated
using (user_id = auth.uid());

-- MCP token policies
create policy "mcp_tokens_select_self"
on public.mcp_tokens
for select
to authenticated
using (user_id = auth.uid());

create policy "mcp_tokens_insert_self"
on public.mcp_tokens
for insert
to authenticated
with check (user_id = auth.uid());

create policy "mcp_tokens_update_self"
on public.mcp_tokens
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Venues policies
create policy "venues_select_all"
on public.venues
for select
to anon, authenticated
using (true);

create policy "venues_insert_organizer"
on public.venues
for insert
to authenticated
with check (public.is_organizer_or_admin(auth.uid()));

create policy "venues_update_organizer"
on public.venues
for update
to authenticated
using (public.is_organizer_or_admin(auth.uid()))
with check (public.is_organizer_or_admin(auth.uid()));

create policy "venues_delete_organizer"
on public.venues
for delete
to authenticated
using (public.is_organizer_or_admin(auth.uid()));

-- Speakers policies
create policy "speakers_select_all"
on public.speakers
for select
to anon, authenticated
using (true);

create policy "speakers_insert_authenticated"
on public.speakers
for insert
to authenticated
with check (true);

create policy "speakers_update_self_or_organizer"
on public.speakers
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_organizer_or_admin(auth.uid())
)
with check (
  user_id = auth.uid()
  or public.is_organizer_or_admin(auth.uid())
);

-- CFP policies
create policy "cfp_select_authenticated"
on public.cfp_submissions
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_organizer_or_admin(auth.uid())
);

create policy "cfp_insert_self"
on public.cfp_submissions
for insert
to authenticated
with check (user_id = auth.uid());

create policy "cfp_update_self_or_organizer"
on public.cfp_submissions
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_organizer_or_admin(auth.uid())
)
with check (
  user_id = auth.uid()
  or public.is_organizer_or_admin(auth.uid())
);

-- Feedback policies
create policy "feedback_select_all"
on public.feedback
for select
to authenticated
using (true);

create policy "feedback_insert_self"
on public.feedback
for insert
to authenticated
with check (user_id = auth.uid());

create policy "feedback_update_self"
on public.feedback
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Checkins policies
create policy "checkins_select_self_or_organizer"
on public.checkins
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_organizer_or_admin(auth.uid())
);

create policy "checkins_insert_self"
on public.checkins
for insert
to authenticated
with check (user_id = auth.uid());

-- OAuth clients: only service role access (managed via admin API)
create policy "oauth_clients_service_only"
on public.oauth_clients
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- OAuth codes: user can see own
create policy "oauth_codes_select_self"
on public.oauth_codes
for select
to authenticated
using (user_id = auth.uid());

create policy "oauth_codes_insert_self"
on public.oauth_codes
for insert
to authenticated
with check (user_id = auth.uid());

-- Notification preferences
create policy "notification_prefs_select_self"
on public.notification_preferences
for select
to authenticated
using (user_id = auth.uid());

create policy "notification_prefs_insert_self"
on public.notification_preferences
for insert
to authenticated
with check (user_id = auth.uid());

create policy "notification_prefs_update_self"
on public.notification_preferences
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
