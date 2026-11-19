import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { loadArmyList, type LoadedArmyList, type LoadedUnit } from '@/utils/army/load'
import { listToText, orderedUnits } from '@/utils/army/text'
import { datasheetLimit } from '@/utils/army/validate'
import { pointsRange, roleLabel, roleOrder } from '@/utils/format'
import AutoSubmitSelect from '@/app/components/AutoSubmitSelect'
import CopyButton from '@/app/components/CopyButton'
import ArmySummary from '../ArmySummary'
import { addUnit, deleteList, duplicateUnit, removeUnit, setPublic, updateList, updateUnit } from '../actions'

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  if (!isUuid(id)) return { title: '40k Helper' }
  const supabase = await createClient()
  const { data } = await supabase.from('army_lists').select('name').eq('id', id).maybeSingle()
  return { title: data ? `${data.name} · 40k Helper` : '40k Helper' }
}

export default async function ListEditorPage({ params, searchParams }: Props) {
  const [{ id }, { error }] = await Promise.all([params, searchParams])
  if (!isUuid(id)) notFound()
  const supabase = await createClient()
  const [{ data: claims }, army] = await Promise.all([supabase.auth.getClaims(), loadArmyList(supabase, id)])
  if (!army) notFound()
  // Someone else's public list: show the read-only view.
  if (army.list.owner_id !== claims?.claims.sub) redirect(`/l/${id}`)

  const h = await headers()
  const host = h.get('host') ?? '40k.glizzy.dev'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https')
  const shareUrl = `${proto}://${host}/l/${id}`

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
      <p className="text-sm opacity-60">
        <Link href="/lists" className="hover:underline">
          My lists
        </Link>
      </p>

      {error && <p className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">{error}</p>}

      <ArmySummary army={army}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <CopyButton text={listToText(army)} label="Copy as text" className={linkButton} />
          <form action={setPublic} className="flex items-center gap-2">
            <input type="hidden" name="list_id" value={id} />
            <input type="hidden" name="is_public" value={army.list.is_public ? 'false' : 'true'} />
            <button type="submit" className={linkButton}>
              {army.list.is_public ? 'Make private' : 'Share a public link'}
            </button>
          </form>
          {army.list.is_public && (
            <span className="flex items-center gap-2">
              <Link href={`/l/${id}`} className="font-mono text-xs opacity-70 hover:underline">
                /l/{id.slice(0, 8)}…
              </Link>
              <CopyButton text={shareUrl} label="Copy link" className={linkButton} />
            </span>
          )}
        </div>
      </ArmySummary>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide opacity-60">Units ({army.units.length})</h2>
          {army.units.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm opacity-70 dark:border-neutral-700">
              Add units from the list {army.available.length ? 'beside this one' : 'once this faction has datasheets'}.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {orderedUnits(army.units).map((u) => (
                // React resets a form after its action runs, back to the
                // defaultValues it mounted with. Keying on the saved values
                // remounts the form so its defaults match the database.
                <UnitRow
                  key={`${u.id}:${u.row.unit_size_id}:${u.row.enhancement_id}:${u.row.attached_to_id}`}
                  army={army}
                  unit={u}
                />
              ))}
            </ul>
          )}
        </section>

        <aside className="flex flex-col gap-8">
          <Settings army={army} />
          <Picker army={army} />
        </aside>
      </div>

      <form action={deleteList} className="border-t border-gray-300 pt-6 dark:border-neutral-800">
        <input type="hidden" name="list_id" value={id} />
        <button type="submit" className="text-sm text-red-600 hover:underline">
          Delete this list
        </button>
      </form>
    </main>
  )
}

const linkButton = 'underline-offset-2 hover:underline'
const field =
  'w-full rounded-md border border-gray-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900'

function UnitRow({ army, unit }: { army: LoadedArmyList; unit: LoadedUnit }) {
  const listId = army.list.id
  const isCharacter = unit.datasheet.role === 'character'
  const takenEnh = new Set(army.units.filter((u) => u.id !== unit.id && u.enhancement).map((u) => u.enhancement!.id))
  const led = new Set(army.units.filter((u) => u.attachedToId && u.id !== unit.id).map((u) => u.attachedToId))
  // Units this Leader could join: allowed datasheet, not itself a Leader attached elsewhere.
  const targets = army.units.filter(
    (t) => t.id !== unit.id && !t.attachedToId && unit.datasheet.leads.includes(t.datasheet.id),
  )
  const hasLeaders = army.units.some((l) => l.attachedToId === unit.id)

  return (
    <li
      className={`rounded-lg border border-gray-300 p-3 dark:border-neutral-700 ${unit.attachedToId ? 'ml-6 border-dashed' : ''}`}
    >
      <form action={updateUnit} className="flex flex-col gap-2">
        <input type="hidden" name="list_id" value={listId} />
        <input type="hidden" name="unit_id" value={unit.id} />
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            {unit.attachedToId && <span className="mr-1 opacity-50">↳</span>}
            <Link
              href={`/factions/${unit.sheet.faction.slug}/${unit.sheet.slug}`}
              className="font-medium hover:underline"
              target="_blank"
            >
              {unit.datasheet.name}
            </Link>
            {unit.datasheet.role !== 'other' && (
              <span className="ml-2 text-xs uppercase tracking-wide opacity-50">{roleLabel[unit.datasheet.role]}</span>
            )}
          </div>
          <span className="shrink-0 font-mono text-sm">{unit.points + (unit.enhancement?.points ?? 0)} pts</span>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <label className="flex flex-col gap-0.5 text-xs">
            <span className="opacity-60">Size</span>
            <AutoSubmitSelect name="unit_size_id" defaultValue={unit.row.unit_size_id} className={field}>
              {unit.sheet.unit_sizes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.models} model{s.models === 1 ? '' : 's'} · {s.points} pts
                </option>
              ))}
            </AutoSubmitSelect>
          </label>

          {(isCharacter || unit.enhancement) && (
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="opacity-60">Enhancement</span>
              <AutoSubmitSelect name="enhancement_id" defaultValue={unit.enhancement?.id ?? ''} className={field}>
                <option value="">None</option>
                {unit.enhancement && !army.enhancements.some((e) => e.id === unit.enhancement!.id) && (
                  <option value={unit.enhancement.id}>{unit.enhancement.name} (other detachment)</option>
                )}
                {army.enhancements.map((e) => (
                  <option key={e.id} value={e.id} disabled={takenEnh.has(e.id)}>
                    {e.name} · {e.points} pts{takenEnh.has(e.id) ? ' (taken)' : ''}
                    {e.restriction ? ` · ${e.restriction}` : ''}
                  </option>
                ))}
              </AutoSubmitSelect>
            </label>
          )}
          {!(isCharacter || unit.enhancement) && <input type="hidden" name="enhancement_id" value="" />}

          {unit.datasheet.leads.length > 0 && !hasLeaders ? (
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="opacity-60">Leading</span>
              <AutoSubmitSelect name="attached_to_id" defaultValue={unit.attachedToId ?? ''} className={field}>
                <option value="">Not attached</option>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.datasheet.name}
                    {led.has(t.id) ? ' (has a Leader)' : ''}
                  </option>
                ))}
              </AutoSubmitSelect>
            </label>
          ) : (
            <input type="hidden" name="attached_to_id" value={unit.attachedToId ?? ''} />
          )}
        </div>

        <div className="flex gap-4 text-xs">
          <noscript>
            <button type="submit" className={linkButton}>
              Save
            </button>
          </noscript>
          <button formAction={duplicateUnit} className={`${linkButton} opacity-70`}>
            Duplicate
          </button>
          <button formAction={removeUnit} className={`${linkButton} text-red-600`}>
            Remove
          </button>
        </div>
      </form>
    </li>
  )
}

function Settings({ army }: { army: LoadedArmyList }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-60">List settings</h2>
      <form
        key={`${army.list.name}:${army.list.detachment_id}:${army.list.points_limit}:${army.list.notes}`}
        action={updateList}
        className="flex flex-col gap-2 text-sm"
      >
        <input type="hidden" name="list_id" value={army.list.id} />
        <label className="flex flex-col gap-0.5">
          <span className="text-xs opacity-60">Name</span>
          <input name="name" defaultValue={army.list.name} required maxLength={100} className={field} />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-xs opacity-60">Detachment</span>
          <select name="detachment_id" defaultValue={army.list.detachment_id ?? ''} className={field}>
            <option value="">Choose…</option>
            {army.detachments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-xs opacity-60">Points limit</span>
          <input
            name="points_limit"
            type="number"
            min={1}
            max={10000}
            defaultValue={army.list.points_limit}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-xs opacity-60">Notes</span>
          <textarea name="notes" defaultValue={army.list.notes ?? ''} rows={3} maxLength={5000} className={field} />
        </label>
        <button
          type="submit"
          className="self-start rounded-md bg-neutral-900 px-3 py-1.5 font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          Save settings
        </button>
      </form>
    </section>
  )
}

function Picker({ army }: { army: LoadedArmyList }) {
  const counts = new Map<number, number>()
  army.units.forEach((u) => counts.set(u.datasheet.id, (counts.get(u.datasheet.id) ?? 0) + 1))
  const groups = roleOrder
    .map((role) => ({ role, sheets: army.available.filter((s) => s.role === role) }))
    .filter((g) => g.sheets.length > 0)

  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-60">Add units</h2>
      {groups.length === 0 && <p className="text-sm opacity-70">This faction has no datasheets yet.</p>}
      <div className="flex flex-col gap-4">
        {groups.map((g) => (
          <div key={g.role}>
            <h3 className="mb-1 text-xs opacity-60">{roleLabel[g.role]}</h3>
            <ul className="divide-y divide-gray-200 rounded-lg border border-gray-300 dark:divide-neutral-800 dark:border-neutral-700">
              {g.sheets.map((s) => {
                const n = counts.get(s.id) ?? 0
                const max = datasheetLimit(s.role)
                const full = n >= max
                const noPoints = s.unit_sizes.length === 0
                return (
                  <li key={s.id}>
                    <form action={addUnit} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <input type="hidden" name="list_id" value={army.list.id} />
                      <input type="hidden" name="datasheet_id" value={s.id} />
                      <span className="min-w-0">
                        <span className="block truncate">{s.name}</span>
                        <span className="font-mono text-xs opacity-60">
                          {pointsRange(s.unit_sizes) ?? 'no points'}
                          {n > 0 && ` · ${n}/${max}`}
                        </span>
                      </span>
                      <button
                        type="submit"
                        disabled={full || noPoints}
                        title={full ? `Limit of ${max} reached` : undefined}
                        className="shrink-0 rounded-md border border-gray-300 px-2 py-0.5 hover:border-gray-500 disabled:opacity-30 dark:border-neutral-700"
                      >
                        Add
                      </button>
                    </form>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
