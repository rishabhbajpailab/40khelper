'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

// Sends a magic-link email. Supabase creates the account on first sign-in.
export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const next = safeNext(String(formData.get('next') ?? '/lists'))
  if (!email) redirect(`/login?error=${encodeURIComponent('Enter an email address')}`)

  const origin = (await headers()).get('origin') ?? ''
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  })

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`)
  redirect('/login?sent=1')
}

// Only allow same-site relative redirects.
function safeNext(next: string) {
  return next.startsWith('/') && !next.startsWith('//') ? next : '/lists'
}
