# MemoryLane

A site where event guests can upload photos, videos, voice notes, and
messages via a unique link — for the host to view whenever they want.

This is version 1: it works end-to-end, but is intentionally simple so it's
easy for you to run and extend. Below are exact steps — follow them in order.

---

## Part 1 — Create the Supabase backend

1. Go to https://supabase.com and sign in (or create a free account).
2. Click **New project**. Give it any name (e.g. "memorylane"), set a
   database password (save it somewhere), pick a region close to Nigeria
   (e.g. an EU region), and click **Create new project**. Wait ~2 minutes
   for it to finish setting up.
3. In the left sidebar, click **SQL Editor** → **New query**.
4. Open the file `supabase/schema.sql` in this project, copy its **entire**
   contents, paste them into the SQL editor, and click **Run**. This creates
   all four tables (`events`, `galleries`, `memories`, `admins`), the
   security rules, realtime config, and the two storage buckets
   (`memories`, `branding`).
5. In the left sidebar, click **Project Settings** (gear icon) → **API**.
   You'll need two values from this page in Part 2:
   - **Project URL**
   - **anon public** key (under "Project API keys")

### Turn on email sign-in for hosts
6. In the left sidebar, click **Authentication** → **Providers**, and make
   sure **Email** is enabled (it is by default).
7. Click **Authentication** → **URL Configuration**. Under **Site URL**,
   enter your future live URL (for now, leave it as-is — you'll come back
   and update this in Part 3 after deploying).

---

## Part 2 — Run it on your computer

1. Make sure you have Node.js installed (v18 or later). Check with:
   ```
   node -v
   ```
   If that command isn't found, download Node from https://nodejs.org.

2. Open a terminal, navigate into this project folder, and install
   dependencies:
   ```
   cd memorylane
   npm install
   ```

3. Copy the example environment file:
   ```
   cp .env.example .env
   ```
   (On Windows PowerShell, use: `copy .env.example .env`)

4. Open the new `.env` file in a text editor. Replace the two placeholder
   values with the ones from Supabase (Part 1, step 5):
   ```
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

5. Start the app locally:
   ```
   npm run dev
   ```
   Open the URL it prints (usually http://localhost:5173) in your browser.

6. Try it out:
   - Go to `/login`, enter your email, and check your inbox for the
     sign-in link.
   - Once signed in, click **+ New event**, give it a name.
   - Click **Customize** to set your welcome message, accent color, logo,
     and cover photo.
   - Copy the **guest link** shown on the dashboard and open it in a new
     private/incognito browser tab — that's what your guests will see.
   - Upload a test photo, video, voice note, and message from that tab,
     then go back to **View memories** on the host side to confirm they
     show up.

---

## Part 3 — Deploy it live (so guests can actually use it)

This mirrors how BiT Affairs is deployed on Vercel.

1. Push this project to a new GitHub repository (create one at
   https://github.com/new first):
   ```
   git init
   git add .
   git commit -m "Initial MemoryLane build"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/memorylane.git
   git push -u origin main
   ```

2. Go to https://vercel.com, sign in, click **Add New** → **Project**, and
   import the `memorylane` GitHub repo you just pushed.

3. Vercel will auto-detect it as a Vite project. Before clicking Deploy,
   expand **Environment Variables** and add the same two values from your
   `.env` file:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

4. Click **Deploy**. After it finishes, Vercel gives you a live URL like
   `memorylane.vercel.app`.

5. Go back to Supabase → **Authentication** → **URL Configuration**, and
   set **Site URL** to that live URL (e.g. `https://memorylane.vercel.app`).
   This makes the host sign-in email links work correctly in production.

That's it — every event you create will now have a real, shareable guest
link like `https://memorylane.vercel.app/e/johns-wedding-a1b2`.

---

## What's in v1 vs. what to add later

**Included now:**
- Host sign-in (passwordless email link)
- Create unlimited events, each with its own slug/link
- Per-event customization: name, welcome message, accent color, logo, cover photo
- Guest upload page (no login) for photos, videos, voice notes, text messages —
  **name is required**; guests can't upload until they enter their name
- Host gallery: each sender gets their own folder (an animated tap-to-open
  view), with their photos, videos, voice notes and messages grouped by
  type inside it
- **Live slideshow** — a full-screen "present" mode you project at the
  event itself. It updates in real time: the moment a guest uploads
  something, it interrupts the rotation to reveal it with their name,
  then resumes. Launch it from the dashboard or gallery ("🎬 Slideshow"
  / "Present slideshow") — best opened in fullscreen on the screen
  connected to your projector or TV.
- **Event segments** (inspired by GuestCam) — optional. For a multi-part
  event (welcome party, ceremony, reception), add segments in
  "Customize," and guests pick one before uploading. The gallery gets
  segment tabs, and you can present a live slideshow scoped to just one
  segment. Leave segments empty and everything works exactly as a single
  simple event, same as before.
- **Download all** — a "⬇ Download all" button on the gallery (and a
  "⬇ Download folder" inside each sender's folder) zips up everything —
  photos, videos, voice notes, and messages as text files — for you to
  keep.
- **Three distinct roles**:
  - **Guest** — no account, the white-labeled `/e/:slug` page, branded to
    that event only.
  - **Host** — signs in, sees and manages *only their own* events
    (dashboard, editor, gallery — cream/red "MemoryLane" chrome).
  - **Admin** — a separate role, not tied to owning any events. Can see
    *every* host's events at `/admin` (dark, badge-marked "🛡 Admin"
    chrome, clearly different from a host's own dashboard), but is
    strictly **read-only** on events they don't own — no edit, no delete.
    If an admin opens someone else's event gallery, it shows a
    "🛡 Admin view — read only" badge and hides the delete buttons.

> **Making someone an admin.** There's no signup toggle for this on
> purpose — it's done directly in the database. After the person has
> signed in at least once (so their account exists), run this once in the
> Supabase SQL Editor:
> ```sql
> insert into admins (user_id) select id from auth.users where email = 'you@example.com';
> ```

> **Live slideshow won't update in real time until you run this once**
> (already included if you're running `schema.sql` fresh — only needed if
> you set the database up before this feature existed):
> ```sql
> alter publication supabase_realtime add table memories;
> ```

> **Already ran `schema.sql` before this change?** Run this once in the
> Supabase SQL Editor to bring the `memories` table in line (only works if
> every existing row already has a name — if any don't, give them one first):
> ```sql
> alter table memories alter column guest_name set not null;
> ```

- **Look & feel pass**:
  - Real typography — Fraunces (editorial serif, loaded from Google Fonts)
    for headlines, Inter for body text, replacing the earlier system-font
    fallback
  - A small brand mark (two overlapping rings) next to the "MemoryLane"
    wordmark, rendered in a fixed ink color so it stays consistent
    regardless of any event's own accent color
  - Toast notifications and an animated confirm dialog replace every
    browser `alert()`/`confirm()` popup across the app
  - Skeleton loading placeholders and staggered entrance animations on
    the dashboard, gallery folders, and admin list
  - A redesigned fallback cover for voice/message-only sender folders (a
    textured badge instead of a flat icon), so it doesn't look like a
    missing image next to folders with real photos
  - Guest page: a drawn-checkmark success animation, an upload progress
    bar, and a brief shake on the name field if someone tries to upload
    before entering it
  - Live slideshow: a slow Ken Burns zoom/pan on photos and a real
    animated waveform for voice notes, replacing the static pulse ring
  - All animations respect `prefers-reduced-motion`

**Natural next additions** (say the word and I'll build any of these):
- QR code generator for each guest link
- "Download all" as a zip
- Optional passcode/PIN per event
- Custom domain per host (e.g. `memories.bitaffairs.com`)
- Email/SMS the host when a new memory comes in
