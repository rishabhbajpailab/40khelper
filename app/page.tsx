import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'

const features = [
  {
    title: 'Datasheets',
    body: 'Unit stats, weapon profiles, abilities and keywords, searchable at the table.',
  },
  {
    title: 'Army builder',
    body: 'Pick a faction and detachment, add units, enhancements and Leaders, and track points.',
  },
  {
    title: 'Rules reference',
    body: 'Detachment rules and stratagems, filtered by the phase you are in.',
  },
  {
    title: 'Game tracker',
    body: 'Command points, victory points, turn and phase.',
  },
]

export default async function Home() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const email = data?.claims.email as string | undefined

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-12 px-6 py-16">
      <nav className="flex items-center justify-end gap-4 text-sm">
        {email ? (
          <>
            <Link href="/lists" className="hover:underline">
              My lists
            </Link>
            <span className="opacity-60">{email}</span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="hover:underline">
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="hover:underline">
            Sign in
          </Link>
        )}
      </nav>

      <header>
        <h1 className="text-4xl font-bold tracking-tight">40k Helper</h1>
        <p className="mt-3 max-w-2xl text-lg opacity-70">
          Datasheets, army lists and game-day tools for Warhammer 40,000.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-lg border border-gray-300 p-5 dark:border-neutral-700"
          >
            <h2 className="text-xl font-semibold">{f.title}</h2>
            <p className="mt-2 text-sm opacity-70">{f.body}</p>
            <p className="mt-4 text-xs uppercase tracking-wide opacity-50">Coming soon</p>
          </div>
        ))}
      </section>

      <footer className="text-xs opacity-50">
        Unofficial fan project. Not affiliated with or endorsed by Games Workshop.
      </footer>
    </main>
  )
}
