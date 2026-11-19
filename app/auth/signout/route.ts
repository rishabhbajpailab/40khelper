import { NextResponse, type NextRequest } from 'next/server'
import { requestOrigin } from '@/utils/request-origin'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/', requestOrigin(request)), { status: 303 })
}
