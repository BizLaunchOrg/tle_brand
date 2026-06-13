/** Canonical public storefront origin (never /admin). */
export function getPublicStorefrontUrl(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL?.trim()
  if (fromEnv) {
    try {
      const raw = /^https?:\/\//i.test(fromEnv) ? fromEnv : `https://${fromEnv}`
      return new URL(raw).origin
    } catch {
      /* fall through */
    }
  }
  if (typeof window !== 'undefined') return window.location.origin
  return 'https://www.tlebrand.com'
}

/** Full homepage link to share with customers. */
export function getPublicStorefrontShareUrl(): string {
  const origin = getPublicStorefrontUrl()
  const base = import.meta.env.BASE_URL || '/'
  if (base === '/' || base === '') return `${origin}/`
  const path = base.startsWith('/') ? base : `/${base}`
  return `${origin}${path}`.replace(/([^:]\/)\/+/g, '$1')
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}
