/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_AUTH_REDIRECT_URL?: string
  /** Web Push VAPID public key (same as Edge secret VAPID_PUBLIC_KEY). */
  readonly VITE_VAPID_PUBLIC_KEY?: string
  /** Public site origin for absolute og:image/twitter:image (e.g. https://your-app.vercel.app). */
  readonly VITE_SITE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
