import { env } from 'cloudflare:workers'

// Cloudflare bindings declared in cloudflare.config.ts. Server-only: import this
// from Server Components, Route Handlers and Server Actions, never from the client.

// Workers KV: eventually consistent, fast global reads. Good for caches and flags,
// not for anything that needs read-after-write (use Supabase for that).
export const kv = env.KV

// R2 object storage (S3-compatible). Private by default; serve objects through a
// route handler that checks the Supabase session, or via a signed URL.
export const bucket = env.BUCKET

// Read-through cache in KV. `ttl` is in seconds (KV's minimum is 60).
export async function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const hit = await kv.get<T>(key, 'json')
  if (hit !== null) return hit
  const value = await load()
  await kv.put(key, JSON.stringify(value), { expirationTtl: Math.max(ttl, 60) })
  return value
}
