import type { AdminTheme } from './AdminThemeContext'

/** Theme-aware class pairs (admin only — storefront still uses `darkMode: 'media'`). */
export function ad(theme: AdminTheme, light: string, dark: string) {
  return theme === 'dark' ? dark : light
}

/** OS-native stack — reads like real internal tooling, not a template. */
export function adminFont() {
  return "font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,'Helvetica_Neue',Arial,sans-serif]"
}
