# 40k Helper

A web companion for playing **Warhammer 40,000**: look up datasheets fast, build and check army lists, and keep the table moving on game day.

> Status: early. The data model, auth and row-level security are in place. The UI has sign-in and a "my lists" page; the datasheet browser and army builder come next. See [Roadmap](#roadmap).

## What it's for

- **Datasheet lookup**: unit stats, weapon profiles, abilities and keywords, searchable from a phone at the table.
- **Army builder**: pick a faction and detachment, add units at a set size, give characters enhancements, attach Leaders to bodyguard units, and see the points total update against the limit.
- **Rules reference**: detachment rules, enhancements and stratagems, filterable by game phase so you can see what's usable right now.
- **Game-day helpers** (later): CP and VP tracking, a turn and phase tracker, and a stratagem shortlist for your army.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | [Next.js 14](https://nextjs.org/) (App Router, Server Actions) + React 18 + TypeScript |
| Styling | Tailwind CSS, Headless UI, Heroicons, Framer Motion |
| Backend | [Supabase](https://supabase.com/): Postgres, Auth (email magic links) and row-level security |
| Data access | `@supabase/supabase-js` + `@supabase/ssr`, typed from the database with `supabase gen types` |
| Schema | Plain SQL migrations in `supabase/migrations`, managed by the Supabase CLI |
| Hosting | Anywhere that runs Node 20+ or a container (standalone Next.js output + Dockerfile) |

Supabase is open source and [self-hostable](https://supabase.com/docs/guides/self-hosting), so the hosted platform is a convenience, not a lock-in.

## Data model

The schema lives in [`supabase/migrations`](supabase/migrations). It follows the current datasheet layout:

```
factions ──┬── detachments ──┬── enhancements
           │                 └── stratagems         (core stratagems have no detachment)
           │
           └── datasheets ──┬── model_profiles      M / T / Sv / Inv / W / Ld / OC
                            ├── unit_sizes          models → points
                            ├── datasheet_weapons ── weapons ── weapon_profiles
                            ├── datasheet_abilities ─ abilities (core / faction / datasheet / wargear)
                            ├── datasheet_keywords ── keywords
                            └── leader_attachments  which units a Leader can join

auth.users ── profiles
          └── army_lists ── army_list_units ── datasheets + unit_sizes (+ enhancement, + attached Leader)
                         └── army_list_totals (view: points used vs. limit)
```

Modelling notes:

- **Dice stats are text.** Attacks, Damage and Movement can be `D6+1` or `2D3`. Characteristics shown as `3+` (BS, WS, Sv, Ld) are stored as the number `3`, and AP as a non-positive number (`-2`).
- **Weapons have profiles.** A missile launcher has frag and krak profiles. Weapon abilities (`ASSAULT`, `RAPID FIRE 1`, `LETHAL HITS`) are a `text[]` on each profile.
- **Parameterised abilities.** `datasheet_abilities.value` holds the number for Scouts 6", Deadly Demise D3 or Feel No Pain 5+.
- **Leaders stay in their list.** A composite foreign key means a unit can only be attached to another unit in the same army list.
- **Profiles are automatic.** A trigger on `auth.users` creates a `profiles` row on sign-up.

### Security (row-level security)

Every table has RLS enabled, so the browser can query Supabase directly and still only see what it should.

| Data | Read | Write |
| --- | --- | --- |
| Rules data (factions, datasheets, weapons, stratagems, ...) | Everyone, signed in or not | Only the service role, the SQL editor or migrations |
| `profiles` | Signed-in users | The user it belongs to |
| `army_lists`, `army_list_units` | The owner, or anyone if `is_public` is set | The owner |

`army_list_totals` is a `security_invoker` view, so it follows the same rules as the tables beneath it.

## Getting started

### Prerequisites

- Node.js 20+
- Docker, for the local Supabase stack (Postgres, Auth, Studio and a test inbox)

### Setup

```bash
git clone https://github.com/rishabhbajpailab/40khelper.git
cd 40khelper
npm install

npm run db:start            # starts local Supabase, applies migrations and seed.sql
cp .env.example .env.local  # paste the API URL and publishable key it printed

npm run dev                 # http://localhost:3000
```

To sign in locally, request a magic link and open it from the Mailpit inbox at http://127.0.0.1:54324. Studio, Supabase's table editor and SQL console, is at http://127.0.0.1:54323.

### Changing the schema

```bash
npm run db:new add_something   # creates supabase/migrations/<timestamp>_add_something.sql
# write the SQL, including RLS policies for any new table
npm run db:reset               # rebuild the local DB from migrations + seed
npm run db:types               # regenerate types/database.ts
```

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run db:start` / `db:stop` | Start / stop the local Supabase stack |
| `npm run db:reset` | Recreate the local DB from migrations and `seed.sql` |
| `npm run db:new <name>` | Create a new migration file |
| `npm run db:push` | Apply migrations to the linked hosted project (`npx supabase link` first) |
| `npm run db:types` | Regenerate `types/database.ts` from the local DB |

## Deployment

1. Create a Supabase project (hosted or self-hosted), then run `npx supabase link --project-ref <ref>` and `npm run db:push`.
2. In the project's Auth settings, set the **Site URL** to your app's URL and add `https://<your-domain>/auth/callback` to the redirect URLs.
3. Deploy the app with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set.

**Container:** `NEXT_PUBLIC_*` values are baked into the client bundle at build time, so pass them as build args:

```bash
docker build -t 40khelper \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<key> .
docker run -p 3000:3000 40khelper
```

**Plain Node:**

```bash
npm ci && npm run build
cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
node .next/standalone/server.js
```

Behind a reverse proxy, forward `Host` (or `X-Forwarded-Host`) and `X-Forwarded-Proto` so auth redirects point at the public URL.

## Project layout

```
app/                 Pages, layouts and route handlers
  login/             Magic-link sign-in (Server Action)
  auth/callback/     Exchanges the emailed code for a session
  auth/signout/      Signs out (POST)
  lists/             The signed-in user's army lists
middleware.ts        Refreshes the Supabase session; gates /lists
utils/supabase/      Browser, server and middleware Supabase clients
types/database.ts    Generated database types (npm run db:types)
supabase/
  config.toml        Local stack and auth settings
  migrations/        SQL schema, RLS policies, triggers and views
  seed.sql           Local-only seed data
```

## Roadmap

- [x] Next.js + Tailwind scaffold
- [x] Data model for factions, detachments, datasheets, weapons, abilities, stratagems and army lists
- [x] Supabase migrations, row-level security and generated types
- [x] Magic-link auth, session middleware and a "my lists" page
- [x] Platform-neutral deployment (standalone build, Dockerfile)
- [ ] Data import script (CSV/JSON → Supabase with the service role key)
- [ ] Datasheet browser: faction list → datasheet list → datasheet card
- [ ] Search across datasheets, weapons and abilities (Postgres full-text search)
- [ ] Army builder with validation (Rule of Three, enhancement limits, Leader attachments)
- [ ] Shareable public list links
- [ ] Stratagem quick-reference filtered by phase and detachment
- [ ] Game tracker: CP, VP, turn and phase (Supabase Realtime for a shared table view)

## Data & IP

This is an unofficial fan project and isn't affiliated with or endorsed by Games Workshop. Warhammer 40,000 and related names are trademarks of Games Workshop Ltd. The repo contains no rules text; you supply your own data for your own use.
