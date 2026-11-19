import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { supabaseKey, supabaseUrl } from './env'

// Supabase pauses Free plan projects after about a week without database
// activity, and signed-out traffic never reaches the database. A daily Cron
// Trigger runs one tiny query through PostgREST so the project stays active.
export async function keepSupabaseAwake() {
  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error } = await supabase.from('factions').select('id').limit(1)
  if (error) {
    console.error('Supabase keep-alive query failed:', error.message)
    throw error
  }
  console.log('Supabase keep-alive query succeeded')
}
