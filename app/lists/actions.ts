'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'

// Every write goes through the signed-in user's Supabase session, so row-level
// security is what stops anyone editing a list they don't own. These actions
// only check input shapes.

const id = z.coerce.number().int().positive()
const uuid = z.string().uuid()
const optionalId = z.preprocess((v) => (v === '' || v == null ? null : v), id.nullable())
const optionalUuid = z.preprocess((v) => (v === '' || v == null ? null : v), uuid.nullable())

function fail(listId: string | null, message: string): never {
  redirect(listId ? `/lists/${listId}?error=${encodeURIComponent(message)}` : `/lists?error=${encodeURIComponent(message)}`)
}

function parse<T extends z.ZodTypeAny>(schema: T, formData: FormData, listId: string | null = null): z.infer<T> {
  const result = schema.safeParse(Object.fromEntries(formData))
  if (!result.success) fail(listId, 'That request was missing something. Try again.')
  return result.data
}

export async function createList(formData: FormData) {
  const input = parse(
    z.object({
      name: z.string().trim().min(1).max(100),
      faction_id: id,
      points_limit: z.coerce.number().int().min(1).max(10000),
    }),
    formData,
  )
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('army_lists')
    .insert({ name: input.name, faction_id: input.faction_id, points_limit: input.points_limit })
    .select('id')
    .single()
  if (error) fail(null, error.message)
  redirect(`/lists/${data.id}`)
}

export async function updateList(formData: FormData) {
  const listId = String(formData.get('list_id') ?? '')
  const input = parse(
    z.object({
      list_id: uuid,
      name: z.string().trim().min(1).max(100),
      detachment_id: optionalId,
      points_limit: z.coerce.number().int().min(1).max(10000),
      notes: z.string().max(5000).optional(),
    }),
    formData,
    listId,
  )
  const supabase = await createClient()
  const { error } = await supabase
    .from('army_lists')
    .update({
      name: input.name,
      detachment_id: input.detachment_id,
      points_limit: input.points_limit,
      notes: input.notes?.trim() || null,
    })
    .eq('id', input.list_id)
  if (error) fail(listId, error.message)

  // Enhancements belong to a detachment; drop any from the old one.
  if (input.detachment_id !== null) {
    const { data: keep } = await supabase.from('enhancements').select('id').eq('detachment_id', input.detachment_id)
    const keepIds = (keep ?? []).map((e) => e.id)
    let q = supabase.from('army_list_units').update({ enhancement_id: null }).eq('army_list_id', input.list_id).not('enhancement_id', 'is', null)
    if (keepIds.length) q = q.not('enhancement_id', 'in', `(${keepIds.join(',')})`)
    await q
  }
  revalidatePath(`/lists/${listId}`)
}

export async function setPublic(formData: FormData) {
  const listId = String(formData.get('list_id') ?? '')
  const input = parse(z.object({ list_id: uuid, is_public: z.enum(['true', 'false']) }), formData, listId)
  const supabase = await createClient()
  const { error } = await supabase
    .from('army_lists')
    .update({ is_public: input.is_public === 'true' })
    .eq('id', input.list_id)
  if (error) fail(listId, error.message)
  revalidatePath(`/lists/${listId}`)
}

export async function deleteList(formData: FormData) {
  const listId = String(formData.get('list_id') ?? '')
  const input = parse(z.object({ list_id: uuid }), formData, listId)
  const supabase = await createClient()
  const { error } = await supabase.from('army_lists').delete().eq('id', input.list_id)
  if (error) fail(listId, error.message)
  redirect('/lists')
}

export async function addUnit(formData: FormData) {
  const listId = String(formData.get('list_id') ?? '')
  const input = parse(z.object({ list_id: uuid, datasheet_id: id }), formData, listId)
  const supabase = await createClient()

  // Start at the smallest unit size.
  const [{ data: size }, { data: last }] = await Promise.all([
    supabase
      .from('unit_sizes')
      .select('id')
      .eq('datasheet_id', input.datasheet_id)
      .order('models')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('army_list_units')
      .select('sort_order')
      .eq('army_list_id', input.list_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  if (!size) fail(listId, 'That datasheet has no points values yet.')

  const { error } = await supabase.from('army_list_units').insert({
    army_list_id: input.list_id,
    datasheet_id: input.datasheet_id,
    unit_size_id: size.id,
    sort_order: (last?.sort_order ?? -1) + 1,
  })
  if (error) fail(listId, error.message)
  await touch(input.list_id)
  revalidatePath(`/lists/${listId}`)
}

export async function updateUnit(formData: FormData) {
  const listId = String(formData.get('list_id') ?? '')
  const input = parse(
    z.object({
      list_id: uuid,
      unit_id: uuid,
      unit_size_id: id,
      enhancement_id: optionalId,
      attached_to_id: optionalUuid,
    }),
    formData,
    listId,
  )
  const supabase = await createClient()
  const { error } = await supabase
    .from('army_list_units')
    .update({
      unit_size_id: input.unit_size_id,
      enhancement_id: input.enhancement_id,
      attached_to_id: input.attached_to_id,
    })
    .eq('id', input.unit_id)
    .eq('army_list_id', input.list_id)
  if (error) fail(listId, error.message)
  await touch(input.list_id)
  revalidatePath(`/lists/${listId}`)
}

export async function duplicateUnit(formData: FormData) {
  const listId = String(formData.get('list_id') ?? '')
  const input = parse(z.object({ list_id: uuid, unit_id: uuid }), formData, listId)
  const supabase = await createClient()
  const { data: unit } = await supabase
    .from('army_list_units')
    .select('datasheet_id, unit_size_id, wargear_notes, sort_order')
    .eq('id', input.unit_id)
    .single()
  if (!unit) fail(listId, 'That unit no longer exists.')
  // Enhancements and Leader attachments aren't copied: both must be unique.
  const { error } = await supabase.from('army_list_units').insert({ army_list_id: input.list_id, ...unit })
  if (error) fail(listId, error.message)
  await touch(input.list_id)
  revalidatePath(`/lists/${listId}`)
}

export async function removeUnit(formData: FormData) {
  const listId = String(formData.get('list_id') ?? '')
  const input = parse(z.object({ list_id: uuid, unit_id: uuid }), formData, listId)
  const supabase = await createClient()
  // The attachment foreign key cascades, so detach any Leaders first rather
  // than deleting them along with their bodyguard unit.
  await supabase
    .from('army_list_units')
    .update({ attached_to_id: null })
    .eq('army_list_id', input.list_id)
    .eq('attached_to_id', input.unit_id)
  const { error } = await supabase.from('army_list_units').delete().eq('id', input.unit_id)
  if (error) fail(listId, error.message)
  await touch(input.list_id)
  revalidatePath(`/lists/${listId}`)
}

// Bump updated_at so "my lists" sorts by last edit.
async function touch(listId: string) {
  const supabase = await createClient()
  await supabase.from('army_lists').update({ updated_at: new Date().toISOString() }).eq('id', listId)
}
