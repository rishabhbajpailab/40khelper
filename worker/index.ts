import handler from 'vinext/server/fetch-handler'
import { keepSupabaseAwake } from '../utils/supabase/keep-alive'

// Worker entry: vinext serves every HTTP request; this adds a Cron Trigger
// handler (schedule in cloudflare.config.ts) for background jobs.
export default {
  ...handler,
  async scheduled(_controller: ScheduledController, _env: unknown, ctx: ExecutionContext) {
    ctx.waitUntil(keepSupabaseAwake())
  },
}
