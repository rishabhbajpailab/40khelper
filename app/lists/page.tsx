import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { createList } from './actions'

export const metadata = { title: 'My lists · 40k Helper' }

// Row-level security means the list query only returns lists the signed-in user
// owns plus public ones; the owner filter narrows it to "mine".
export default async function ListsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error: actionError } = await searchParams
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims.sub ?? ''

  const [{ data: lists, error }, { data: totals }, { data: factions }] = await Promise.all([
    supabase
      .from('army_lists')
      .select('id, name, points_limit, is_public, factions(name), detachments(name)')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false }),
    supabase.from('army_list_totals').select('army_list_id, points_total'),
    supabase.from('factions').select('id, name').order('name'),
  ])

  const pointsById = new Map(totals?.map((t) => [t.army_list_id, t.points_total ?? 0]))

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">My army lists</h1>

      {(error || actionError) && (
        <p className="text-sm text-red-600">{error ? `Couldn't load lists: ${error.message}` : actionError}</p>
      )}

      {lists && lists.length > 0 && (
        <ul className="divide-y divide-gray-300 rounded-lg border border-gray-300 dark:divide-neutral-700 dark:border-neutral-700">
          {lists.map((l) => {
            const pts = pointsById.get(l.id) ?? 0
            return (
              <li key={l.id}>
                <Link
                  href={`/lists/${l.id}`}
                  className="flex items-center justify-between gap-3 p-4 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{l.name}</p>
                    <p className="text-sm opacity-70">
                      {l.factions?.name}
                      {l.detachments?.name ? ` · ${l.detachments.name}` : ''}
                      {l.is_public ? ' · shared' : ''}
                    </p>
                  </div>
                  <p className={`shrink-0 font-mono text-sm ${pts > l.points_limit ? 'text-red-600' : ''}`}>
                    {pts} / {l.points_limit} pts
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <section className="rounded-lg border border-gray-300 p-4 dark:border-neutral-700">
        <h2 className="font-semibold">New list</h2>
        {factions && factions.length > 0 ? (
          <form action={createList} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_8rem_auto] sm:items-end">
            <label className="flex flex-col gap-1 text-sm">
              <span className="opacity-70">Name</span>
              <input name="name" required maxLength={100} placeholder="Friday night 2k" className={field} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="opacity-70">Faction</span>
              <select name="faction_id" required className={field}>
                {factions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="opacity-70">Points</span>
              <select name="points_limit" defaultValue="2000" className={field}>
                <option value="500">500</option>
                <option value="1000">1000</option>
                <option value="1500">1500</option>
                <option value="2000">2000</option>
                <option value="3000">3000</option>
              </select>
            </label>
            <button
              type="submit"
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
            >
              Create
            </button>
          </form>
        ) : (
          <p className="mt-2 text-sm opacity-70">There are no factions to build with yet.</p>
        )}
      </section>
    </main>
  )
}

const field = 'rounded-md border border-gray-300 bg-transparent px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900'
