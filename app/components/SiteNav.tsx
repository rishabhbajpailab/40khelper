import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'

const links = [
  { href: '/factions', label: 'Datasheets' },
  { href: '/stratagems', label: 'Stratagems' },
  { href: '/search', label: 'Search' },
]

export default async function SiteNav() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const email = data?.claims.email as string | undefined

  return (
    <header className="border-b border-gray-300 dark:border-neutral-800">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-sm sm:px-6">
        <Link href="/" className="font-bold tracking-tight">
          40k Helper
        </Link>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="opacity-80 hover:opacity-100 hover:underline">
            {l.label}
          </Link>
        ))}
        <span className="flex-1" />
        {email ? (
          <>
            <Link href="/lists" className="opacity-80 hover:opacity-100 hover:underline">
              My lists
            </Link>
            <form action="/auth/signout" method="post">
              <button type="submit" className="opacity-80 hover:opacity-100 hover:underline" title={email}>
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="opacity-80 hover:opacity-100 hover:underline">
            Sign in
          </Link>
        )}
      </nav>
    </header>
  )
}
