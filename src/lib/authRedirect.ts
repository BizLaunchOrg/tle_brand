/**
 * Sign-up / magic-link redirect target for Supabase Auth emails.
 *
 * Production always uses the live site origin (never a baked-in localhost URL).
 * Optional VITE_AUTH_REDIRECT_URL applies in dev only (e.g. ngrok or a fixed port).
 */
export function getSignupRedirectUrl(): string {
  if (typeof window !== 'undefined') {
    if (import.meta.env.DEV) {
      const configured = import.meta.env.VITE_AUTH_REDIRECT_URL?.trim()
      const first = configured?.split(',')[0]?.trim()
      if (first) {
        try {
          return new URL(first).toString()
        } catch {
          /* fall through to current origin */
        }
      }
    }
    return `${window.location.origin}/login`
  }

  return '/login'
}

/**
 * Redirect target for email-change confirmation links.
 * Must be listed in Supabase → Authentication → URL Configuration → Redirect URLs.
 */
export function getEmailChangeRedirectUrl(nextPath = '/admin/account'): string {
  const safeNext = nextPath.startsWith('/') ? nextPath : '/admin/account'
  const confirmPath = `/auth/confirm?next=${encodeURIComponent(safeNext)}`

  if (typeof window !== 'undefined') {
    return `${window.location.origin}${confirmPath}`
  }

  return confirmPath
}
