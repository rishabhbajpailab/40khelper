import { pointsTotal } from './validate'
import type { LoadedArmyList } from './load'

// Plain-text export, for pasting into a chat or a tournament submission.
export function listToText(a: LoadedArmyList) {
  const lines = [
    `${a.list.name} (${pointsTotal(a.units)} / ${a.list.points_limit} pts)`,
    `${a.list.faction.name}${a.list.detachment ? ` – ${a.list.detachment.name}` : ''}`,
    '',
  ]
  for (const u of orderedUnits(a.units)) {
    const pts = u.points + (u.enhancement?.points ?? 0)
    const models = u.size ? ` x${u.size.models}` : ''
    lines.push(`${u.attachedToId ? '  ↳ ' : ''}${u.datasheet.name}${models} (${pts} pts)`)
    const indent = u.attachedToId ? '      ' : '  • '
    if (u.enhancement) lines.push(`${indent}Enhancement: ${u.enhancement.name} (+${u.enhancement.points} pts)`)
    if (u.row.wargear_notes) lines.push(`${indent}${u.row.wargear_notes}`)
  }
  return lines.join('\n')
}

// Units in list order, each followed by the Leaders attached to it.
export function orderedUnits<T extends { id: string; attachedToId: string | null }>(units: T[]) {
  const ids = new Set(units.map((u) => u.id))
  const out: T[] = []
  for (const u of units) {
    if (u.attachedToId && ids.has(u.attachedToId)) continue
    out.push(u, ...units.filter((l) => l.attachedToId === u.id))
  }
  return out
}
