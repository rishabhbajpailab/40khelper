// Display helpers for rules data. See supabase/migrations for how values are stored.

// 3 -> "3+"
export const plus = (n: number | null | undefined) => (n == null ? '-' : `${n}+`)

// -2 -> "-2", 0 -> "0"
export const ap = (n: number) => String(n)

// 24 -> '24"', null -> "Melee"
export const range = (n: number | null) => (n == null ? 'Melee' : `${n}"`)

// "6" -> '6"', "20+" -> '20+"'
export const inches = (s: string) => (/^\d+\+?$/.test(s) ? `${s}"` : s)

// null skill = Torrent ("N/A" on the datasheet)
export const skill = (n: number | null) => (n == null ? 'N/A' : `${n}+`)

export const roleLabel: Record<string, string> = {
  epic_hero: 'Epic Hero',
  character: 'Character',
  battleline: 'Battleline',
  dedicated_transport: 'Dedicated Transport',
  fortification: 'Fortification',
  other: 'Other',
}

// Order sections the way a codex does.
export const roleOrder = ['epic_hero', 'character', 'battleline', 'dedicated_transport', 'other', 'fortification']

export const phaseLabel: Record<string, string> = {
  command: 'Command',
  movement: 'Movement',
  shooting: 'Shooting',
  charge: 'Charge',
  fight: 'Fight',
  any: 'Any phase',
}

export const categoryLabel: Record<string, string> = {
  battle_tactic: 'Battle Tactic',
  strategic_ploy: 'Strategic Ploy',
  epic_deed: 'Epic Deed',
  wargear: 'Wargear',
}

// "Lethal hits" style title case for keywords stored upper-case.
export const keywordCase = (s: string) =>
  s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, c: string) => sep + c.toUpperCase())

export function pointsRange(sizes: { points: number }[]) {
  if (sizes.length === 0) return null
  const pts = sizes.map((s) => s.points)
  const lo = Math.min(...pts)
  const hi = Math.max(...pts)
  return lo === hi ? `${lo} pts` : `${lo}–${hi} pts`
}
