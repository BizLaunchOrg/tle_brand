import { getSupabase } from './supabaseClient'
import { isSupabaseConfigured } from './mapSupabaseAuthError'

const CACHE_KEY = 'tle_store_appearance_v1'

export type ExclusiveOfferAppearance = {
  enabled: boolean
  badge: string
  headline: string
  subtext: string
  buttonText: string
  /** Material Symbols icon name */
  buttonIcon: string
}

export type BrandColors = {
  pink: string
  deep: string
  gold: string
  charcoal: string
  cream: string
  blush: string
  light: string
}

export type StoreAppearance = {
  /** Public image URLs, 1–4 slides. */
  heroBanners: string[]
  exclusiveOffer: ExclusiveOfferAppearance
  colors: BrandColors
}

export const DEFAULT_BRAND_COLORS: BrandColors = {
  pink: '#c4698d',
  deep: '#a0496f',
  gold: '#bf8f48',
  charcoal: '#0e0e0e',
  cream: '#faf8f5',
  blush: '#f8edf2',
  light: '#eeb8ce',
}

export const DEFAULT_STORE_APPEARANCE: StoreAppearance = {
  heroBanners: ['/promo-hero.png'],
  exclusiveOffer: {
    enabled: true,
    badge: 'Exclusive offer',
    headline: 'Book a makeup session and enjoy an exclusive studio photoshoot experience.',
    subtext:
      'Tap below to choose your photoshoot bundle (outfits & edited pictures), then pick your date and time.',
    buttonText: 'Book makeup + photoshoot',
    buttonIcon: 'photo_camera',
  },
  colors: { ...DEFAULT_BRAND_COLORS },
}

function isHex(s: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s.trim())
}

function normalizeHex(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback
  const s = raw.trim()
  if (!isHex(s)) return fallback
  if (s.length === 4) {
    const r = s[1]
    const g = s[2]
    const b = s[3]
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return s.toLowerCase()
}

function normalizeBanners(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [...DEFAULT_STORE_APPEARANCE.heroBanners]
  const urls = raw
    .map((u) => (typeof u === 'string' ? u.trim() : ''))
    .filter(Boolean)
    .slice(0, 4)
  return urls.length ? urls : [...DEFAULT_STORE_APPEARANCE.heroBanners]
}

function normalizeOffer(raw: unknown): ExclusiveOfferAppearance {
  const d = DEFAULT_STORE_APPEARANCE.exclusiveOffer
  if (!raw || typeof raw !== 'object') return { ...d }
  const o = raw as Record<string, unknown>
  return {
    enabled: o.enabled !== false,
    badge: typeof o.badge === 'string' && o.badge.trim() ? o.badge.trim() : d.badge,
    headline: typeof o.headline === 'string' && o.headline.trim() ? o.headline.trim() : d.headline,
    subtext: typeof o.subtext === 'string' && o.subtext.trim() ? o.subtext.trim() : d.subtext,
    buttonText:
      typeof o.buttonText === 'string' && o.buttonText.trim() ? o.buttonText.trim() : d.buttonText,
    buttonIcon:
      typeof o.buttonIcon === 'string' && o.buttonIcon.trim()
        ? o.buttonIcon.trim().replace(/\s+/g, '_')
        : d.buttonIcon,
  }
}

function normalizeColors(raw: unknown): BrandColors {
  const d = DEFAULT_BRAND_COLORS
  if (!raw || typeof raw !== 'object') return { ...d }
  const o = raw as Record<string, unknown>
  return {
    pink: normalizeHex(o.pink, d.pink),
    deep: normalizeHex(o.deep, d.deep),
    gold: normalizeHex(o.gold, d.gold),
    charcoal: normalizeHex(o.charcoal, d.charcoal),
    cream: normalizeHex(o.cream, d.cream),
    blush: normalizeHex(o.blush, d.blush),
    light: normalizeHex(o.light, d.light),
  }
}

export function normalizeStoreAppearance(raw: unknown): StoreAppearance {
  if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_STORE_APPEARANCE)
  const o = raw as Record<string, unknown>
  return {
    heroBanners: normalizeBanners(o.heroBanners),
    exclusiveOffer: normalizeOffer(o.exclusiveOffer),
    colors: normalizeColors(o.colors),
  }
}

export function readAppearanceCache(): StoreAppearance {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return structuredClone(DEFAULT_STORE_APPEARANCE)
    return normalizeStoreAppearance(JSON.parse(raw))
  } catch {
    return structuredClone(DEFAULT_STORE_APPEARANCE)
  }
}

export function writeAppearanceCache(appearance: StoreAppearance): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(appearance))
  } catch {
    /* ignore quota */
  }
}

/** Instant brand color paint — CSS variables, no DOM class rewriting. */
export function applyBrandColors(colors: BrandColors): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--tle-pink', colors.pink)
  root.style.setProperty('--tle-deep', colors.deep)
  root.style.setProperty('--tle-gold', colors.gold)
  root.style.setProperty('--tle-charcoal', colors.charcoal)
  root.style.setProperty('--tle-cream', colors.cream)
  root.style.setProperty('--tle-blush', colors.blush)
  root.style.setProperty('--tle-light', colors.light)
  root.style.setProperty('--tle-pink-rgb', hexToRgbTriplet(colors.pink))
  root.style.setProperty('--tle-deep-rgb', hexToRgbTriplet(colors.deep))
  root.style.setProperty('--tle-gold-rgb', hexToRgbTriplet(colors.gold))
  root.style.setProperty('--tle-charcoal-rgb', hexToRgbTriplet(colors.charcoal))
  root.style.setProperty('--tle-cream-rgb', hexToRgbTriplet(colors.cream))
  root.style.setProperty('--tle-blush-rgb', hexToRgbTriplet(colors.blush))
  root.style.setProperty('--tle-light-rgb', hexToRgbTriplet(colors.light))
}

function hexToRgbTriplet(hex: string): string {
  const h = normalizeHex(hex, DEFAULT_BRAND_COLORS.pink).slice(1)
  const n = parseInt(h, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `${r} ${g} ${b}`
}

/** Call once before React mount for zero-flash theming. */
export function bootstrapAppearanceFromCache(): StoreAppearance {
  const cached = readAppearanceCache()
  applyBrandColors(cached.colors)
  return cached
}

let memoryCache: StoreAppearance | null = null

export function getMemoryAppearance(): StoreAppearance {
  return memoryCache ?? readAppearanceCache()
}

export function setMemoryAppearance(appearance: StoreAppearance): void {
  memoryCache = appearance
  writeAppearanceCache(appearance)
  applyBrandColors(appearance.colors)
}

export async function fetchStoreAppearance(): Promise<StoreAppearance> {
  if (!isSupabaseConfigured()) {
    const local = readAppearanceCache()
    setMemoryAppearance(local)
    return local
  }
  const { data, error } = await getSupabase()
    .from('shop_settings')
    .select('appearance')
    .eq('id', 'default')
    .maybeSingle()

  if (error || !data) {
    const local = readAppearanceCache()
    setMemoryAppearance(local)
    return local
  }
  const next = normalizeStoreAppearance((data as { appearance?: unknown }).appearance)
  setMemoryAppearance(next)
  return next
}

export async function saveStoreAppearance(
  appearance: StoreAppearance,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: 'Not configured.' }
  const normalized = normalizeStoreAppearance(appearance)
  if (normalized.heroBanners.length < 1) {
    return { ok: false, message: 'Add at least one hero banner image.' }
  }
  if (normalized.heroBanners.length > 4) {
    return { ok: false, message: 'You can use up to 4 hero banners.' }
  }

  const { error } = await getSupabase()
    .from('shop_settings')
    .update({
      appearance: normalized,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'default')

  if (error) {
    const msg = (error.message || '').toLowerCase()
    if (msg.includes('appearance') || msg.includes('column')) {
      return {
        ok: false,
        message: 'Appearance column missing. Run migration 20260520160000_shop_appearance.sql.',
      }
    }
    return { ok: false, message: 'Could not save appearance.' }
  }

  setMemoryAppearance(normalized)
  return { ok: true }
}
