import { kv } from '@/utils/cloudflare'

export const dynamic = 'force-dynamic'

// Liveness check that also proves the Worker can reach its KV binding.
export async function GET() {
  await kv.put('health:last-check', new Date().toISOString(), { expirationTtl: 60 })
  return Response.json({ ok: true, kv: (await kv.get('health:last-check')) !== null })
}
