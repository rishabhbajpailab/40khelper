import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { pointsRange, roleLabel, roleOrder } from '@/utils/format'

type Props = { params: Promise<{ faction: string }> }

export async function generateMetadata({ params }: Props) {
  const { faction } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('factions').select('name').eq('slug', faction).maybeSingle()
  return { title: data ? `${data.name} · 40k Helper` : '40k Helper' }
}

export default async function FactionPage({ params }: Props) {
  const { faction: slug } = await params
  const supabase = await createClient()
  const { data: faction } = await supabase
    .from('factions')
    .select(
      'id, name, slug, army_rule, parent:parent_id(name, slug), datasheets(name, slug, role, unit_sizes(points)), detachments(id, name)',
    )
    .eq('slug', slug)
    .maybeSingle()
  if (!faction) notFound()

  const byRole = roleOrder
    .map((role) => ({
      role,
      sheets: faction.datasheets.filter((d) => d.role === role).sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((g) => g.sheets.length > 0)

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
      <div>
        <p className="text-sm opacity-60">
          <Link href="/factions" className="hover:underline">
            Factions
          </Link>
          {faction.parent && (
            <>
              {' / '}
              <Link href={`/factions/${faction.parent.slug}`} className="hover:underline">
                {faction.parent.name}
              </Link>
            </>
          )}
        </p>
        <h1 className="mt-1 text-3xl font-bold">{faction.name}</h1>
      </div>

      {faction.army_rule && (
        <section className="rounded-lg border border-gray-300 p-4 dark:border-neutral-700">
          <h2 className="text-xs font-semibold uppercase tracking-wide opacity-60">Army rule</h2>
          <p className="mt-2 whitespace-pre-line text-sm">{faction.army_rule}</p>
        </section>
      )}

      {faction.detachments.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide opacity-60">Detachments</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {faction.detachments.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/stratagems?faction=${faction.slug}&detachment=${d.id}`}
                  className="inline-block rounded-full border border-gray-300 px-3 py-1 text-sm hover:border-gray-500 dark:border-neutral-700"
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {byRole.length === 0 && <p className="opacity-70">No datasheets for this faction yet.</p>}
      {byRole.map((g) => (
        <section key={g.role}>
          <h2 className="text-xs font-semibold uppercase tracking-wide opacity-60">{roleLabel[g.role]}</h2>
          <ul className="mt-2 divide-y divide-gray-300 rounded-lg border border-gray-300 dark:divide-neutral-700 dark:border-neutral-700">
            {g.sheets.map((d) => (
              <li key={d.slug}>
                <Link
                  href={`/factions/${faction.slug}/${d.slug}`}
                  className="flex items-baseline justify-between gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <span className="font-medium">{d.name}</span>
                  <span className="font-mono text-xs opacity-60">{pointsRange(d.unit_sizes)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  )
}
