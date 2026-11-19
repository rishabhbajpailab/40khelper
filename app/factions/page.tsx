import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'

export const metadata = { title: 'Factions · 40k Helper' }

export default async function FactionsPage() {
  const supabase = await createClient()
  const { data: factions, error } = await supabase
    .from('factions')
    .select('id, name, slug, parent_id, datasheets(count)')
    .order('name')

  // Show sub-factions under their parent.
  const top = factions?.filter((f) => f.parent_id === null) ?? []
  const children = (id: number) => factions?.filter((f) => f.parent_id === id) ?? []

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Factions</h1>
      {error && <p className="text-sm text-red-600">Couldn&apos;t load factions: {error.message}</p>}
      {factions?.length === 0 && (
        <p className="opacity-70">
          No factions yet. Load some data with <code>npm run data:import</code>.
        </p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {top.map((f) => (
          <li key={f.id} className="rounded-lg border border-gray-300 dark:border-neutral-700">
            <FactionLink faction={f} />
            {children(f.id).length > 0 && (
              <ul className="border-t border-gray-300 pl-4 dark:border-neutral-700">
                {children(f.id).map((c) => (
                  <li key={c.id}>
                    <FactionLink faction={c} small />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}

function FactionLink({
  faction,
  small,
}: {
  faction: { name: string; slug: string; datasheets: { count: number }[] }
  small?: boolean
}) {
  const count = faction.datasheets[0]?.count ?? 0
  return (
    <Link
      href={`/factions/${faction.slug}`}
      className={`flex items-baseline justify-between gap-3 hover:underline ${small ? 'px-3 py-2 text-sm' : 'p-4 font-semibold'}`}
    >
      <span>{faction.name}</span>
      <span className="text-xs font-normal opacity-60">{count} datasheets</span>
    </Link>
  )
}
