import type { NextRequest } from 'next/server'

// The public origin the browser used. request.nextUrl.origin can report the
// server's bind address (e.g. 0.0.0.0) behind a proxy or in standalone mode.
export function requestOrigin(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const proto =
    request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '')
  return host ? `${proto}://${host}` : request.nextUrl.origin
}
