-- Full-text search across datasheets, abilities, weapons and stratagems.
--
-- Datasheets, abilities and stratagems get a generated tsvector column with a
-- GIN index (names weighted above body text). Weapons are matched on name and
-- profile keywords at query time; there are few enough of them.
--
-- public.search_rules(q) is called from the app as an RPC. Every word in q is
-- treated as a prefix, so "bolt rif" finds "Bolt rifle" while you type.

alter table public.datasheets add column fts tsvector generated always as (
  setweight(to_tsvector('english', name), 'A') ||
  setweight(to_tsvector('english', coalesce(composition, '') || ' ' || coalesce(wargear_options, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(lore, '')), 'D')
) stored;
create index datasheets_fts_idx on public.datasheets using gin (fts);

alter table public.abilities add column fts tsvector generated always as (
  setweight(to_tsvector('english', name), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B')
) stored;
create index abilities_fts_idx on public.abilities using gin (fts);

alter table public.stratagems add column fts tsvector generated always as (
  setweight(to_tsvector('english', name), 'A') ||
  setweight(to_tsvector('english',
    coalesce("when", '') || ' ' || coalesce(target, '') || ' ' || effect || ' ' || coalesce(restrictions, '')
  ), 'B')
) stored;
create index stratagems_fts_idx on public.stratagems using gin (fts);

-- Turns free text into a prefix tsquery: 'bolt rif' -> 'bolt':* & 'rif':*
create or replace function public.prefix_tsquery(q text)
returns tsquery
language sql
immutable
set search_path = ''
as $$
  select to_tsquery('english', string_agg(quote_literal(w) || ':*', ' & '))
  from regexp_split_to_table(lower(coalesce(q, '')), '[^[:alnum:]]+') as w
  where w <> '';
$$;

-- One row per match. `links` lists where it appears: for a datasheet, itself;
-- for an ability or weapon, the datasheets that have it (up to 12); for a
-- stratagem, its detachment and faction.
create or replace function public.search_rules(q text, max_results integer default 40)
returns table (
  kind    text,     -- 'datasheet' | 'ability' | 'weapon' | 'stratagem'
  id      bigint,
  name    text,
  detail  text,     -- a highlighted snippet or short summary
  links   jsonb,    -- [{ "name", "slug", "faction_slug", "faction_name" }]
  rank    real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with query as (select public.prefix_tsquery(q) as tsq),
  sheet_link as (
    select d.id, jsonb_build_object('name', d.name, 'slug', d.slug, 'faction_slug', f.slug, 'faction_name', f.name) as link
    from public.datasheets d join public.factions f on f.id = d.faction_id
  ),
  results as (
    -- Datasheets
    select 'datasheet'::text as kind, d.id, d.name,
           f.name as detail,
           jsonb_build_array(sl.link) as links,
           ts_rank(d.fts, query.tsq) + 0.5 as rank  -- boost: a unit is usually what you want
    from query, public.datasheets d
    join public.factions f on f.id = d.faction_id
    join sheet_link sl on sl.id = d.id
    where d.fts @@ query.tsq

    union all
    -- Abilities, with the datasheets that have them
    select 'ability', a.id, a.name,
           ts_headline('english', coalesce(a.description, ''), query.tsq,
                       'MaxWords=24, MinWords=8, StartSel=<<, StopSel=>>'),
           coalesce((
             select jsonb_agg(sl.link order by sl.link ->> 'name')
             from (select da.datasheet_id from public.datasheet_abilities da
                   where da.ability_id = a.id limit 12) da
             join sheet_link sl on sl.id = da.datasheet_id
           ), '[]'::jsonb),
           ts_rank(a.fts, query.tsq)
    from query, public.abilities a
    where a.fts @@ query.tsq

    union all
    -- Weapons: name and profile keywords
    select 'weapon', w.id, w.name,
           (select string_agg(distinct k, ', ') from public.weapon_profiles wp, unnest(wp.keywords) k
            where wp.weapon_id = w.id),
           coalesce((
             select jsonb_agg(sl.link order by sl.link ->> 'name')
             from (select dw.datasheet_id from public.datasheet_weapons dw
                   where dw.weapon_id = w.id limit 12) dw
             join sheet_link sl on sl.id = dw.datasheet_id
           ), '[]'::jsonb),
           ts_rank(v.fts, query.tsq)
    from query, public.weapons w
    cross join lateral (
      select setweight(to_tsvector('english', w.name), 'A') ||
             setweight(to_tsvector('english', coalesce(string_agg(array_to_string(wp.keywords, ' '), ' '), '')), 'B') as fts
      from public.weapon_profiles wp where wp.weapon_id = w.id
    ) v
    where v.fts @@ query.tsq

    union all
    -- Stratagems
    select 'stratagem', s.id, s.name,
           ts_headline('english', s.effect, query.tsq, 'MaxWords=24, MinWords=8, StartSel=<<, StopSel=>>'),
           case when det.id is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object(
             'name', det.name, 'detachment_id', det.id, 'faction_slug', f.slug, 'faction_name', f.name
           )) end,
           ts_rank(s.fts, query.tsq)
    from query, public.stratagems s
    left join public.detachments det on det.id = s.detachment_id
    left join public.factions f on f.id = det.faction_id
    where s.fts @@ query.tsq
  )
  select r.kind, r.id, r.name, r.detail, r.links, r.rank::real
  from results r
  order by r.rank desc, r.name
  limit least(greatest(max_results, 1), 100);
$$;

grant execute on function public.search_rules(text, integer) to anon, authenticated;
grant execute on function public.prefix_tsquery(text) to anon, authenticated;
