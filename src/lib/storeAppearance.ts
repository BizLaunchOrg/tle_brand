import { getSupabase } from './supabaseClient'
import { isSupabaseConfigured } from './mapSupabaseAuthError'

const CACHE_KEY = 'tle_store_appearance_v2'

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

/** The three colors the admin actually picks. Soft tones are derived from main. */
export type BrandColorRoles = {
  main: string
  accent: string
  dark: string
}

export type StoreAppearance = {
  /** Public image URLs, 1–4 slides. */
  heroBanners: string[]
  exclusiveOffer: ExclusiveOfferAppearance
  colors: BrandColors
  /** Recently used / saved hexes for quick re-pick (main + accent + dark). */
  usedColors: string[]
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

export const DEFAULT_COLOR_ROLES: BrandColorRoles = {
  main: DEFAULT_BRAND_COLORS.pink,
  accent: DEFAULT_BRAND_COLORS.gold,
  dark: DEFAULT_BRAND_COLORS.charcoal,
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
  usedColors: [
    DEFAULT_BRAND_COLORS.pink,
    DEFAULT_BRAND_COLORS.gold,
    DEFAULT_BRAND_COLORS.charcoal,
  ],
}

/** Only previously saved store brand colors — keep the list short. */
const MAX_USED_COLORS = 9

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

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = normalizeHex(hex, DEFAULT_BRAND_COLORS.pink).slice(1)
  const n = parseInt(h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((x) => clampByte(x).toString(16).padStart(2, '0')).join('')}`
}

/** Mix color toward white (t=0 same, t=1 white). */
function tint(hex: string, t: number): string {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t)
}

/** Mix color toward black (t=0 same, t=1 black). */
function shade(hex: string, t: number): string {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(r * (1 - t), g * (1 - t), b * (1 - t))
}

/** Build full CSS brand palette from the 3 admin-facing roles. */
export function brandColorsFromRoles(roles: BrandColorRoles): BrandColors {
  const main = normalizeHex(roles.main, DEFAULT_COLOR_ROLES.main)
  const accent = normalizeHex(roles.accent, DEFAULT_COLOR_ROLES.accent)
  const dark = normalizeHex(roles.dark, DEFAULT_COLOR_ROLES.dark)
  return {
    pink: main,
    deep: shade(main, 0.22),
    light: tint(main, 0.45),
    blush: tint(main, 0.88),
    gold: accent,
    charcoal: dark,
    cream: '#faf8f5',
  }
}

export function rolesFromBrandColors(colors: BrandColors): BrandColorRoles {
  return {
    main: normalizeHex(colors.pink, DEFAULT_COLOR_ROLES.main),
    accent: normalizeHex(colors.gold, DEFAULT_COLOR_ROLES.accent),
    dark: normalizeHex(colors.charcoal, DEFAULT_COLOR_ROLES.dark),
  }
}

/** Round channels so near-identical picker drags collapse to one swatch. */
function snapHex(hex: string): string {
  const { r, g, b } = hexToRgb(hex)
  const step = 12
  const snap = (n: number) => Math.min(255, Math.round(n / step) * step)
  return rgbToHex(snap(r), snap(g), snap(b))
}

export function normalizeUsedColors(raw: unknown, seed: string[] = []): string[] {
  const fromRaw = Array.isArray(raw)
    ? raw.map((c) => (typeof c === 'string' ? normalizeHex(c, '') : '')).filter((c) => c.length === 7)
    : []
  const fromSeed = seed
    .map((c) => normalizeHex(c, ''))
    .filter((c) => c.length === 7)
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of [...fromRaw, ...fromSeed]) {
    const key = snapHex(c)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(c)
    if (out.length >= MAX_USED_COLORS) break
  }
  return out.length ? out : [...DEFAULT_STORE_APPEARANCE.usedColors]
}

/**
 * Record colors that were actually saved as the store's main / accent / dark.
 * Do not call this on every color-picker drag — only on successful save.
 */
export function rememberUsedColors(existing: string[], ...hexes: string[]): string[] {
  return normalizeUsedColors([], [...hexes, ...existing])
}

function normalizeColors(raw: unknown): BrandColors {
  const d = DEFAULT_BRAND_COLORS
  if (!raw || typeof raw !== 'object') return { ...d }
  const o = raw as Record<string, unknown>
  // Prefer explicit roles when present (newer saves).
  if (typeof o.main === 'string' || typeof o.accent === 'string' || typeof o.dark === 'string') {
    return brandColorsFromRoles({
      main: normalizeHex(o.main, d.pink),
      accent: normalizeHex(o.accent, d.gold),
      dark: normalizeHex(o.dark, d.charcoal),
    })
  }
  const pink = normalizeHex(o.pink, d.pink)
  const gold = normalizeHex(o.gold, d.gold)
  const charcoal = normalizeHex(o.charcoal, d.charcoal)
  // If only legacy full palette exists, keep soft tones when present; otherwise derive.
  if (typeof o.deep === 'string' || typeof o.blush === 'string') {
    return {
      pink,
      deep: normalizeHex(o.deep, shade(pink, 0.22)),
      gold,
      charcoal,
      cream: normalizeHex(o.cream, d.cream),
      blush: normalizeHex(o.blush, tint(pink, 0.88)),
      light: normalizeHex(o.light, tint(pink, 0.45)),
    }
  }
  return brandColorsFromRoles({ main: pink, accent: gold, dark: charcoal })
}

export function normalizeStoreAppearance(raw: unknown): StoreAppearance {
  if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_STORE_APPEARANCE)
  const o = raw as Record<string, unknown>
  const colors = normalizeColors(o.colors)
  const roles = rolesFromBrandColors(colors)
  return {
    heroBanners: normalizeBanners(o.heroBanners),
    exclusiveOffer: normalizeOffer(o.exclusiveOffer),
    colors,
    usedColors: normalizeUsedColors(o.usedColors, [roles.main, roles.accent, roles.dark]),
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
  const roles = rolesFromBrandColors(appearance.colors)
  // History = previously saved store colors only (not live picker drags).
  const withHistory = {
    ...appearance,
    colors: brandColorsFromRoles(roles),
    usedColors: rememberUsedColors(
      normalizeUsedColors(appearance.usedColors),
      roles.main,
      roles.accent,
      roles.dark,
    ),
  }
  const normalized = normalizeStoreAppearance(withHistory)
  if (normalized.heroBanners.length < 1) {
    return { ok: false, message: 'Add at least one hero banner image.' }
  }
  if (normalized.heroBanners.length > 4) {
    return { ok: false, message: 'You can use up to 4 hero banners.' }
  }

  const savedRoles = rolesFromBrandColors(normalized.colors)
  const { error } = await getSupabase()
    .from('shop_settings')
    .update({
      appearance: {
        heroBanners: normalized.heroBanners,
        exclusiveOffer: normalized.exclusiveOffer,
        colors: {
          ...normalized.colors,
          main: savedRoles.main,
          accent: savedRoles.accent,
          dark: savedRoles.dark,
        },
        usedColors: normalized.usedColors,
      },
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
