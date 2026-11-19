import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { loadArmyList } from '@/utils/army/load'
import { listToText } from '@/utils/army/text'
import ArmySummary from '@/app/lists/ArmySummary'
import ArmyView from '@/app/lists/ArmyView'
import CopyButton from '@/app/components/CopyButton'

type Props = { params: Promise<{ id: string }> }

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  if (!isUuid(id)) return { title: '40k Helper' }
  const supabase = await createClient()
  const { data } = await supabase.from('army_lists').select('name').eq('id', id).maybeSingle()
  return { title: data ? `${data.name} · 40k Helper` : '40k Helper' }
}

// Read-only share link. Row-level security only returns the list if it's
// public or belongs to the viewer, so private lists 404 for everyone else.
export default async function SharedListPage({ params }: Props) {
  const { id } = await params
  if (!isUuid(id)) notFound()
  const supabase = await createClient()
  const army = await loadArmyList(supabase, id)
  if (!army) notFound()

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <ArmySummary army={army}>
        <div className="flex gap-3 text-sm">
          <CopyButton text={listToText(army)} label="Copy as text" className="underline-offset-2 hover:underline" />
        </div>
      </ArmySummary>
      <ArmyView army={army} />
      {army.list.notes && <p className="whitespace-pre-line text-sm opacity-80">{army.list.notes}</p>}
    </main>
  )
}
