import Link from 'next/link'
import type { LoadedArmyList } from '@/utils/army/load'
import { pointsTotal, validateList } from '@/utils/army/validate'

// Header shared by the editor and the read-only view: name, faction,
// detachment, a points bar and any validation issues.
export default function ArmySummary({ army, children }: { army: LoadedArmyList; children?: React.ReactNode }) {
  const total = pointsTotal(army.units)
  const limit = army.list.points_limit
  const issues = validateList(army.builder)
  const pct = Math.min(100, Math.round((total / limit) * 100))
  const over = total > limit

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">{army.list.name}</h1>
          <p className="text-sm opacity-70">
            <Link href={`/factions/${army.list.faction.slug}`} className="hover:underline">
              {army.list.faction.name}
            </Link>
            {army.list.detachment && (
              <>
                {' · '}
                <Link
                  href={`/stratagems?faction=${army.list.faction.slug}&detachment=${army.list.detachment.id}`}
                  className="hover:underline"
                  title="Stratagems for this detachment"
                >
                  {army.list.detachment.name}
                </Link>
              </>
            )}
          </p>
        </div>
        <p className={`font-mono text-lg font-semibold ${over ? 'text-red-600' : ''}`}>
          {total} / {limit} pts
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10" aria-hidden>
        <div className={`h-full ${over ? 'bg-red-600' : 'bg-neutral-900 dark:bg-white'}`} style={{ width: `${pct}%` }} />
      </div>
      {children}
      {issues.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
          {issues.map((i, n) => (
            <li key={n} className={i.level === 'error' ? 'text-red-700 dark:text-red-400' : ''}>
              {i.level === 'error' ? '✕ ' : '! '}
              {i.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
