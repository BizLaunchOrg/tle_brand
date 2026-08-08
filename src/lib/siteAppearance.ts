/**
 * @deprecated Prefer storeAppearance.ts for storefront theming.
 * Kept so older admin color picks don't crash; maps emerald palette → brand pink CSS vars.
 */
import {
  applyBrandColors,
  DEFAULT_BRAND_COLORS,
  type BrandColors,
} from './storeAppearance'

export const AVAILABLE_COLORS = ['emerald', 'sky', 'amber', 'rose', 'violet'] as const
export type SiteColor = (typeof AVAILABLE_COLORS)[number]

const PRESETS: Record<SiteColor, BrandColors> = {
  emerald: {
    ...DEFAULT_BRAND_COLORS,
    pink: '#059669',
    deep: '#047857',
    light: '#6ee7b7',
    blush: '#ecfdf5',
    gold: '#bf8f48',
  },
  sky: {
    ...DEFAULT_BRAND_COLORS,
    pink: '#0284c7',
    deep: '#0369a1',
    light: '#7dd3fc',
    blush: '#f0f9ff',
  },
  amber: {
    ...DEFAULT_BRAND_COLORS,
    pink: '#d97706',
    deep: '#b45309',
    light: '#fcd34d',
    blush: '#fffbeb',
    gold: '#f59e0b',
  },
  rose: {
    ...DEFAULT_BRAND_COLORS,
    pink: '#e11d48',
    deep: '#be123c',
    light: '#fda4af',
    blush: '#fff1f2',
  },
  violet: {
    ...DEFAULT_BRAND_COLORS,
    pink: '#7c3aed',
    deep: '#6d28d9',
    light: '#c4b5fd',
    blush: '#f5f3ff',
  },
}

const STORAGE_KEY = 'tle_site_color'

export function getSiteColor(): SiteColor {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v && AVAILABLE_COLORS.includes(v as SiteColor)) return v as SiteColor
  } catch {
    /* ignore */
  }
  return 'rose'
}

export function setSiteColor(c: SiteColor) {
  try {
    localStorage.setItem(STORAGE_KEY, c)
  } catch {
    /* ignore */
  }
  applyBrandColors(PRESETS[c])
}

/** Fast CSS-variable apply — no MutationObserver. */
export function applySiteColor(): void {
  applyBrandColors(PRESETS[getSiteColor()])
}

export default null
