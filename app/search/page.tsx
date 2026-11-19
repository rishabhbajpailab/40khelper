import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import SearchBox from './SearchBox'

export const metadata = { title: 'Search · 40k Helper' }

type Props = { searchParams: Promise<{ q?: string }> }

type LinkTarget = {
  name: string
  slug?: string
  faction_slug: string
  faction_name: string
  detachment_id?: number
}

const kindLabel: Record<string, string> = {
  datasheet: 'Datasheets',
  ability: 'Abilities',
  weapon: 'Weapons',
  stratagem: 'Stratagems',
}
const kindOrder = ['datasheet', 'ability', 'weapon', 'stratagem']

export default async function SearchPage({ searchParams }: Props) {
  const q = ((await searchParams).q ?? '').slice(0, 200)
  const supabase = await createClient()
  const { data: results, error } = q.trim()
    ? await supabase.rpc('search_rules', { q, max_results: 60 })
    : { data: [], error: null }

  const groups = kindOrder
    .map((kind) => ({ kind, items: (results ?? []).filter((r) => r.kind === kind) }))
    .filter((g) => g.items.length > 0)

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Search</h1>
      <form action="/search">
        <SearchBox initial={q} />
      </form>

      {error && <p className="text-sm text-red-600">Search failed: {error.message}</p>}
      {q.trim() && !error && groups.length === 0 && <p className="opacity-70">Nothing matches “{q}”.</p>}

      {groups.map((g) => (
        <section key={g.kind}>
          <h2 className="text-xs font-semibold uppercase tracking-wide opacity-60">{kindLabel[g.kind]}</h2>
          <ul className="mt-2 divide-y divide-gray-300 rounded-lg border border-gray-300 dark:divide-neutral-700 dark:border-neutral-700">
            {g.items.map((r) => {
              const links = (r.links as LinkTarget[] | null) ?? []
              const own = g.kind === 'datasheet' ? links[0] : undefined
              return (
                <li key={`${r.kind}:${r.id}`} className="px-4 py-3">
                  {own ? (
                    <Link href={`/factions/${own.faction_slug}/${own.slug}`} className="font-medium hover:underline">
                      {r.name}
                    </Link>
                  ) : (
                    <span className="font-medium">{r.name}</span>
                  )}
                  {r.detail && <p className="mt-0.5 text-sm opacity-75">{highlight(r.detail)}</p>}
                  {!own && links.length > 0 && (
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                      {links.map((l) => (
                        <Link
                          key={`${l.faction_slug}/${l.slug ?? l.detachment_id}`}
                          href={
                            l.detachment_id
                              ? `/stratagems?faction=${l.faction_slug}&detachment=${l.detachment_id}`
                              : `/factions/${l.faction_slug}/${l.slug}`
                          }
                          className="underline decoration-dotted underline-offset-2 opacity-80 hover:opacity-100"
                        >
                          {l.name}
                          <span className="opacity-60"> · {l.faction_name}</span>
                        </Link>
                      ))}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </main>
  )
}

// ts_headline marks matches with << >>; render them as <mark> without using HTML.
function highlight(text: string) {
  return text.split(/(<<.*?>>)/).map((part, i) =>
    part.startsWith('<<') && part.endsWith('>>') ? (
      <mark key={i} className="rounded bg-yellow-200 px-0.5 text-inherit dark:bg-yellow-700/60">
        {part.slice(2, -2)}
      </mark>
    ) : (
      part
    ),
  )
}
