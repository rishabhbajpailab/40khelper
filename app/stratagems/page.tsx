import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import AutoSubmitSelect from '@/app/components/AutoSubmitSelect'
import { categoryLabel, phaseLabel } from '@/utils/format'
import type { Database } from '@/types/database'

export const metadata = { title: 'Stratagems · 40k Helper' }

type Phase = Database['public']['Enums']['game_phase']
const phases: Phase[] = ['command', 'movement', 'shooting', 'charge', 'fight']
const turns = [
  { value: 'your', label: 'Your turn' },
  { value: 'opponent', label: "Opponent's turn" },
] as const

type Props = {
  searchParams: Promise<{ faction?: string; detachment?: string; phase?: string; turn?: string }>
}

export default async function StratagemsPage({ searchParams }: Props) {
  const sp = await searchParams
  const phase = phases.includes(sp.phase as Phase) ? (sp.phase as Phase) : undefined
  const turn = turns.find((t) => t.value === sp.turn)?.value
  const supabase = await createClient()

  const { data: factions } = await supabase
    .from('factions')
    .select('id, name, slug, detachments(id, name)')
    .order('name')
  const faction = factions?.find((f) => f.slug === sp.faction)
  const detachment = faction?.detachments.find((d) => String(d.id) === sp.detachment)

  // Core stratagems plus the chosen detachment's.
  let query = supabase
    .from('stratagems')
    .select('id, name, cp_cost, category, phase, turn, when, target, effect, restrictions, detachment_id')
    .order('phase')
    .order('cp_cost')
    .order('name')
  query = detachment
    ? query.or(`detachment_id.is.null,detachment_id.eq.${detachment.id}`)
    : query.is('detachment_id', null)
  // "Any phase" stratagems are usable in every phase.
  if (phase) query = query.in('phase', [phase, 'any'])
  const { data: stratagems, error } = await query

  // Turn is free text in the data; match on wording, keeping "either" in both.
  const shown = (stratagems ?? []).filter((s) => {
    if (!turn || !s.turn) return true
    const t = s.turn.toLowerCase()
    if (t.includes('either')) return true
    return turn === 'opponent' ? t.includes('opponent') : !t.includes('opponent')
  })
  const detachmentStrats = shown.filter((s) => s.detachment_id !== null)
  const coreStrats = shown.filter((s) => s.detachment_id === null)

  const href = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams()
    const merged = { faction: faction?.slug, detachment: detachment ? String(detachment.id) : undefined, phase, turn, ...patch }
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v)
    const s = params.toString()
    return s ? `/stratagems?${s}` : '/stratagems'
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Stratagems</h1>

      <form action="/stratagems" className="flex flex-wrap items-end gap-3">
        {phase && <input type="hidden" name="phase" value={phase} />}
        {turn && <input type="hidden" name="turn" value={turn} />}
        <label className="flex flex-col gap-1 text-sm">
          <span className="opacity-70">Faction</span>
          <AutoSubmitSelect name="faction" defaultValue={faction?.slug ?? ''} className={selectClass}>
            <option value="">Core only</option>
            {factions?.map((f) => (
              <option key={f.id} value={f.slug}>
                {f.name}
              </option>
            ))}
          </AutoSubmitSelect>
        </label>
        {faction && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="opacity-70">Detachment</span>
            <AutoSubmitSelect name="detachment" defaultValue={detachment?.id ?? ''} className={selectClass}>
              <option value="">Choose…</option>
              {faction.detachments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </AutoSubmitSelect>
          </label>
        )}
        <noscript>
          <button type="submit" className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-neutral-700">
            Show
          </button>
        </noscript>
      </form>

      <div className="flex flex-col gap-2">
        <Pills
          items={[{ value: undefined, label: 'All phases' }, ...phases.map((p) => ({ value: p, label: phaseLabel[p] }))]}
          current={phase}
          href={(v) => href({ phase: v })}
        />
        <Pills
          items={[{ value: undefined, label: 'Either turn' }, ...turns]}
          current={turn}
          href={(v) => href({ turn: v })}
        />
      </div>

      {error && <p className="text-sm text-red-600">Couldn&apos;t load stratagems: {error.message}</p>}

      {detachment && (
        <StratagemList title={`${detachment.name} stratagems`} items={detachmentStrats} />
      )}
      <StratagemList title="Core stratagems" items={coreStrats} />
    </main>
  )
}

const selectClass =
  'rounded-md border border-gray-300 bg-transparent px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900'

function Pills({
  items,
  current,
  href,
}: {
  items: readonly { value: string | undefined; label: string }[]
  current: string | undefined
  href: (v: string | undefined) => string
}) {
  return (
    <ul className="flex flex-wrap gap-2 text-sm">
      {items.map((i) => (
        <li key={i.label}>
          <Link
            href={href(i.value)}
            aria-current={i.value === current ? 'page' : undefined}
            className={`inline-block rounded-full border px-3 py-1 ${
              i.value === current
                ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                : 'border-gray-300 hover:border-gray-500 dark:border-neutral-700'
            }`}
          >
            {i.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

type Strat = {
  id: number
  name: string
  cp_cost: number
  category: string
  phase: string
  turn: string | null
  when: string | null
  target: string | null
  effect: string
  restrictions: string | null
}

function StratagemList({ title, items }: { title: string; items: Strat[] }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide opacity-60">
        {title} <span className="font-normal">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm opacity-70">None match.</p>
      ) : (
        <ul className="mt-2 grid gap-3 md:grid-cols-2">
          {items.map((s) => (
            <li key={s.id} id={`s${s.id}`} className="rounded-lg border border-gray-300 p-4 dark:border-neutral-700">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold">{s.name}</h3>
                <span className="shrink-0 rounded-md bg-neutral-900 px-2 py-0.5 text-sm font-bold text-white dark:bg-white dark:text-neutral-900">
                  {s.cp_cost} CP
                </span>
              </div>
              <p className="mt-0.5 text-xs uppercase tracking-wide opacity-60">
                {categoryLabel[s.category]} · {phaseLabel[s.phase]}
                {s.turn ? ` · ${s.turn}` : ''}
              </p>
              <dl className="mt-3 flex flex-col gap-1.5 text-sm">
                {s.when && <Row label="When">{s.when}</Row>}
                {s.target && <Row label="Target">{s.target}</Row>}
                <Row label="Effect">{s.effect}</Row>
                {s.restrictions && <Row label="Restrictions">{s.restrictions}</Row>}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="inline font-semibold">{label}: </dt>
      <dd className="inline whitespace-pre-line">{children}</dd>
    </div>
  )
}
