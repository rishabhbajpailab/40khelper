// Army list validation. Pure functions, no I/O, so they run on the server, in
// the browser and under `node --test` alike.
//
// The limits below follow the current core rules for Muster Your Army. If a
// rules update changes them, this is the one place to edit.

export type Role = 'epic_hero' | 'character' | 'battleline' | 'dedicated_transport' | 'fortification' | 'other'

export const ENHANCEMENT_LIMIT = 3

// How many times a datasheet may appear in one army.
export function datasheetLimit(role: Role) {
  if (role === 'epic_hero') return 1
  if (role === 'battleline' || role === 'dedicated_transport') return 6
  return 3
}

export type BuilderUnit = {
  id: string
  datasheet: {
    id: number
    name: string
    role: Role
    factionId: number
    // Datasheet ids this unit can lead, if it's a Leader.
    leads: number[]
  }
  points: number
  enhancement: { id: number; name: string; points: number; detachmentId: number } | null
  attachedToId: string | null
}

export type BuilderList = {
  pointsLimit: number
  // The list's faction plus its parent, whose datasheets it may also use.
  allowedFactionIds: number[]
  detachmentId: number | null
  units: BuilderUnit[]
}

export type Issue = { level: 'error' | 'warning'; message: string; unitId?: string }

export function pointsTotal(units: BuilderUnit[]) {
  return units.reduce((sum, u) => sum + u.points + (u.enhancement?.points ?? 0), 0)
}

export function validateList(list: BuilderList): Issue[] {
  const issues: Issue[] = []
  const byId = new Map(list.units.map((u) => [u.id, u]))

  if (list.units.length === 0) return issues

  if (list.detachmentId === null) issues.push({ level: 'warning', message: 'Choose a detachment.' })

  const total = pointsTotal(list.units)
  if (total > list.pointsLimit)
    issues.push({ level: 'error', message: `${total - list.pointsLimit} pts over the ${list.pointsLimit} pt limit.` })

  // Faction
  for (const u of list.units)
    if (!list.allowedFactionIds.includes(u.datasheet.factionId))
      issues.push({ level: 'error', unitId: u.id, message: `${u.datasheet.name} isn't from this army's faction.` })

  // Rule of Three (and Epic Heroes, Battleline, Dedicated Transports)
  const counts = new Map<number, { name: string; role: Role; n: number }>()
  for (const u of list.units) {
    const c = counts.get(u.datasheet.id) ?? { name: u.datasheet.name, role: u.datasheet.role, n: 0 }
    c.n++
    counts.set(u.datasheet.id, c)
  }
  for (const c of counts.values()) {
    const max = datasheetLimit(c.role)
    if (c.n > max)
      issues.push({
        level: 'error',
        message:
          c.role === 'epic_hero'
            ? `${c.name} is an Epic Hero and can only be included once.`
            : `${c.name} is included ${c.n} times; the limit is ${max}.`,
      })
  }

  // Enhancements
  const withEnhancement = list.units.filter((u) => u.enhancement)
  if (withEnhancement.length > ENHANCEMENT_LIMIT)
    issues.push({
      level: 'error',
      message: `${withEnhancement.length} Enhancements; an army can have at most ${ENHANCEMENT_LIMIT}.`,
    })
  const seen = new Map<number, number>()
  for (const u of withEnhancement) {
    const e = u.enhancement!
    seen.set(e.id, (seen.get(e.id) ?? 0) + 1)
    if (u.datasheet.role !== 'character')
      issues.push({
        level: 'error',
        unitId: u.id,
        message:
          u.datasheet.role === 'epic_hero'
            ? `${u.datasheet.name} is an Epic Hero and can't take an Enhancement.`
            : `${u.datasheet.name} isn't a Character, so it can't take ${e.name}.`,
      })
    if (list.detachmentId !== null && e.detachmentId !== list.detachmentId)
      issues.push({ level: 'error', unitId: u.id, message: `${e.name} isn't from this army's detachment.` })
  }
  for (const u of withEnhancement) {
    const e = u.enhancement!
    if ((seen.get(e.id) ?? 0) > 1) {
      issues.push({ level: 'error', message: `${e.name} is taken more than once.` })
      seen.delete(e.id)
    }
  }

  // Leaders
  const ledBy = new Map<string, BuilderUnit[]>()
  for (const u of list.units) {
    if (!u.attachedToId) continue
    const target = byId.get(u.attachedToId)
    if (!target) continue
    if (!u.datasheet.leads.includes(target.datasheet.id))
      issues.push({
        level: 'error',
        unitId: u.id,
        message: `${u.datasheet.name} can't lead ${target.datasheet.name}.`,
      })
    if (target.attachedToId)
      issues.push({
        level: 'error',
        unitId: u.id,
        message: `${target.datasheet.name} is itself attached to another unit.`,
      })
    ledBy.set(target.id, [...(ledBy.get(target.id) ?? []), u])
  }
  for (const [targetId, leaders] of ledBy)
    if (leaders.length > 1)
      // Some datasheets allow a second Leader; the data model doesn't capture
      // those exceptions, so this is a warning rather than an error.
      issues.push({
        level: 'warning',
        unitId: targetId,
        message: `${byId.get(targetId)!.datasheet.name} has ${leaders.length} Leaders attached; most units allow only one.`,
      })

  return issues
}
