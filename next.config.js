/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a self-contained server in .next/standalone so the app can run on any
  // Node host or container without the full node_modules tree.
  output: 'standalone',
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig
