import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'
import { supabaseKey, supabaseUrl } from './env'

// Pages that require a signed-in user. Everything else is public.
const PROTECTED_PREFIXES = ['/lists']

// Refreshes the Supabase session cookie on every request and gates protected pages.
export async function updateSession(request: NextRequest) {
  // If Supabase didn't accept the emailed redirect URL it falls back to the
  // Site URL, landing on /?code=... Send that on to the callback that
  // exchanges the code, rather than leaving the user signed out.
  if (request.nextUrl.pathname === '/' && request.nextUrl.searchParams.has('code')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'
    return NextResponse.redirect(url)
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value))
      },
    },
  })

  // Don't put code between createServerClient and getClaims: it validates the
  // session and triggers the cookie refresh above.
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims)

  const path = request.nextUrl.pathname
  if (!signedIn && PROTECTED_PREFIXES.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = `?next=${encodeURIComponent(path)}`
    return NextResponse.redirect(url)
  }

  return response
}
