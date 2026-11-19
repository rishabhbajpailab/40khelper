# 40k Helper

A web companion for playing **Warhammer 40,000**: look up datasheets fast, build and check army lists, and keep the table moving on game day.

> Status: early. The data model is in place, and the UI is still the Next.js starter page. See [Roadmap](#roadmap).

## What it's for

- **Datasheet lookup**: unit stats, weapon profiles, abilities and keywords, searchable from a phone at the table.
- **Army builder**: pick a faction and detachment, add units at a set size, give characters enhancements, attach Leaders to bodyguard units, and see the points total update against the limit.
- **Rules reference**: detachment rules, enhancements and stratagems, filterable by game phase so you can see what's usable right now.
- **Game-day helpers** (later): CP and VP tracking, a turn and phase tracker, and a stratagem shortlist for your army.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | [Next.js 13](https://nextjs.org/) (App Router) + React 18 + TypeScript |
| Styling | Tailwind CSS, Headless UI, Heroicons, Framer Motion |
| Data | PostgreSQL (any provider, 14+) via [Prisma](https://www.prisma.io/) |
| Auth | [Supabase](https://supabase.com/) (army lists belong to a Supabase user id) |
| Client data | React Query, validation with Zod |
| Hosting | Anywhere that runs Node 18 or a container (standalone Next.js output + Dockerfile) |

## Data model

The schema lives in [`prisma/schema.prisma`](prisma/schema.prisma). It follows the current datasheet layout:

```
Faction ──┬── Detachment ──┬── Enhancement
          │                └── Stratagem          (core stratagems have no detachment)
          │
          └── Datasheet ──┬── ModelProfile        M / T / Sv / Inv / W / Ld / OC
                          ├── UnitSize            models → points
                          ├── DatasheetWeapon ──── Weapon ── WeaponProfile
                          ├── DatasheetAbility ─── Ability   (core / faction / datasheet / wargear)
                          ├── DatasheetKeyword ─── Keyword
                          └── LeaderAttachment    which units a Leader can join

ArmyList (owned by a user) ── ArmyListUnit ── Datasheet + UnitSize (+ Enhancement, + attached Leader)
```

Modelling notes:

- **Dice stats are strings.** Attacks, Damage and Movement can be `D6+1` or `2D3`, so they're stored as text. Characteristics shown as `3+` (BS, WS, Sv, Ld) are stored as the number `3`.
- **Weapons have profiles.** A weapon like a missile launcher has frag and krak profiles. Weapon abilities (`ASSAULT`, `RAPID FIRE 1`, `LETHAL HITS`) are a string array on each profile.
- **Parameterised abilities.** `DatasheetAbility.value` holds the number for abilities like Scouts 6", Deadly Demise D3 or Feel No Pain 5+.
- **Replaced from the first draft:** `warhammer_units` became `Datasheet`/`ModelProfile`, `relics` became `Enhancement`, `auras` became `Ability.isAura`, the separate ranged and melee weapon tables became `Weapon`/`WeaponProfile`, and stratagems now hang off detachments instead of units.

## Getting started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+. The bundled `docker-compose.yml` starts one locally, or point at any managed or self-hosted instance.

### Setup

```bash
git clone https://github.com/rishabhbajpailab/40khelper.git
cd 40khelper
npm install                 # also runs `prisma generate`

docker compose up -d db     # optional: local Postgres on :5432

cp .env.example .env.local  # used by Next.js
cp .env.example .env        # used by the Prisma CLI
# the defaults match the compose database; change them for any other Postgres

npm run db:migrate          # apply migrations to your database
npm run dev                 # http://localhost:3000
```

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:migrate` | Create and apply a migration from the schema (development) |
| `npm run db:deploy` | Apply committed migrations (production / CI) |
| `npm run db:studio` | Browse the database in Prisma Studio |

## Deployment

The app doesn't depend on any hosting platform. It needs Node 18+ and a PostgreSQL database reachable through `DATABASE_URL` and `DIRECT_URL`. If you don't use a connection pooler, set both to the same value.

**Container (any host that runs Docker):**

```bash
docker build -t 40khelper .
docker run --rm -e DATABASE_URL=... -e DIRECT_URL=... 40khelper \
  node node_modules/prisma/build/index.js migrate deploy   # once per release
docker run -p 3000:3000 -e DATABASE_URL=... -e DIRECT_URL=... 40khelper
```

Or start the whole stack locally with `docker compose up --build`.

**Plain Node:**

```bash
npm ci && npm run build && npm run db:deploy
cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
node .next/standalone/server.js
```

## Project layout

```
app/              Next.js App Router pages, layouts and API route handlers
prisma/           Prisma schema and migrations
utils/            Shared server utilities (Prisma client singleton, cache helpers)
public/           Static assets
```

## Roadmap

- [x] Next.js + Tailwind scaffold
- [x] Postgres + Prisma connected
- [x] Data model for factions, detachments, datasheets, weapons, abilities, stratagems and army lists
- [x] Initial migration
- [x] Platform-neutral deployment (standalone build, Dockerfile, docker-compose)
- [ ] Seed script for one faction
- [ ] Data import pipeline (CSV/JSON → Postgres)
- [ ] Datasheet browser: faction list → datasheet list → datasheet card
- [ ] Search across datasheets, weapons and abilities
- [ ] Supabase auth and saved army lists
- [ ] Army builder with points totals and validation (Rule of Three, enhancement limits, Leader attachments)
- [ ] Stratagem quick-reference filtered by phase and detachment
- [ ] Game tracker: CP, VP, turn and phase

## Data & IP

This is an unofficial fan project and isn't affiliated with or endorsed by Games Workshop. Warhammer 40,000 and related names are trademarks of Games Workshop Ltd. The repo contains no rules text; you supply your own data for your own use.
