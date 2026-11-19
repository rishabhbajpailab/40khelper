import { kv } from '@/utils/cloudflare'

export const dynamic = 'force-dynamic'

// Liveness check. Read-only on purpose: KV's Free plan allows 1,000 writes a
// day, and anyone on the internet can hit this URL.
export async function GET() {
  let kvReachable = true
  try {
    await kv.get('health:probe')
  } catch {
    kvReachable = false
  }
  return Response.json({ ok: kvReachable, kv: kvReachable }, { status: kvReachable ? 200 : 503 })
}
