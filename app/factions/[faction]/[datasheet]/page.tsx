import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { ap, inches, keywordCase, plus, range, roleLabel, skill } from '@/utils/format'

type Props = { params: Promise<{ faction: string; datasheet: string }> }

async function load(factionSlug: string, slug: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('datasheets')
    .select(
      `id, name, slug, role, composition, wargear_options, base_size, lore,
       faction:factions!inner(name, slug),
       model_profiles(name, movement, toughness, save, invuln_save, wounds, leadership, oc, sort_order),
       unit_sizes(models, points),
       datasheet_weapons(is_default, weapon:weapons(name, weapon_profiles(name, type, range, attacks, skill, strength, ap, damage, keywords))),
       datasheet_abilities(value, ability:abilities(name, type, description, is_aura)),
       datasheet_keywords(keyword:keywords(name, is_faction)),
       leads:leader_attachments!leader_id(unit:bodyguard_id(name, slug)),
       led_by:leader_attachments!bodyguard_id(unit:leader_id(name, slug))`,
    )
    .eq('faction.slug', factionSlug)
    .eq('slug', slug)
    .maybeSingle()
  return data
}

export async function generateMetadata({ params }: Props) {
  const { faction, datasheet } = await params
  const d = await load(faction, datasheet)
  return { title: d ? `${d.name} · ${d.faction.name} · 40k Helper` : '40k Helper' }
}

export default async function DatasheetPage({ params }: Props) {
  const { faction, datasheet } = await params
  const d = await load(faction, datasheet)
  if (!d) notFound()

  const profiles = [...d.model_profiles].sort((a, b) => a.sort_order - b.sort_order)
  const sizes = [...d.unit_sizes].sort((a, b) => a.models - b.models)

  // Flatten weapons into profile rows, split by type.
  const rows = d.datasheet_weapons
    .flatMap((dw) =>
      (dw.weapon?.weapon_profiles ?? []).map((p) => ({ ...p, weapon: dw.weapon!.name, isDefault: dw.is_default })),
    )
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name))
  const ranged = rows.filter((r) => r.type === 'ranged')
  const melee = rows.filter((r) => r.type === 'melee')

  const abilities = d.datasheet_abilities.filter((a) => a.ability)
  const core = abilities.filter((a) => a.ability!.type === 'core')
  const factionAbilities = abilities.filter((a) => a.ability!.type === 'faction')
  const other = abilities.filter((a) => a.ability!.type === 'datasheet' || a.ability!.type === 'wargear')

  const keywords = d.datasheet_keywords.map((k) => k.keyword).filter((k) => k !== null)
  const unitKeywords = keywords.filter((k) => !k.is_faction).map((k) => k.name).sort()
  const factionKeywords = keywords.filter((k) => k.is_faction).map((k) => k.name).sort()

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <p className="text-sm opacity-60">
          <Link href="/factions" className="hover:underline">
            Factions
          </Link>
          {' / '}
          <Link href={`/factions/${d.faction.slug}`} className="hover:underline">
            {d.faction.name}
          </Link>
        </p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-3xl font-bold">{d.name}</h1>
          {d.role !== 'other' && (
            <span className="rounded-full border border-gray-300 px-2 py-0.5 text-xs uppercase tracking-wide opacity-70 dark:border-neutral-700">
              {roleLabel[d.role]}
            </span>
          )}
        </div>
      </div>

      {/* Stat lines */}
      <div className="overflow-x-auto">
        <table className="w-full text-center">
          <thead>
            <tr className="text-xs uppercase tracking-wide opacity-60">
              {profiles.length > 1 && <th className="py-1 text-left font-medium">Model</th>}
              {['M', 'T', 'Sv', 'W', 'Ld', 'OC'].map((h) => (
                <th key={h} className="py-1 font-medium">
                  {h}
                </th>
              ))}
              <th className="py-1 font-medium">Inv</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.name} className="text-xl font-bold">
                {profiles.length > 1 && <td className="py-1 text-left text-sm font-medium">{p.name}</td>}
                <Stat>{inches(p.movement)}</Stat>
                <Stat>{p.toughness}</Stat>
                <Stat>{plus(p.save)}</Stat>
                <Stat>{p.wounds}</Stat>
                <Stat>{plus(p.leadership)}</Stat>
                <Stat>{p.oc}</Stat>
                <Stat>{p.invuln_save ? `${p.invuln_save}++` : '-'}</Stat>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {ranged.length > 0 && <WeaponTable title="Ranged weapons" skillLabel="BS" rows={ranged} />}
          {melee.length > 0 && <WeaponTable title="Melee weapons" skillLabel="WS" rows={melee} />}
          {d.wargear_options && (
            <Section title="Wargear options">
              <p className="whitespace-pre-line text-sm">{d.wargear_options}</p>
            </Section>
          )}
          {d.composition && (
            <Section title="Unit composition">
              <p className="whitespace-pre-line text-sm">{d.composition}</p>
              {d.base_size && <p className="mt-1 text-xs opacity-60">Base: {d.base_size}</p>}
            </Section>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          <Section title="Points">
            <ul className="text-sm">
              {sizes.map((s) => (
                <li key={s.models} className="flex justify-between font-mono">
                  <span>
                    {s.models} model{s.models === 1 ? '' : 's'}
                  </span>
                  <span>{s.points}</span>
                </li>
              ))}
            </ul>
          </Section>

          {(core.length > 0 || factionAbilities.length > 0 || other.length > 0) && (
            <Section title="Abilities">
              {core.length > 0 && (
                <p className="text-sm">
                  <span className="font-semibold">Core: </span>
                  {core.map((a) => `${a.ability!.name}${a.value ? ` ${a.value}` : ''}`).join(', ')}
                </p>
              )}
              {factionAbilities.length > 0 && (
                <p className="mt-1 text-sm">
                  <span className="font-semibold">Faction: </span>
                  {factionAbilities.map((a) => a.ability!.name).join(', ')}
                </p>
              )}
              <dl className="mt-2 flex flex-col gap-2 text-sm">
                {other.map((a) => (
                  <div key={a.ability!.name}>
                    <dt className="font-semibold">
                      {a.ability!.name}
                      {a.value ? ` ${a.value}` : ''}
                      {a.ability!.is_aura && <span className="ml-1 text-xs font-normal opacity-60">(Aura)</span>}
                    </dt>
                    {a.ability!.description && (
                      <dd className="whitespace-pre-line opacity-80">{a.ability!.description}</dd>
                    )}
                  </div>
                ))}
              </dl>
            </Section>
          )}

          {d.leads.length > 0 && (
            <Section title="Leader">
              <p className="text-sm">This model can be attached to:</p>
              <UnitLinks faction={d.faction.slug} units={d.leads.map((l) => l.unit)} />
            </Section>
          )}
          {d.led_by.length > 0 && (
            <Section title="Can be led by">
              <UnitLinks faction={d.faction.slug} units={d.led_by.map((l) => l.unit)} />
            </Section>
          )}
        </aside>
      </div>

      {d.lore && <p className="whitespace-pre-line text-sm italic opacity-70">{d.lore}</p>}

      {(unitKeywords.length > 0 || factionKeywords.length > 0) && (
        <footer className="flex flex-col gap-1 border-t border-gray-300 pt-4 text-xs dark:border-neutral-700">
          {unitKeywords.length > 0 && (
            <p>
              <span className="font-semibold uppercase tracking-wide opacity-60">Keywords: </span>
              {unitKeywords.map(keywordCase).join(', ')}
            </p>
          )}
          {factionKeywords.length > 0 && (
            <p>
              <span className="font-semibold uppercase tracking-wide opacity-60">Faction keywords: </span>
              {factionKeywords.map(keywordCase).join(', ')}
            </p>
          )}
        </footer>
      )}
    </main>
  )
}

function Stat({ children }: { children: React.ReactNode }) {
  return <td className="py-1 font-mono">{children}</td>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-60">{title}</h2>
      {children}
    </section>
  )
}

type WeaponRow = {
  name: string
  weapon: string
  isDefault: boolean
  range: number | null
  attacks: string
  skill: number | null
  strength: number
  ap: number
  damage: string
  keywords: string[]
}

// Each weapon takes two rows (name + keywords, then the stats) so the table
// fits a phone without scrolling sideways.
function WeaponTable({ title, skillLabel, rows }: { title: string; skillLabel: string; rows: WeaponRow[] }) {
  const isMelee = skillLabel === 'WS'
  const cols = isMelee ? 5 : 6
  return (
    <Section title={title}>
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b border-gray-300 text-xs uppercase tracking-wide opacity-60 dark:border-neutral-700">
            {!isMelee && <th className="py-1 font-medium">Range</th>}
            <th className="py-1 font-medium">A</th>
            <th className="py-1 font-medium">{skillLabel}</th>
            <th className="py-1 font-medium">S</th>
            <th className="py-1 font-medium">AP</th>
            <th className="py-1 font-medium">D</th>
          </tr>
        </thead>
        {rows.map((r) => (
          <tbody key={`${r.weapon}:${r.name}`} className="border-b border-gray-200 dark:border-neutral-800">
            <tr>
              <td colSpan={cols} className="pt-2">
                <span className="font-medium">{r.name}</span>
                {!r.isDefault && <span className="ml-1 text-xs opacity-60">(option)</span>}
                {r.keywords.map((k) => (
                  <span
                    key={k}
                    className="ml-1 inline-block rounded bg-black/5 px-1 align-middle text-[0.65rem] uppercase tracking-wide dark:bg-white/10"
                  >
                    {k}
                  </span>
                ))}
              </td>
            </tr>
            <tr className="text-center font-mono">
              {!isMelee && <td className="pb-2">{range(r.range)}</td>}
              <td className="pb-2">{r.attacks}</td>
              <td className="pb-2">{skill(r.skill)}</td>
              <td className="pb-2">{r.strength}</td>
              <td className="pb-2">{ap(r.ap)}</td>
              <td className="pb-2">{r.damage}</td>
            </tr>
          </tbody>
        ))}
      </table>
    </Section>
  )
}

function UnitLinks({ faction, units }: { faction: string; units: ({ name: string; slug: string } | null)[] }) {
  return (
    <ul className="mt-1 flex flex-col text-sm">
      {units
        .filter((u) => u !== null)
        .map((u) => (
          <li key={u.slug}>
            <Link href={`/factions/${faction}/${u.slug}`} className="underline-offset-2 hover:underline">
              {u.name}
            </Link>
          </li>
        ))}
    </ul>
  )
}
