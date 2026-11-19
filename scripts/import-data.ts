// Loads rules data from JSON files into Supabase.
//
//   SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/import-data.ts data/*.json
//   npm run data:import -- data/my-faction.json          (local stack, see README)
//
// It needs a secret (service role) key because rules tables are read-only to
// everyone else under RLS. The import is idempotent: rows are matched on their
// natural keys (faction slug, datasheet slug, weapon name, ...) and updated in
// place, so re-running a file after editing it is safe. Child rows a file no
// longer lists (model profiles, weapons, abilities, keywords, leader links) are
// removed; unit sizes still used by an army list are kept and reported.
//
// The file format is documented in docs/data-format.md and validated below.
// Run with --dry-run to validate without writing anything.

import { readFile } from 'node:fs/promises'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { Database } from '../types/database'

// ─────────────────────────────────────────────────────────────
// Input format
// ─────────────────────────────────────────────────────────────

// "3+" -> 3, 3 -> 3. Used for BS/WS, Sv, invuln and Ld.
const target = z.union([
  z.number().int().min(1).max(7),
  z
    .string()
    .regex(/^\d\+{1,2}$/, 'expected a value like "3+"')
    .transform((s) => parseInt(s, 10)),
])

// "-2" / -2 / "0" -> -2 / 0
const ap = z
  .union([z.number().int().max(0), z.string().regex(/^(-\d+|0)$/).transform((s) => parseInt(s, 10))])
  .default(0)

// '24"' / 24 / "Melee" -> 24 / null
const range = z.union([
  z.number().int().positive(),
  z.literal('Melee').transform(() => null),
  z
    .string()
    .regex(/^\d+"?$/, 'expected a range like 24" or "Melee"')
    .transform((s) => parseInt(s, 10)),
])

// Dice values stay text: "D6+1", "2D3", "3".
const dice = z
  .union([z.number().int().nonnegative().transform(String), z.string().regex(/^(\d*D\d+(\+\d+)?|\d+)$/i)])
  .transform((s) => s.toUpperCase())

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'slugs are lower-case-with-dashes')

const ability = z.object({
  name: z.string().min(1),
  type: z.enum(['core', 'faction', 'datasheet', 'wargear']).default('datasheet'),
  description: z.string().optional(),
  aura: z.boolean().default(false),
  // Parameter for abilities like Scouts 6", Deadly Demise D3, Feel No Pain 5+.
  value: z.string().optional(),
})

const weaponProfile = z
  .object({
    // Profile name; defaults to the weapon's name for single-profile weapons.
    name: z.string().min(1).optional(),
    range,
    attacks: dice,
    // Omit for Torrent weapons.
    skill: target.optional(),
    strength: z.number().int().positive(),
    ap,
    damage: dice,
    keywords: z.array(z.string().min(1)).default([]),
  })
  .transform((p) => ({ ...p, type: p.range === null ? ('melee' as const) : ('ranged' as const) }))

const weapon = z.object({
  name: z.string().min(1),
  // false = a wargear option rather than default equipment
  default: z.boolean().default(true),
  profiles: z.array(weaponProfile).min(1),
})

const modelProfile = z.object({
  name: z.string().min(1),
  movement: z.union([z.number().int().nonnegative().transform(String), z.string().regex(/^\d+\+?"?$/)]).transform(
    (s) => s.replace(/"$/, ''),
  ),
  toughness: z.number().int().positive(),
  save: target,
  invuln: target.optional(),
  wounds: z.number().int().positive(),
  leadership: target,
  oc: z.number().int().nonnegative(),
})

const datasheet = z.object({
  slug,
  name: z.string().min(1),
  role: z
    .enum(['epic_hero', 'character', 'battleline', 'dedicated_transport', 'fortification', 'other'])
    .default('other'),
  composition: z.string().optional(),
  wargear_options: z.string().optional(),
  base_size: z.string().optional(),
  lore: z.string().optional(),
  profiles: z.array(modelProfile).min(1),
  sizes: z.array(z.object({ models: z.number().int().positive(), points: z.number().int().nonnegative() })).min(1),
  weapons: z.array(weapon).default([]),
  abilities: z.array(ability).default([]),
  keywords: z.array(z.string().min(1)).default([]),
  faction_keywords: z.array(z.string().min(1)).default([]),
  // Slugs of datasheets (in the same faction) this Leader can join.
  leads: z.array(slug).default([]),
})

const stratagem = z.object({
  name: z.string().min(1),
  cp: z.number().int().nonnegative(),
  category: z.enum(['battle_tactic', 'strategic_ploy', 'epic_deed', 'wargear']),
  phase: z.enum(['command', 'movement', 'shooting', 'charge', 'fight', 'any']),
  turn: z.string().optional(),
  when: z.string().optional(),
  target: z.string().optional(),
  effect: z.string().min(1),
  restrictions: z.string().optional(),
})

const detachment = z.object({
  name: z.string().min(1),
  rule: z.string().optional(),
  description: z.string().optional(),
  enhancements: z
    .array(
      z.object({
        name: z.string().min(1),
        points: z.number().int().nonnegative(),
        description: z.string().optional(),
        restriction: z.string().optional(),
      }),
    )
    .default([]),
  stratagems: z.array(stratagem).default([]),
})

const faction = z.object({
  slug,
  name: z.string().min(1),
  army_rule: z.string().optional(),
  // Slug of the parent faction, e.g. a chapter's parent.
  parent: slug.optional(),
  detachments: z.array(detachment).default([]),
  datasheets: z.array(datasheet).default([]),
})

export const dataFile = z.object({
  factions: z.array(faction).default([]),
  // Stratagems any army can use (no detachment).
  core_stratagems: z.array(stratagem).default([]),
  // Standalone ability definitions, e.g. core abilities with their rules text.
  abilities: z.array(ability.omit({ value: true })).default([]),
})

type DataFile = z.infer<typeof dataFile>
type Client = SupabaseClient<Database>

// ─────────────────────────────────────────────────────────────
// Import
// ─────────────────────────────────────────────────────────────

const warnings: string[] = []

function must<T>(res: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (res.error) throw new Error(`${what}: ${res.error.message}`)
  return res.data as NonNullable<T>
}

// Abilities and keywords are shared between factions; upsert them once and
// return name -> id maps.
async function upsertAbilities(db: Client, file: DataFile) {
  const byKey = new Map<string, { name: string; type: z.infer<typeof ability>['type']; description?: string; is_aura: boolean }>()
  const add = (a: { name: string; type: z.infer<typeof ability>['type']; description?: string; aura: boolean }) => {
    const key = `${a.type}:${a.name}`
    const prev = byKey.get(key)
    // Keep the first description we see; later mentions may just reference it.
    byKey.set(key, {
      name: a.name,
      type: a.type,
      description: prev?.description ?? a.description,
      is_aura: (prev?.is_aura ?? false) || a.aura,
    })
  }
  file.abilities.forEach(add)
  file.factions.forEach((f) => f.datasheets.forEach((d) => d.abilities.forEach(add)))

  const ids = new Map<string, number>()
  const rows = [...byKey.values()]
  if (rows.length === 0) return ids

  // Only overwrite descriptions we actually have, so a bare reference to
  // "Deep Strike" in one file doesn't wipe the text another file supplied.
  const withText = rows.filter((r) => r.description !== undefined)
  const withoutText = rows.filter((r) => r.description === undefined).map(({ description: _, ...r }) => r)
  for (const batch of [withText, withoutText]) {
    if (batch.length === 0) continue
    const data = must(
      await db.from('abilities').upsert(batch, { onConflict: 'name,type' }).select('id, name, type'),
      'abilities',
    )
    data.forEach((r) => ids.set(`${r.type}:${r.name}`, r.id))
  }
  return ids
}

async function upsertKeywords(db: Client, file: DataFile) {
  const rows = new Map<string, boolean>()
  for (const f of file.factions)
    for (const d of f.datasheets) {
      d.keywords.forEach((k) => rows.set(k.toUpperCase(), rows.get(k.toUpperCase()) ?? false))
      d.faction_keywords.forEach((k) => rows.set(k.toUpperCase(), true))
    }
  const ids = new Map<string, number>()
  if (rows.size === 0) return ids
  const data = must(
    await db
      .from('keywords')
      .upsert([...rows].map(([name, is_faction]) => ({ name, is_faction })), { onConflict: 'name' })
      .select('id, name'),
    'keywords',
  )
  data.forEach((r) => ids.set(r.name, r.id))
  return ids
}

// Weapons are global by name. Two files describing the same weapon must agree;
// the last one wins.
async function upsertWeapons(db: Client, file: DataFile) {
  const byName = new Map<string, z.infer<typeof weapon>>()
  file.factions.forEach((f) => f.datasheets.forEach((d) => d.weapons.forEach((w) => byName.set(w.name, w))))
  const ids = new Map<string, number>()
  if (byName.size === 0) return ids

  const data = must(
    await db
      .from('weapons')
      .upsert([...byName.keys()].map((name) => ({ name })), { onConflict: 'name' })
      .select('id, name'),
    'weapons',
  )
  data.forEach((r) => ids.set(r.name, r.id))

  const profiles = [...byName.values()].flatMap((w) =>
    w.profiles.map((p) => ({
      weapon_id: ids.get(w.name)!,
      name: p.name ?? w.name,
      type: p.type,
      range: p.range,
      attacks: p.attacks,
      skill: p.skill ?? null,
      strength: p.strength,
      ap: p.ap,
      damage: p.damage,
      keywords: p.keywords.map((k) => k.toUpperCase()),
    })),
  )
  must(await db.from('weapon_profiles').upsert(profiles, { onConflict: 'weapon_id,name' }), 'weapon profiles')

  // Remove profiles a weapon no longer has.
  for (const w of byName.values()) {
    const keep = w.profiles.map((p) => p.name ?? w.name)
    must(
      await db
        .from('weapon_profiles')
        .delete()
        .eq('weapon_id', ids.get(w.name)!)
        .not('name', 'in', pgList(keep)),
      `weapon profiles for ${w.name}`,
    )
  }
  return ids
}

async function upsertStratagems(db: Client, detachmentId: number | null, list: z.infer<typeof stratagem>[]) {
  if (list.length === 0) return
  must(
    await db.from('stratagems').upsert(
      list.map((s) => ({
        detachment_id: detachmentId,
        name: s.name,
        cp_cost: s.cp,
        category: s.category,
        phase: s.phase,
        turn: s.turn ?? null,
        when: s.when ?? null,
        target: s.target ?? null,
        effect: s.effect,
        restrictions: s.restrictions ?? null,
      })),
      { onConflict: 'detachment_id,name' },
    ),
    'stratagems',
  )
}

async function importFaction(
  db: Client,
  f: z.infer<typeof faction>,
  maps: { abilities: Map<string, number>; keywords: Map<string, number>; weapons: Map<string, number> },
) {
  const { id: factionId } = must(
    await db
      .from('factions')
      .upsert({ slug: f.slug, name: f.name, army_rule: f.army_rule ?? null }, { onConflict: 'slug' })
      .select('id')
      .single(),
    `faction ${f.slug}`,
  )

  for (const d of f.detachments) {
    const { id: detachmentId } = must(
      await db
        .from('detachments')
        .upsert(
          { faction_id: factionId, name: d.name, rule: d.rule ?? null, description: d.description ?? null },
          { onConflict: 'faction_id,name' },
        )
        .select('id')
        .single(),
      `detachment ${d.name}`,
    )
    if (d.enhancements.length > 0)
      must(
        await db.from('enhancements').upsert(
          d.enhancements.map((e) => ({
            detachment_id: detachmentId,
            name: e.name,
            points: e.points,
            description: e.description ?? null,
            restriction: e.restriction ?? null,
          })),
          { onConflict: 'detachment_id,name' },
        ),
        `enhancements for ${d.name}`,
      )
    await upsertStratagems(db, detachmentId, d.stratagems)
  }

  const sheetIds = new Map<string, number>()
  if (f.datasheets.length > 0) {
    const data = must(
      await db
        .from('datasheets')
        .upsert(
          f.datasheets.map((d) => ({
            faction_id: factionId,
            slug: d.slug,
            name: d.name,
            role: d.role,
            composition: d.composition ?? null,
            wargear_options: d.wargear_options ?? null,
            base_size: d.base_size ?? null,
            lore: d.lore ?? null,
          })),
          { onConflict: 'faction_id,slug' },
        )
        .select('id, slug'),
      `datasheets for ${f.slug}`,
    )
    data.forEach((r) => sheetIds.set(r.slug, r.id))
  }

  for (const d of f.datasheets) {
    const id = sheetIds.get(d.slug)!

    // Model profiles: upsert, then drop ones no longer listed.
    must(
      await db.from('model_profiles').upsert(
        d.profiles.map((p, i) => ({
          datasheet_id: id,
          name: p.name,
          movement: p.movement,
          toughness: p.toughness,
          save: p.save,
          invuln_save: p.invuln ?? null,
          wounds: p.wounds,
          leadership: p.leadership,
          oc: p.oc,
          sort_order: i,
        })),
        { onConflict: 'datasheet_id,name' },
      ),
      `profiles for ${d.slug}`,
    )
    must(
      await db
        .from('model_profiles')
        .delete()
        .eq('datasheet_id', id)
        .not('name', 'in', pgList(d.profiles.map((p) => p.name))),
      `profiles for ${d.slug}`,
    )

    // Unit sizes are referenced by army lists, so a size in use can't be removed.
    must(
      await db.from('unit_sizes').upsert(
        d.sizes.map((s) => ({ datasheet_id: id, models: s.models, points: s.points })),
        { onConflict: 'datasheet_id,models' },
      ),
      `unit sizes for ${d.slug}`,
    )
    const stale = await db
      .from('unit_sizes')
      .delete()
      .eq('datasheet_id', id)
      .not('models', 'in', `(${d.sizes.map((s) => s.models).join(',')})`)
    if (stale.error)
      warnings.push(`${f.slug}/${d.slug}: kept a unit size that army lists still use (${stale.error.message})`)

    // Join tables have nothing pointing at them, so replace them wholesale.
    await replace(
      db,
      'datasheet_weapons',
      id,
      d.weapons.map((w) => ({ datasheet_id: id, weapon_id: maps.weapons.get(w.name)!, is_default: w.default })),
    )
    await replace(
      db,
      'datasheet_abilities',
      id,
      d.abilities.map((a) => ({
        datasheet_id: id,
        ability_id: maps.abilities.get(`${a.type}:${a.name}`)!,
        value: a.value ?? null,
      })),
    )
    const kws = new Set([...d.keywords, ...d.faction_keywords].map((k) => k.toUpperCase()))
    await replace(
      db,
      'datasheet_keywords',
      id,
      [...kws].map((k) => ({ datasheet_id: id, keyword_id: maps.keywords.get(k)! })),
    )
  }

  // Leader links last, once every datasheet in the faction has an id.
  for (const d of f.datasheets) {
    const leaderId = sheetIds.get(d.slug)!
    const rows = d.leads.flatMap((slug) => {
      const bodyguardId = sheetIds.get(slug)
      if (!bodyguardId) {
        warnings.push(`${f.slug}/${d.slug}: leads "${slug}", which isn't a datasheet in this faction`)
        return []
      }
      return [{ leader_id: leaderId, bodyguard_id: bodyguardId }]
    })
    must(await db.from('leader_attachments').delete().eq('leader_id', leaderId), `leaders for ${d.slug}`)
    if (rows.length) must(await db.from('leader_attachments').insert(rows), `leaders for ${d.slug}`)
  }

  return { factionId, datasheets: f.datasheets.length, detachments: f.detachments.length }
}

async function replace(
  db: Client,
  table: 'datasheet_weapons' | 'datasheet_abilities' | 'datasheet_keywords',
  datasheetId: number,
  rows: Record<string, unknown>[],
) {
  must(await db.from(table).delete().eq('datasheet_id', datasheetId), table)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (rows.length) must(await db.from(table).insert(rows as any), table)
}

// PostgREST `in` list with quoted values, e.g. ("Bolt rifle","Frag, krak").
function pgList(values: string[]) {
  return `(${values.map((v) => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')})`
}

// Sub-faction parents are linked after every faction in the run exists.
async function linkParents(db: Client, factions: z.infer<typeof faction>[]) {
  for (const f of factions) {
    if (!f.parent) continue
    const { data: parent, error } = await db.from('factions').select('id').eq('slug', f.parent).maybeSingle()
    if (error) throw new Error(`parent of ${f.slug}: ${error.message}`)
    if (!parent) {
      warnings.push(`${f.slug}: parent faction "${f.parent}" doesn't exist`)
      continue
    }
    must(await db.from('factions').update({ parent_id: parent.id }).eq('slug', f.slug), `parent of ${f.slug}`)
  }
}

export async function importData(db: Client, file: DataFile) {
  const [abilities, keywords, weapons] = await Promise.all([
    upsertAbilities(db, file),
    upsertKeywords(db, file),
    upsertWeapons(db, file),
  ])
  await upsertStratagems(db, null, file.core_stratagems)
  const results = []
  for (const f of file.factions) results.push({ slug: f.slug, ...(await importFaction(db, f, { abilities, keywords, weapons })) })
  await linkParents(db, file.factions)
  return results
}

// ─────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const paths = args.filter((a) => !a.startsWith('--'))
  if (paths.length === 0) {
    console.error('Usage: node scripts/import-data.ts [--dry-run] <file.json> [...]')
    process.exit(2)
  }

  // Validate everything before writing anything.
  const files: { path: string; data: DataFile }[] = []
  let invalid = false
  for (const path of paths) {
    let json: unknown
    try {
      json = JSON.parse(await readFile(path, 'utf8'))
    } catch (e) {
      console.error(`${path}: ${(e as Error).message}`)
      invalid = true
      continue
    }
    const parsed = dataFile.safeParse(json)
    if (!parsed.success) {
      invalid = true
      for (const issue of parsed.error.issues) console.error(`${path}: ${issue.path.join('.')}: ${issue.message}`)
      continue
    }
    files.push({ path, data: parsed.data })
  }
  if (invalid) process.exit(1)

  if (dryRun) {
    for (const { path, data } of files)
      console.log(
        `${path}: OK (${data.factions.length} factions, ${data.factions.reduce((n, f) => n + f.datasheets.length, 0)} datasheets)`,
      )
    return
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SECRET_KEY (the service role / secret key).')
    process.exit(2)
  }
  const db = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  for (const { path, data } of files) {
    const results = await importData(db, data)
    for (const r of results) console.log(`${path}: ${r.slug}: ${r.datasheets} datasheets, ${r.detachments} detachments`)
    if (data.core_stratagems.length) console.log(`${path}: ${data.core_stratagems.length} core stratagems`)
  }
  for (const w of warnings) console.warn(`warning: ${w}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  })
}
