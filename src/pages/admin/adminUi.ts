import type { AdminTheme } from './AdminThemeContext'

/** Theme-aware class pairs (admin only — storefront still uses `darkMode: 'media'`). */
export function ad(theme: AdminTheme, light: string, dark: string) {
  return theme === 'dark' ? dark : light
}

/** OS-native stack — reads like real internal tooling, not a template. */
export function adminFont() {
  return "font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,'Helvetica_Neue',Arial,sans-serif]"
}

/** Use before any destructive delete in admin (native OK/Cancel dialog). */
export function adminConfirmDelete(itemLabel?: string): boolean {
  const label = itemLabel?.trim()
  const suffix = label ? ` “${label}”` : ' this item'
  return window.confirm(`Are you sure you want to delete${suffix}? This cannot be undone.`)
}

/** Admin avatar initials from the current sign-in email (updates after email change). */
export function adminInitialsFromEmail(email: string | null | undefined): string {
  if (!email) return '?'
  const local = email.split('@')[0]?.replace(/[._+-]+/g, ' ').trim() ?? ''
  const parts = local.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  if (local.length >= 2) return local.slice(0, 2).toUpperCase()
  return (local[0] ?? '?').toUpperCase()
}

/** First name for dashboard greeting — from sign-in email, not old signup metadata. */
export function adminGreetingName(email: string | null | undefined): string {
  if (!email) return 'there'
  const local = (email.split('@')[0] ?? '').replace(/[._+-]+/g, ' ').trim()
  if (!local) return 'there'
  const first = local.split(/\s+/)[0] ?? local
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}

/** Nav / sidebar label — always the live sign-in email. */
export function adminProfileLabel(email: string | null | undefined): string {
  if (!email) return 'Account'
  return email.length > 28 ? `${email.slice(0, 26)}…` : email
}
