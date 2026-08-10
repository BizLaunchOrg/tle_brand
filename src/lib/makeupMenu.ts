import { getSupabase } from './supabaseClient'
import { isSupabaseConfigured } from './mapSupabaseAuthError'
import {
  DEFAULT_MAKEUP_MENU_ITEMS,
  type BookableServiceItem,
  type MakeupMenuCategory,
  type MakeupMenuItem,
} from '../data/bookingServices.ts'

const CACHE_KEY = 'tle_makeup_menu_v1'

export type MakeupMenu = {
  items: MakeupMenuItem[]
}

export const DEFAULT_MAKEUP_MENU: MakeupMenu = {
  items: DEFAULT_MAKEUP_MENU_ITEMS.map((x) => ({ ...x })),
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `mm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function normalizeCategory(raw: unknown): MakeupMenuCategory {
  return raw === 'photoshoot' ? 'photoshoot' : 'makeup'
}

export function normalizeMakeupMenuItem(
  raw: unknown,
  index = 0,
  fallback?: MakeupMenuItem,
): MakeupMenuItem {
  const d = fallback ?? DEFAULT_MAKEUP_MENU_ITEMS[Math.min(index, DEFAULT_MAKEUP_MENU_ITEMS.length - 1)]!
  if (!raw || typeof raw !== 'object') return { ...d, id: d.id || newId() }
  const o = raw as Record<string, unknown>
  const category = normalizeCategory(o.category ?? (o.duration === 'Photoshoot' ? 'photoshoot' : 'makeup'))
  const name = typeof o.name === 'string' && o.name.trim() ? o.name.trim() : d.name
  const price = typeof o.price === 'string' && o.price.trim() ? o.price.trim() : d.price
  const icon = typeof o.icon === 'string' && o.icon.trim() ? o.icon.trim().replace(/\s+/g, '_') : d.icon
  const duration =
    typeof o.duration === 'string' && o.duration.trim()
      ? o.duration.trim()
      : category === 'photoshoot'
        ? 'Photoshoot'
        : 'By appointment'
  const desc = typeof o.desc === 'string' ? o.desc.trim() : d.desc
  const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : newId()
  const sortOrder = typeof o.sortOrder === 'number' && Number.isFinite(o.sortOrder) ? o.sortOrder : index
  const requiresLocation =
    typeof o.requiresLocation === 'boolean'
      ? o.requiresLocation
      : category === 'makeup' && !/studio/i.test(name)
  const highlight = typeof o.highlight === 'boolean' ? o.highlight : category === 'makeup'
  return { id, category, name, price, icon, duration, desc, requiresLocation, highlight, sortOrder }
}

export function normalizeMakeupMenu(raw: unknown): MakeupMenu {
  if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_MAKEUP_MENU)
  const o = raw as Record<string, unknown>
  const list = Array.isArray(o.items) ? o.items : Array.isArray(raw) ? raw : null
  if (!list?.length) return structuredClone(DEFAULT_MAKEUP_MENU)
  const items = list.map((item, i) => normalizeMakeupMenuItem(item, i))
  items.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  return { items }
}

export function readMakeupMenuCache(): MakeupMenu {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return structuredClone(DEFAULT_MAKEUP_MENU)
    return normalizeMakeupMenu(JSON.parse(raw))
  } catch {
    return structuredClone(DEFAULT_MAKEUP_MENU)
  }
}

export function writeMakeupMenuCache(menu: MakeupMenu): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(menu))
  } catch {
    /* ignore */
  }
}

let memoryCache: MakeupMenu | null = null

export function getMemoryMakeupMenu(): MakeupMenu {
  return memoryCache ?? readMakeupMenuCache()
}

export function setMemoryMakeupMenu(menu: MakeupMenu): void {
  memoryCache = menu
  writeMakeupMenuCache(menu)
}

export async function fetchMakeupMenu(): Promise<MakeupMenu> {
  if (!isSupabaseConfigured()) {
    const local = readMakeupMenuCache()
    setMemoryMakeupMenu(local)
    return local
  }
  const { data, error } = await getSupabase()
    .from('shop_settings')
    .select('makeup_menu')
    .eq('id', 'default')
    .maybeSingle()

  if (error || !data) {
    const local = readMakeupMenuCache()
    setMemoryMakeupMenu(local)
    return local
  }
  const next = normalizeMakeupMenu((data as { makeup_menu?: unknown }).makeup_menu)
  setMemoryMakeupMenu(next)
  return next
}

export async function saveMakeupMenu(
  menu: MakeupMenu,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: 'Not configured.' }
  const normalized = normalizeMakeupMenu(menu)
  if (!normalized.items.length) {
    return { ok: false, message: 'Add at least one service or package.' }
  }
  for (const item of normalized.items) {
    if (!item.name.trim()) return { ok: false, message: 'Every item needs a name.' }
    if (!item.price.trim()) return { ok: false, message: 'Every item needs a price.' }
  }

  const payload = {
    items: normalized.items.map((item, i) => ({
      ...item,
      sortOrder: i,
    })),
  }

  const { error } = await getSupabase()
    .from('shop_settings')
    .update({
      makeup_menu: payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'default')

  if (error) {
    const msg = (error.message || '').toLowerCase()
    if (msg.includes('makeup_menu') || msg.includes('column')) {
      return {
        ok: false,
        message: 'Makeup menu column missing. Run migration 20260520180000_shop_makeup_menu.sql in the SQL Editor.',
      }
    }
    return { ok: false, message: 'Could not save makeup menu.' }
  }

  setMemoryMakeupMenu(normalizeMakeupMenu(payload))
  return { ok: true }
}

export function emptyMakeupMenuItem(category: MakeupMenuCategory): MakeupMenuItem {
  return {
    id: newId(),
    category,
    name: '',
    price: '',
    icon: category === 'photoshoot' ? 'photo_camera' : 'spa',
    duration: category === 'photoshoot' ? 'Photoshoot' : 'By appointment',
    desc: '',
    requiresLocation: category === 'makeup',
    highlight: category === 'makeup',
    sortOrder: 999,
  }
}

export function toBookableService(item: MakeupMenuItem): BookableServiceItem {
  return {
    name: item.name,
    price: item.price,
    icon: item.icon,
    duration: item.duration,
    desc: item.desc,
  }
}

export function makeupServices(menu: MakeupMenu): MakeupMenuItem[] {
  return menu.items.filter((i) => i.category === 'makeup')
}

export function photoshootServices(menu: MakeupMenu): MakeupMenuItem[] {
  return menu.items.filter((i) => i.category === 'photoshoot')
}

export function photoshootPackages(menu: MakeupMenu): { line: string; price: string }[] {
  return photoshootServices(menu).map((i) => ({ line: i.name, price: i.price }))
}

export function makeupHighlightTags(menu: MakeupMenu): string[] {
  const highlighted = makeupServices(menu).filter((i) => i.highlight)
  const list = highlighted.length ? highlighted : makeupServices(menu)
  return list.map((i) => i.name).slice(0, 6)
}

export function findMenuItemByName(menu: MakeupMenu, name: string): MakeupMenuItem | null {
  const t = name.trim()
  return menu.items.find((s) => s.name === t) ?? null
}
