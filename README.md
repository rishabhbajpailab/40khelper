# 40k Helper

A web companion for playing **Warhammer 40,000**: look up datasheets fast, build and check army lists, and keep the table moving on game day.

> Status: early. The data model, auth and row-level security are in place. The UI has sign-in, a datasheet browser and a "my lists" page. See [Roadmap](#roadmap).

## What it's for

- **Datasheet lookup**: unit stats, weapon profiles, abilities and keywords, searchable from a phone at the table.
- **Army builder**: pick a faction and detachment, add units at a set size, give characters enhancements, attach Leaders to bodyguard units, and see the points total update against the limit.
- **Rules reference**: detachment rules, enhancements and stratagems, filterable by game phase so you can see what's usable right now.
- **Game-day helpers** (later): CP and VP tracking, a turn and phase tracker, and a stratagem shortlist for your army.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | [Next.js 15](https://nextjs.org/) App Router APIs (Server Components, Server Actions) + React 19 + TypeScript, built with [vinext](https://github.com/cloudflare/vinext) on Vite |
| Styling | Tailwind CSS, Headless UI, Heroicons, Framer Motion |
| Backend | [Supabase](https://supabase.com/): Postgres, Auth (email magic links) and row-level security |
| Data access | `@supabase/supabase-js` + `@supabase/ssr`, typed from the database with `supabase gen types` |
| Schema | Plain SQL migrations in `supabase/migrations`, managed by the Supabase CLI |
| Hosting | [Cloudflare Workers](https://developers.cloudflare.com/workers/) (config in `cloudflare.config.ts`) |
| Key-value store | Cloudflare Workers KV (`KV` binding) |
| Object storage | Cloudflare R2 (`BUCKET` binding, bucket `40khelper-assets`) |
| Background jobs | Cloudflare Cron Triggers on the same Worker (`worker/index.ts`); Queues when needed |

**What goes where:** Supabase owns relational data, auth and row-level security. Everything else (compute, caching, files, scheduled work) runs on Cloudflare.

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

- Node.js 22+
- Docker, only if you want the local Supabase stack (Postgres, Auth, Studio and a test inbox). Without it, point `.env.local` at the hosted project.

### Setup

```bash
git clone https://github.com/rishabhbajpailab/40khelper.git
cd 40khelper
npm install

npm run db:start            # starts local Supabase, applies migrations and seed.sql
cp .env.example .env.local  # paste the API URL and publishable key it printed

npm run dev                 # http://localhost:3000, runs in the real Workers runtime (workerd)
```

`npm run dev` simulates the KV and R2 bindings locally, so nothing touches the production namespace or bucket.

To sign in locally, request a magic link and open it from the Mailpit inbox at http://127.0.0.1:54324. Studio, Supabase's table editor and SQL console, is at http://127.0.0.1:54323.

### Loading data

The local seed has no datasheets. Load the fictional example faction, or your own files in the
format described in [docs/data-format.md](docs/data-format.md):

```bash
SUPABASE_SECRET_KEY=$(npx supabase status -o json | jq -r .SECRET_KEY) npm run data:import -- data/example.json
```

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
| `npm run dev` | Start the dev server (Vite + workerd) |
| `npm run build` | Production build into `.cloudflare/output` |
| `npm run preview` | Build, then serve the built Worker locally |
| `npm run deploy` | Deploy the built Worker to Cloudflare |
| `npm run lint` / `typecheck` | ESLint / regenerate binding types and run `tsc` |
| `npm run cf:types` | Regenerate `.cloudflare/types` after changing bindings |
| `npm run db:start` / `db:stop` | Start / stop the local Supabase stack |
| `npm run db:reset` | Recreate the local DB from migrations and `seed.sql` |
| `npm run db:new <name>` | Create a new migration file |
| `npm run db:push` | Apply migrations to the linked hosted project (`npx supabase link` first) |
| `npm run db:types` | Regenerate `types/database.ts` from the local DB |
| `npm run data:import -- <files>` | Load rules data JSON into Supabase (`--dry-run` to validate only) |

## Deployment

Production runs on **Cloudflare Workers** with **Supabase** as the backend.

| Resource | Where | ID / name |
| --- | --- | --- |
| Postgres, Auth, RLS | Supabase project `40khelper` (us-west-1) | `hhxsziiunynimvjtzyvb` |
| App (Worker) | Cloudflare Workers, at https://40k.glizzy.dev | `40khelper` |
| KV namespace | Cloudflare | `40khelper-kv` (`05a81431a55b44d5b76747b1ace93132`) |
| R2 bucket | Cloudflare | `40khelper-assets` |

The public Supabase URL and publishable key are committed in `.env.production`, because `NEXT_PUBLIC_*` values are inlined at build time and are public anyway. Server-only secrets (such as a Supabase secret key for an import job) go in Worker secrets: `npx cf secrets put <NAME>`, then declare them with `bindings.secret()` in `cloudflare.config.ts`.

### Deploy with Workers Builds (recommended)

Cloudflare builds and deploys on every push, so no GitHub Actions or API tokens are needed:

1. Cloudflare dashboard → Workers & Pages → **40khelper** (or Create → Import a repository) → Settings → Builds → connect `rishabhbajpailab/40khelper`.
2. Build command `npm run build`, deploy command `npm run deploy`, production branch `main`.

### Deploy from your machine

```bash
npx cf auth login
npx @vinext/cloudflare deploy --dry-run
npm run build && npm run deploy
```

### Scheduled jobs

`worker/index.ts` wraps vinext's request handler and adds a `scheduled()` handler. Schedules live in `cloudflare.config.ts`. There's currently one:

- **Supabase keep-alive**, daily at 09:17 UTC: runs one tiny read so the Free plan project isn't paused for inactivity. Signed-out traffic doesn't touch the database, so without it the project would pause after about a week of no real use. Its output appears in the Worker's logs.

To test it locally, run `npm run preview` and POST `{"cron":"17 9 * * *"}` to `/cdn-cgi/local/explorer/api/local/scheduled?worker=40khelper`.

### Running cost

On the Workers Free and Supabase Free plans, idle use plus background bot traffic costs **$0/month**. Free plan limits fail closed (requests error until the daily reset) rather than billing. The public `/api/health` route only reads from KV, so it can't use up KV's 1,000 writes a day.

### Supabase auth URLs

The app is served at **https://40k.glizzy.dev**. It's a Workers Custom Domain on the Cloudflare-managed `glizzy.dev` zone, declared in `cloudflare.config.ts`, so the first deploy creates its DNS record and certificate. The `workers.dev` URL is turned off.

In Supabase → Authentication → URL Configuration, set the **Site URL** to `https://40k.glizzy.dev` and add `https://40k.glizzy.dev/auth/callback` to the redirect URLs. Magic links won't land back in the app until this is done.

### Schema changes in production

```bash
npx supabase link --project-ref hhxsziiunynimvjtzyvb
npm run db:push
```

## Project layout

```
app/                 Pages, layouts and route handlers
  api/health/        Liveness check (read-only KV probe)
  login/             Magic-link sign-in (Server Action)
  auth/callback/     Exchanges the emailed code for a session
  auth/signout/      Signs out (POST)
  factions/          Datasheet browser: factions → datasheets → datasheet card
  components/        Shared UI (site nav)
  lists/             The signed-in user's army lists
middleware.ts        Refreshes the Supabase session; gates /lists
utils/supabase/      Browser, server and middleware Supabase clients, plus the keep-alive job
utils/format.ts      Display helpers for stats (3 → "3+", null range → "Melee")
utils/cloudflare.ts  KV and R2 bindings, plus a KV read-through cache helper
cloudflare.config.ts Worker name, domain, cron schedules and bindings
worker/index.ts      Worker entry: vinext fetch handler + scheduled() jobs
vite.config.ts       vinext + Cloudflare Vite plugin
types/database.ts    Generated database types (npm run db:types)
scripts/import-data.ts  JSON rules data → Supabase (docs/data-format.md)
data/example.json    Fictional sample faction for local testing
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
- [x] Hosted Supabase project with migrations applied
- [x] Cloudflare Workers hosting via vinext, with KV and R2 bindings
- [x] Data import script (JSON → Supabase with the secret key; see [docs/data-format.md](docs/data-format.md))
- [x] Datasheet browser: faction list → datasheet list → datasheet card
- [ ] Search across datasheets, weapons and abilities (Postgres full-text search)
- [ ] Army builder with validation (Rule of Three, enhancement limits, Leader attachments)
- [ ] Shareable public list links
- [ ] Stratagem quick-reference filtered by phase and detachment
- [ ] Game tracker: CP, VP, turn and phase (Supabase Realtime for a shared table view)

## Data & IP

This is an unofficial fan project and isn't affiliated with or endorsed by Games Workshop. Warhammer 40,000 and related names are trademarks of Games Workshop Ltd. The repo contains no rules text; you supply your own data for your own use.
