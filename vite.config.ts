import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://v3.vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv only reads .env* files. Vercel/CI inject vars into process.env — merge so VITE_BASE (and any future config) matches production.
  const fromFiles = loadEnv(mode, process.cwd(), '')
  const env = { ...process.env, ...fromFiles }

  let base = (env.VITE_BASE ?? '').trim() || '/'
  if (/^https?:\/\//i.test(base)) {
    console.warn('[vite] VITE_BASE must be a path (e.g. /repo/), not a full URL. Using /.')
    base = '/'
  }
  if (base !== '/' && !base.endsWith('/')) base = `${base}/`

  return {
    base,
    plugins: [
      react(),
      {
        name: 'tle-manifest-link-base',
        transformIndexHtml(html) {
          const storeManifest = `${base}manifest.webmanifest`.replace(/([^:]\/)\/+/g, '$1')
          return html.replace(/href="manifest\.webmanifest"/, `href="${storeManifest}"`)
        },
      },
    ],
  }
})
