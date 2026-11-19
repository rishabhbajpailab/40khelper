import Link from 'next/link'
import type { LoadedArmyList } from '@/utils/army/load'
import { orderedUnits } from '@/utils/army/text'

// Read-only list of units, Leaders nested under the unit they lead.
export default function ArmyView({ army }: { army: LoadedArmyList }) {
  const units = orderedUnits(army.units)
  if (units.length === 0) return <p className="opacity-70">No units yet.</p>

  return (
    <ul className="divide-y divide-gray-300 rounded-lg border border-gray-300 dark:divide-neutral-700 dark:border-neutral-700">
      {units.map((u) => (
        <li key={u.id} className={`flex items-baseline justify-between gap-3 px-4 py-3 ${u.attachedToId ? 'pl-10' : ''}`}>
          <div>
            {u.attachedToId && <span className="mr-1 opacity-50">↳</span>}
            <Link href={`/factions/${u.sheet.faction.slug}/${u.sheet.slug}`} className="font-medium hover:underline">
              {u.datasheet.name}
            </Link>
            {u.size && u.size.models > 1 && <span className="ml-1 text-sm opacity-60">× {u.size.models}</span>}
            {u.enhancement && <p className="text-sm opacity-75">Enhancement: {u.enhancement.name}</p>}
            {u.row.wargear_notes && <p className="text-sm opacity-75">{u.row.wargear_notes}</p>}
          </div>
          <span className="shrink-0 font-mono text-sm">{u.points + (u.enhancement?.points ?? 0)} pts</span>
        </li>
      ))}
    </ul>
  )
}
