import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'

// Row-level security means this query only returns lists the signed-in user owns
// (plus public ones), with no owner filter needed in the app.
export default async function ListsPage() {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims.sub

  const [{ data: lists, error }, { data: totals }] = await Promise.all([
    supabase
      .from('army_lists')
      .select('id, name, points_limit, is_public, owner_id, factions(name), detachments(name)')
      .order('updated_at', { ascending: false }),
    supabase.from('army_list_totals').select('army_list_id, points_total'),
  ])

  const pointsById = new Map(totals?.map((t) => [t.army_list_id, t.points_total ?? 0]))
  const mine = lists?.filter((l) => l.owner_id === userId) ?? []

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My army lists</h1>
        <Link href="/" className="text-sm opacity-70 hover:opacity-100">
          Home
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">Couldn&apos;t load lists: {error.message}</p>}

      {mine.length === 0 ? (
        <p className="opacity-70">No lists yet. The army builder is next on the roadmap.</p>
      ) : (
        <ul className="divide-y divide-gray-300 rounded-lg border border-gray-300 dark:divide-neutral-700 dark:border-neutral-700">
          {mine.map((l) => (
            <li key={l.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold">{l.name}</p>
                <p className="text-sm opacity-70">
                  {l.factions?.name}
                  {l.detachments?.name ? ` · ${l.detachments.name}` : ''}
                  {l.is_public ? ' · public' : ''}
                </p>
              </div>
              <p className="font-mono text-sm">
                {pointsById.get(l.id) ?? 0} / {l.points_limit} pts
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
