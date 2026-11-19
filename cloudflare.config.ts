import { bindings, defineConfig, defineWorker, triggers } from 'cf/config'

// Cloudflare Workers config for the app (replaces wrangler.jsonc for vinext).
// Supabase covers Postgres, auth and RLS; everything else lives on Cloudflare.
// Bindings are read server-side with `import { env } from 'cloudflare:workers'`
// (see utils/cloudflare.ts). Run `npx cf workers types` after changing them.
export default defineConfig({
  worker: defineWorker({
    name: '40khelper',
    // Wraps vinext's fetch handler and adds the scheduled() handler.
    entrypoint: './worker/index.ts',
    compatibilityDate: '2026-11-19',
    // Custom Domain on the Cloudflare-managed glizzy.dev zone. Deploying creates
    // the DNS record and certificate; no manual DNS changes are needed.
    domains: ['40k.glizzy.dev'],
    // Serve only on the custom domain, so Supabase auth redirects have one origin.
    workersDev: false,
    assets: {
      htmlHandling: 'none',
      notFoundHandling: 'none',
      runWorkerFirst: ['/*', '!/_next/static/*', '!/*/_next/static/*'],
    },
    triggers: [
      // Daily Supabase keep-alive (utils/supabase/keep-alive.ts). Free plan.
      triggers.scheduled({ schedule: '17 9 * * *' }),
    ],
    env: {
      ASSETS: bindings.assets(),
      // Key-value store: caching, feature flags, rate-limit counters, short-lived tokens.
      KV: bindings.kv({ id: '05a81431a55b44d5b76747b1ace93132' }),
      // Object storage: uploaded army list images, data imports, exports.
      BUCKET: bindings.r2({ name: '40khelper-assets' }),
    },
  }),
})
