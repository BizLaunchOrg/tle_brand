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
          const withManifest = html.replace(/href="manifest\.webmanifest"/, `href="${storeManifest}"`)
          const sync = `
    <script>
(function () {
  try {
    var link = document.getElementById('tle-web-manifest')
    if (!link) return
    var base = ${JSON.stringify(base)}
    var p = location.pathname
    var b = base === '/' ? '' : (base.length > 1 && base.endsWith('/') ? base.slice(0, -1) : base)
    var rel = !b ? p : (p.indexOf(b) === 0 ? p.slice(b.length) || '/' : p)
    var isAdmin =
      rel === '/admin' ||
      rel.startsWith('/admin/') ||
      rel.endsWith('/admin-install.html')
    if (!isAdmin) return
    var href = link.getAttribute('href') || ''
    var adminHref = href.replace(/manifest\\.webmanifest(\\?.*)?$/i, function (m, q) {
      var u = 'manifest-admin.webmanifest' + (q || '')
      return u.indexOf('tleAdmin=') === -1 ? u + (q ? '&' : '?') + 'tleAdmin=1' : u
    })
    if (adminHref !== href) link.setAttribute('href', adminHref)
  } catch (e) {}
})()
    </script>`
          return withManifest.replace(
            /(<link rel="manifest" id="tle-web-manifest"[^>]*\/>)/,
            (_, tag) => tag + sync,
          )
        },
      },
    ],
  }
})
