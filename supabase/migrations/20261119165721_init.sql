-- 40k Helper: initial schema
--
-- Rules data (factions, datasheets, weapons, stratagems, ...) is readable by everyone
-- and writable only with the service role key, the SQL editor or migrations.
-- User data (profiles, army lists) is protected by row-level security on auth.uid().
--
-- Conventions:
--   * Dice stats (attacks, damage, sometimes movement) are text: 'D6+1', '2D3'.
--   * "3+" characteristics (BS/WS, Sv, Ld) are stored as the integer target: 3.
--   * AP is stored as a non-positive integer: -2.

-- ─────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────

create type public.ability_type as enum ('core', 'faction', 'datasheet', 'wargear');
create type public.weapon_type as enum ('ranged', 'melee');
create type public.stratagem_category as enum ('battle_tactic', 'strategic_ploy', 'epic_deed', 'wargear');
create type public.game_phase as enum ('command', 'movement', 'shooting', 'charge', 'fight', 'any');
create type public.battlefield_role as enum (
  'epic_hero', 'character', 'battleline', 'dedicated_transport', 'fortification', 'other'
);

-- ─────────────────────────────────────────────────────────────
-- Factions & detachments
-- ─────────────────────────────────────────────────────────────

create table public.factions (
  id          bigint generated always as identity primary key,
  name        text not null,
  slug        text not null unique,
  army_rule   text,
  -- Sub-factions, e.g. Blood Angels -> Space Marines
  parent_id   bigint references public.factions (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index factions_parent_id_idx on public.factions (parent_id);

create table public.detachments (
  id          bigint generated always as identity primary key,
  faction_id  bigint not null references public.factions (id) on delete cascade,
  name        text not null,
  rule        text,
  description text,
  unique (faction_id, name)
);

-- Replaces the 9th-edition "relics" table.
create table public.enhancements (
  id            bigint generated always as identity primary key,
  detachment_id bigint not null references public.detachments (id) on delete cascade,
  name          text not null,
  points        integer not null check (points >= 0),
  description   text,
  restriction   text, -- e.g. 'INFANTRY model only'
  unique (detachment_id, name)
);

-- Core stratagems (Command Re-roll etc.) have no detachment.
create table public.stratagems (
  id            bigint generated always as identity primary key,
  detachment_id bigint references public.detachments (id) on delete cascade,
  name          text not null,
  cp_cost       integer not null check (cp_cost >= 0),
  category      public.stratagem_category not null,
  phase         public.game_phase not null,
  turn          text, -- 'Your turn', 'Opponent''s turn', 'Either player''s turn'
  "when"        text,
  target        text,
  effect        text not null,
  restrictions  text,
  unique nulls not distinct (detachment_id, name)
);

-- ─────────────────────────────────────────────────────────────
-- Datasheets
-- ─────────────────────────────────────────────────────────────

create table public.datasheets (
  id              bigint generated always as identity primary key,
  faction_id      bigint not null references public.factions (id) on delete cascade,
  name            text not null,
  slug            text not null,
  role            public.battlefield_role not null default 'other',
  composition     text, -- '1 Sergeant and 4-9 Intercessors'
  wargear_options text,
  base_size       text,
  lore            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (faction_id, slug)
);

-- One stat line per distinct model profile; most datasheets have exactly one.
create table public.model_profiles (
  id           bigint generated always as identity primary key,
  datasheet_id bigint not null references public.datasheets (id) on delete cascade,
  name         text not null,
  movement     text not null, -- inches, usually '6'; occasionally '20+'
  toughness    integer not null,
  save         integer not null,  -- 3 = 3+
  invuln_save  integer,           -- 4 = 4++
  wounds       integer not null,
  leadership   integer not null,  -- 6 = 6+
  oc           integer not null,  -- Objective Control
  sort_order   integer not null default 0,
  unique (datasheet_id, name)
);

-- Points by unit size: 5 models = 80, 10 models = 160.
create table public.unit_sizes (
  id           bigint generated always as identity primary key,
  datasheet_id bigint not null references public.datasheets (id) on delete cascade,
  models       integer not null check (models > 0),
  points       integer not null check (points >= 0),
  unique (datasheet_id, models)
);

-- ─────────────────────────────────────────────────────────────
-- Weapons
-- ─────────────────────────────────────────────────────────────

create table public.weapons (
  id   bigint generated always as identity primary key,
  name text not null unique
);

-- A weapon has one or more profiles (frag / krak).
create table public.weapon_profiles (
  id        bigint generated always as identity primary key,
  weapon_id bigint not null references public.weapons (id) on delete cascade,
  name      text not null,
  type      public.weapon_type not null,
  range     integer,          -- inches; null = Melee
  attacks   text not null,    -- '2', 'D6', 'D6+3'
  skill     integer,          -- BS/WS target; null for Torrent
  strength  integer not null,
  ap        integer not null default 0 check (ap <= 0),
  damage    text not null,    -- '1', 'D3', 'D6+1'
  keywords  text[] not null default '{}', -- {'ASSAULT','RAPID FIRE 1','LETHAL HITS'}
  unique (weapon_id, name),
  check ((type = 'melee') = (range is null))
);

create table public.datasheet_weapons (
  datasheet_id bigint not null references public.datasheets (id) on delete cascade,
  weapon_id    bigint not null references public.weapons (id) on delete cascade,
  is_default   boolean not null default true, -- false = available as an option
  primary key (datasheet_id, weapon_id)
);
create index datasheet_weapons_weapon_id_idx on public.datasheet_weapons (weapon_id);

-- ─────────────────────────────────────────────────────────────
-- Abilities, keywords, leaders
-- ─────────────────────────────────────────────────────────────

-- Replaces the old "abilities" and "auras" tables.
create table public.abilities (
  id          bigint generated always as identity primary key,
  name        text not null,
  type        public.ability_type not null,
  description text,
  is_aura     boolean not null default false,
  unique (name, type)
);

create table public.datasheet_abilities (
  datasheet_id bigint not null references public.datasheets (id) on delete cascade,
  ability_id   bigint not null references public.abilities (id) on delete cascade,
  value        text, -- '6"' for Scouts, 'D3' for Deadly Demise, '5+' for Feel No Pain
  primary key (datasheet_id, ability_id)
);
create index datasheet_abilities_ability_id_idx on public.datasheet_abilities (ability_id);

create table public.keywords (
  id         bigint generated always as identity primary key,
  name       text not null unique,
  is_faction boolean not null default false -- ADEPTUS ASTARTES vs INFANTRY
);

create table public.datasheet_keywords (
  datasheet_id bigint not null references public.datasheets (id) on delete cascade,
  keyword_id   bigint not null references public.keywords (id) on delete cascade,
  primary key (datasheet_id, keyword_id)
);
create index datasheet_keywords_keyword_id_idx on public.datasheet_keywords (keyword_id);

create table public.leader_attachments (
  leader_id    bigint not null references public.datasheets (id) on delete cascade,
  bodyguard_id bigint not null references public.datasheets (id) on delete cascade,
  primary key (leader_id, bodyguard_id),
  check (leader_id <> bodyguard_id)
);
create index leader_attachments_bodyguard_id_idx on public.leader_attachments (bodyguard_id);

-- ─────────────────────────────────────────────────────────────
-- User data
-- ─────────────────────────────────────────────────────────────

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Create a profile row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.army_lists (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null,
  faction_id    bigint not null references public.factions (id) on delete restrict,
  detachment_id bigint references public.detachments (id) on delete set null,
  points_limit  integer not null default 2000 check (points_limit > 0),
  notes         text,
  is_public     boolean not null default false, -- shareable read-only link
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index army_lists_owner_id_idx on public.army_lists (owner_id);
create index army_lists_faction_id_idx on public.army_lists (faction_id);
create index army_lists_detachment_id_idx on public.army_lists (detachment_id);

create table public.army_list_units (
  id             uuid primary key default gen_random_uuid(),
  army_list_id   uuid not null references public.army_lists (id) on delete cascade,
  datasheet_id   bigint not null references public.datasheets (id) on delete restrict,
  unit_size_id   bigint not null references public.unit_sizes (id) on delete restrict,
  enhancement_id bigint references public.enhancements (id) on delete set null,
  -- Set when this unit is a Leader attached to another unit in the same list
  attached_to_id uuid,
  sort_order     integer not null default 0,
  wargear_notes  text,
  unique (id, army_list_id),
  -- A Leader can only be attached to a unit in the same list
  foreign key (attached_to_id, army_list_id)
    references public.army_list_units (id, army_list_id) on delete cascade,
  check (attached_to_id is null or attached_to_id <> id)
);
create index army_list_units_army_list_id_idx on public.army_list_units (army_list_id);
create index army_list_units_datasheet_id_idx on public.army_list_units (datasheet_id);
create index army_list_units_unit_size_id_idx on public.army_list_units (unit_size_id);
create index army_list_units_enhancement_id_idx on public.army_list_units (enhancement_id);
create index army_list_units_attached_to_idx on public.army_list_units (attached_to_id, army_list_id);

-- Points total per list. security_invoker makes the view obey the caller's RLS.
create view public.army_list_totals
with (security_invoker = true)
as
select
  l.id as army_list_id,
  l.points_limit,
  coalesce(sum(us.points), 0) + coalesce(sum(e.points), 0) as points_total,
  count(u.id) as unit_count
from public.army_lists l
left join public.army_list_units u on u.army_list_id = l.id
left join public.unit_sizes us on us.id = u.unit_size_id
left join public.enhancements e on e.id = u.enhancement_id
group by l.id, l.points_limit;

-- updated_at triggers
create trigger set_updated_at before update on public.factions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.datasheets
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.army_lists
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Row-level security
-- ─────────────────────────────────────────────────────────────

-- Rules data: public read, no client writes (the service role bypasses RLS).
do $$
declare
  t text;
begin
  foreach t in array array[
    'factions', 'detachments', 'enhancements', 'stratagems',
    'datasheets', 'model_profiles', 'unit_sizes',
    'weapons', 'weapon_profiles', 'datasheet_weapons',
    'abilities', 'datasheet_abilities', 'keywords', 'datasheet_keywords',
    'leader_attachments'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "Rules data is readable by everyone" on public.%I for select to anon, authenticated using (true)',
      t
    );
  end loop;
end;
$$;

-- Profiles: anyone signed in can read display names; you can only edit your own.
alter table public.profiles enable row level security;

create policy "Profiles are readable by signed-in users"
  on public.profiles for select to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Army lists: owners have full access; public lists are readable by anyone.
alter table public.army_lists enable row level security;

create policy "Owners and public lists are readable"
  on public.army_lists for select to anon, authenticated
  using (is_public or (select auth.uid()) = owner_id);

create policy "Users can create their own lists"
  on public.army_lists for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Owners can update their lists"
  on public.army_lists for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Owners can delete their lists"
  on public.army_lists for delete to authenticated
  using ((select auth.uid()) = owner_id);

-- Army list units follow their parent list.
alter table public.army_list_units enable row level security;

create policy "Units are readable when their list is"
  on public.army_list_units for select to anon, authenticated
  using (exists (
    select 1 from public.army_lists l
    where l.id = army_list_id and (l.is_public or l.owner_id = (select auth.uid()))
  ));

create policy "Owners can add units"
  on public.army_list_units for insert to authenticated
  with check (exists (
    select 1 from public.army_lists l
    where l.id = army_list_id and l.owner_id = (select auth.uid())
  ));

create policy "Owners can update units"
  on public.army_list_units for update to authenticated
  using (exists (
    select 1 from public.army_lists l
    where l.id = army_list_id and l.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.army_lists l
    where l.id = army_list_id and l.owner_id = (select auth.uid())
  ));

create policy "Owners can delete units"
  on public.army_list_units for delete to authenticated
  using (exists (
    select 1 from public.army_lists l
    where l.id = army_list_id and l.owner_id = (select auth.uid())
  ));
