import type { AdminTheme } from './AdminThemeContext'

/** Theme-aware class pairs (admin only — does not use Tailwind `dark:` so storefront OS dark mode is unchanged). */
export function ad(theme: AdminTheme, light: string, dark: string) {
  return theme === 'dark' ? dark : light
}
