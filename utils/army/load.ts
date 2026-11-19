import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { BuilderList, BuilderUnit, Role } from './validate'

// Loads an army list with everything the builder and the read-only view need.
// Returns null when the list doesn't exist or RLS hides it from this user.
export async function loadArmyList(supabase: SupabaseClient<Database>, listId: string) {
  const { data: list } = await supabase
    .from('army_lists')
    .select(
      `id, name, owner_id, faction_id, detachment_id, points_limit, notes, is_public, updated_at,
       faction:factions!inner(id, name, slug, parent_id),
       detachment:detachments(id, name, rule),
       units:army_list_units(id, datasheet_id, unit_size_id, enhancement_id, attached_to_id, sort_order, wargear_notes)`,
    )
    .eq('id', listId)
    .maybeSingle()
  if (!list) return null

  const allowedFactionIds = [list.faction.id, ...(list.faction.parent_id ? [list.faction.parent_id] : [])]
  const datasheetIds = [...new Set(list.units.map((u) => u.datasheet_id))]

  const [{ data: sheets }, { data: enhancements }, { data: detachments }] = await Promise.all([
    // Every datasheet the list can use (for the picker), plus any already in it.
    supabase
      .from('datasheets')
      .select(
        'id, name, slug, role, faction_id, faction:factions!inner(slug), unit_sizes(id, models, points), leads:leader_attachments!leader_id(bodyguard_id)',
      )
      .or(
        `faction_id.in.(${allowedFactionIds.join(',')})${datasheetIds.length ? `,id.in.(${datasheetIds.join(',')})` : ''}`,
      )
      .order('name'),
    list.detachment_id
      ? supabase
          .from('enhancements')
          .select('id, name, points, restriction, detachment_id')
          .eq('detachment_id', list.detachment_id)
          .order('name')
      : Promise.resolve({ data: [] as { id: number; name: string; points: number; restriction: string | null; detachment_id: number }[] }),
    supabase.from('detachments').select('id, name').in('faction_id', allowedFactionIds).order('name'),
  ])

  // An enhancement may belong to a previous detachment; fetch any we're missing.
  const knownEnh = new Map((enhancements ?? []).map((e) => [e.id, e]))
  const missingEnh = list.units.map((u) => u.enhancement_id).filter((e): e is number => e !== null && !knownEnh.has(e))
  if (missingEnh.length) {
    const { data } = await supabase
      .from('enhancements')
      .select('id, name, points, restriction, detachment_id')
      .in('id', missingEnh)
    data?.forEach((e) => knownEnh.set(e.id, e))
  }

  const sheetById = new Map(
    (sheets ?? []).map((s) => [
      s.id,
      {
        ...s,
        role: s.role as Role,
        unit_sizes: [...s.unit_sizes].sort((a, b) => a.models - b.models),
        leads: s.leads.map((l) => l.bodyguard_id),
      },
    ]),
  )

  const units = [...list.units]
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((u) => {
      const sheet = sheetById.get(u.datasheet_id)
      if (!sheet) return []
      const size = sheet.unit_sizes.find((s) => s.id === u.unit_size_id)
      const enh = u.enhancement_id ? knownEnh.get(u.enhancement_id) : undefined
      const builder: BuilderUnit = {
        id: u.id,
        datasheet: { id: sheet.id, name: sheet.name, role: sheet.role, factionId: sheet.faction_id, leads: sheet.leads },
        points: size?.points ?? 0,
        enhancement: enh ? { id: enh.id, name: enh.name, points: enh.points, detachmentId: enh.detachment_id } : null,
        attachedToId: u.attached_to_id,
      }
      return [{ ...builder, row: u, sheet, size }]
    })

  const builder: BuilderList = {
    pointsLimit: list.points_limit,
    allowedFactionIds,
    detachmentId: list.detachment_id,
    units,
  }

  return {
    list,
    units,
    builder,
    // Datasheets that can be added: the faction's and its parent's.
    available: [...sheetById.values()].filter((s) => allowedFactionIds.includes(s.faction_id)),
    enhancements: enhancements ?? [],
    detachments: detachments ?? [],
  }
}

export type LoadedArmyList = NonNullable<Awaited<ReturnType<typeof loadArmyList>>>
export type LoadedUnit = LoadedArmyList['units'][number]
