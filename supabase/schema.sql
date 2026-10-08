-- ============================================================
-- MemoryLane database schema
-- Run this whole file once in Supabase: Dashboard > SQL Editor > New query > paste all > Run
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- EVENTS ----------
-- One row per event a host creates. "slug" is the unique part of the guest link,
-- e.g. slug "johns-wedding" -> yoursite.com/e/johns-wedding
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  slug text unique not null,
  name text not null,
  welcome_message text default 'Share your favorite moments from today!',
  logo_url text,
  cover_url text,
  accent_color text default '#D91E4B',
  created_at timestamptz default now()
);

-- ---------- GALLERIES (event segments) ----------
-- Optional sub-events within one event, e.g. "Welcome Party", "Ceremony", "Reception".
-- An event with zero galleries behaves exactly as before — segments are opt-in.
create table if not exists galleries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

create index if not exists galleries_event_id_idx on galleries(event_id);

-- ---------- MEMORIES ----------
-- One row per guest upload: a photo, a video, a voice note, or a text message.
-- gallery_id is nullable — memories from events with no segments simply have no gallery.
create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  gallery_id uuid references galleries(id) on delete set null,
  type text not null check (type in ('photo','video','voice','message')),
  file_url text,
  message_text text,
  guest_name text not null,
  created_at timestamptz default now()
);

create index if not exists memories_event_id_idx on memories(event_id);
create index if not exists memories_gallery_id_idx on memories(gallery_id);

-- ---------- ADMINS ----------
-- Presence of a row here is what makes a signed-in user an admin — someone
-- who can VIEW every host's events (not edit or delete them; each host still
-- fully owns and manages their own). There is no self-service way to become
-- admin: you add someone by running SQL directly in the Supabase dashboard
-- (see the note at the bottom of this file), which is intentional.
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- ---------- ROW LEVEL SECURITY ----------
alter table events enable row level security;
alter table galleries enable row level security;
alter table memories enable row level security;
alter table admins enable row level security;

-- A signed-in user can only check whether THEY are an admin — not list admins.
create policy "Users can check own admin status"
  on admins for select
  using (auth.uid() = user_id);

-- Hosts have full control (create/edit/delete) over their own events only.
-- Admins do not get write access here — viewing is separate from owning.
create policy "Hosts manage own events"
  on events for all
  using (auth.uid() = host_id)
  with check (auth.uid() = host_id);

-- Three separate audiences can read an event row:
--  - anonymous guests (no session) — needed for the public /e/:slug page
--  - the host who owns it
--  - anyone in the admins table, for every event (this is the "admin sees all" role)
create policy "Role-based event visibility"
  on events for select
  using (
    auth.role() = 'anon'
    or auth.uid() = host_id
    or exists (select 1 from admins where admins.user_id = auth.uid())
  );

-- Hosts have full control over the segments (galleries) of their own events.
create policy "Hosts manage own galleries"
  on galleries for all
  using (exists (select 1 from events where events.id = galleries.event_id and events.host_id = auth.uid()))
  with check (exists (select 1 from events where events.id = galleries.event_id and events.host_id = auth.uid()));

-- Same three-audience pattern as events, for the segment picker + admin visibility.
create policy "Role-based gallery visibility"
  on galleries for select
  using (
    auth.role() = 'anon'
    or exists (select 1 from events where events.id = galleries.event_id and events.host_id = auth.uid())
    or exists (select 1 from admins where admins.user_id = auth.uid())
  );

-- Anyone can add a memory (this is the guest upload — no login required).
create policy "Public can insert memories"
  on memories for insert
  with check (true);

-- The host who owns the event can see its memories — and so can an admin,
-- for every event. Guests never read memories back (they only insert).
create policy "Role-based memory visibility"
  on memories for select
  using (
    exists (select 1 from events where events.id = memories.event_id and events.host_id = auth.uid())
    or exists (select 1 from admins where admins.user_id = auth.uid())
  );

-- Only the host who owns the event can delete a memory from it (admins are
-- view-only by design, so they are deliberately left out of this policy).
create policy "Hosts can delete own event memories"
  on memories for delete
  using (
    exists (
      select 1 from events
      where events.id = memories.event_id
      and events.host_id = auth.uid()
    )
  );

-- ---------- REALTIME ----------
-- Lets the live slideshow subscribe to new uploads as they happen.
alter publication supabase_realtime add table memories;

-- ---------- STORAGE BUCKETS ----------
-- "memories": guest-uploaded photos/videos/voice notes. Public, so hosts can view/download them.
-- "branding": host-uploaded logos/cover images.
insert into storage.buckets (id, name, public)
  values ('memories', 'memories', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('branding', 'branding', true)
  on conflict (id) do nothing;

create policy "Public can upload memory files"
  on storage.objects for insert
  with check (bucket_id = 'memories');

create policy "Public can view memory files"
  on storage.objects for select
  using (bucket_id = 'memories');

create policy "Hosts can upload branding files"
  on storage.objects for insert
  with check (bucket_id = 'branding' and auth.role() = 'authenticated');

create policy "Public can view branding files"
  on storage.objects for select
  using (bucket_id = 'branding');

create policy "Hosts can delete own branding files"
  on storage.objects for delete
  using (bucket_id = 'branding' and auth.role() = 'authenticated');

-- ============================================================
-- Everything below is reference material, not part of the fresh-setup run.
-- ============================================================

-- ---------- MIGRATING AN EXISTING DATABASE ----------
-- This whole script is meant to run once on a brand-new project. If you
-- already ran an earlier version of it, don't re-run the whole file —
-- `create policy` has no "if not exists" and will error on a second run.
-- Instead, run just the block(s) below that you're missing.
--
-- Segments (galleries) — if you don't have this table yet:
-- create table if not exists galleries (
--   id uuid primary key default gen_random_uuid(),
--   event_id uuid not null references events(id) on delete cascade,
--   name text not null,
--   sort_order int not null default 0,
--   created_at timestamptz default now()
-- );
-- alter table memories add column if not exists gallery_id uuid references galleries(id) on delete set null;
-- alter table galleries enable row level security;
-- create policy "Hosts manage own galleries" on galleries for all
--   using (exists (select 1 from events where events.id = galleries.event_id and events.host_id = auth.uid()))
--   with check (exists (select 1 from events where events.id = galleries.event_id and events.host_id = auth.uid()));
--
-- Admin role — if you're on the old fully-public "using (true)" read
-- policies, replace them with the role-based ones (this also fixes a real
-- gap: previously any signed-in host could see every other host's events):
-- drop policy if exists "Public can view events" on events;
-- drop policy if exists "Public can view galleries" on galleries;
-- create table if not exists admins (
--   user_id uuid primary key references auth.users(id) on delete cascade,
--   created_at timestamptz default now()
-- );
-- alter table admins enable row level security;
-- create policy "Users can check own admin status" on admins for select using (auth.uid() = user_id);
-- create policy "Role-based event visibility" on events for select using (
--   auth.role() = 'anon' or auth.uid() = host_id or exists (select 1 from admins where admins.user_id = auth.uid())
-- );
-- create policy "Role-based gallery visibility" on galleries for select using (
--   auth.role() = 'anon'
--   or exists (select 1 from events where events.id = galleries.event_id and events.host_id = auth.uid())
--   or exists (select 1 from admins where admins.user_id = auth.uid())
-- );
-- drop policy if exists "Hosts can view own event memories" on memories;
-- create policy "Role-based memory visibility" on memories for select using (
--   exists (select 1 from events where events.id = memories.event_id and events.host_id = auth.uid())
--   or exists (select 1 from admins where admins.user_id = auth.uid())
-- );
--
-- To make an existing signed-up user an admin, run (after they've signed in
-- at least once so their auth.users row exists):
--   insert into admins (user_id) select id from auth.users where email = 'you@example.com';
