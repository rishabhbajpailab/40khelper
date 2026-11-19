import Link from 'next/link'

const features = [
  {
    title: 'Datasheets',
    body: 'Unit stats, weapon profiles, abilities and keywords, readable at the table.',
    href: '/factions',
  },
  {
    title: 'Search',
    body: 'Find any datasheet, weapon or ability by name or rules text.',
    href: '/search',
  },
  {
    title: 'Army builder',
    body: 'Pick a faction and detachment, add units, enhancements and Leaders, and track points.',
    href: '/lists',
  },
  {
    title: 'Stratagems',
    body: 'Core and detachment stratagems, filtered by the phase you are in.',
    href: '/stratagems',
  },
]

export default function Home() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-12 sm:px-6">
      <header>
        <h1 className="text-4xl font-bold tracking-tight">40k Helper</h1>
        <p className="mt-3 max-w-2xl text-lg opacity-70">
          Datasheets, army lists and game-day tools for Warhammer 40,000.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <Link
            key={f.title}
            href={f.href}
            className="rounded-lg border border-gray-300 p-5 transition hover:border-gray-500 dark:border-neutral-700 dark:hover:border-neutral-500"
          >
            <h2 className="text-xl font-semibold">{f.title}</h2>
            <p className="mt-2 text-sm opacity-70">{f.body}</p>
          </Link>
        ))}
      </section>

      <footer className="text-xs opacity-50">
        Unofficial fan project. Not affiliated with or endorsed by Games Workshop.
      </footer>
    </main>
  )
}
