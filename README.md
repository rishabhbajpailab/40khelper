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
| Data | PostgreSQL ([Vercel Postgres](https://vercel.com/storage/postgres)) via [Prisma](https://www.prisma.io/) |
| Auth | [Supabase](https://supabase.com/) (army lists belong to a Supabase user id) |
| Client data | React Query, validation with Zod |
| Hosting | [Vercel](https://40khelper.vercel.app) |

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
- A PostgreSQL database. A Vercel Postgres store works, and so does a local `postgres` container.

### Setup

```bash
git clone https://github.com/rishabhbajpailab/40khelper.git
cd 40khelper
npm install                 # also runs `prisma generate`

cp .env.example .env.local  # used by Next.js
cp .env.example .env        # used by the Prisma CLI
# fill in the database (and Supabase) values in both

npm run db:migrate          # create the tables
npm run dev                 # http://localhost:3000
```

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:migrate` | Create and apply a migration from the schema |
| `npm run db:studio` | Browse the database in Prisma Studio |

## Project layout

```
app/              Next.js App Router pages, layouts and API route handlers
prisma/           Prisma schema (and migrations once created)
utils/            Shared server utilities (Prisma client singleton, cache helpers)
public/           Static assets
```

## Roadmap

- [x] Next.js + Tailwind scaffold, deployed on Vercel
- [x] Postgres + Prisma connected
- [x] Data model for factions, detachments, datasheets, weapons, abilities, stratagems and army lists
- [ ] Initial migration and a seed script for one faction
- [ ] Data import pipeline (CSV/JSON → Postgres)
- [ ] Datasheet browser: faction list → datasheet list → datasheet card
- [ ] Search across datasheets, weapons and abilities
- [ ] Supabase auth and saved army lists
- [ ] Army builder with points totals and validation (Rule of Three, enhancement limits, Leader attachments)
- [ ] Stratagem quick-reference filtered by phase and detachment
- [ ] Game tracker: CP, VP, turn and phase

## Data & IP

This is an unofficial fan project and isn't affiliated with or endorsed by Games Workshop. Warhammer 40,000 and related names are trademarks of Games Workshop Ltd. The repo contains no rules text; you supply your own data for your own use.
