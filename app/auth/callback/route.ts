import { NextResponse, type NextRequest } from 'next/server'
import { requestOrigin } from '@/utils/request-origin'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

// Magic links and OAuth redirect here with a one-time code (PKCE flow).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const origin = requestOrigin(request)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/lists'
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/lists'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('That sign-in link is invalid or has expired')}`)
}
