/** Bookable offerings shown on the landing booking flow and makeup page. */
export type BookableServiceItem = {
  name: string
  price: string
  icon: string
  duration: string
  desc: string
}

export type MakeupMenuCategory = 'makeup' | 'photoshoot'

export type MakeupMenuItem = BookableServiceItem & {
  id: string
  category: MakeupMenuCategory
  /** Home / bridal style — customer should provide a venue. */
  requiresLocation: boolean
  /** Show in home “Glow-Up” highlight chips. */
  highlight: boolean
  sortOrder: number
}

/** Built-in defaults (used until admin saves a custom menu). */
export const DEFAULT_MAKEUP_MENU_ITEMS: MakeupMenuItem[] = [
  {
    id: 'default-studio',
    category: 'makeup',
    name: 'Studio Session',
    price: '₦35,000',
    icon: 'storefront',
    duration: 'By appointment',
    desc: 'Professional makeup at our studio.',
    requiresLocation: false,
    highlight: true,
    sortOrder: 0,
  },
  {
    id: 'default-home',
    category: 'makeup',
    name: 'Home Service',
    price: '₦50,000 and above',
    icon: 'home_pin',
    duration: 'By appointment',
    desc: 'We travel to you. Final price depends on your location.',
    requiresLocation: true,
    highlight: true,
    sortOrder: 1,
  },
  {
    id: 'default-bridal',
    category: 'makeup',
    name: 'Bridal',
    price: '₦100,000 and above',
    icon: 'favorite',
    duration: 'By appointment',
    desc: 'Bridal glam and touch-ups. Final price depends on your location.',
    requiresLocation: true,
    highlight: true,
    sortOrder: 2,
  },
  {
    id: 'default-ps-1',
    category: 'photoshoot',
    name: 'One outfit | 4 edited pictures',
    price: '₦50,000',
    icon: 'photo_camera',
    duration: 'Photoshoot',
    desc: 'Styled shoot with four professionally edited images.',
    requiresLocation: false,
    highlight: false,
    sortOrder: 3,
  },
  {
    id: 'default-ps-2',
    category: 'photoshoot',
    name: 'Two outfits | 8 edited pictures',
    price: '₦80,000',
    icon: 'photo_library',
    duration: 'Photoshoot',
    desc: 'Two looks, eight edited images.',
    requiresLocation: false,
    highlight: false,
    sortOrder: 4,
  },
  {
    id: 'default-ps-3',
    category: 'photoshoot',
    name: 'Three outfits | 12 edited pictures',
    price: '₦120,000',
    icon: 'collections',
    duration: 'Photoshoot',
    desc: 'Three looks, twelve edited images.',
    requiresLocation: false,
    highlight: false,
    sortOrder: 5,
  },
]

/** @deprecated Prefer useMakeupMenu().services — kept for fallbacks. */
export const BOOKABLE_SERVICES: BookableServiceItem[] = DEFAULT_MAKEUP_MENU_ITEMS.map(
  ({ name, price, icon, duration, desc }) => ({ name, price, icon, duration, desc }),
)

/** @deprecated Prefer useMakeupMenu().photoshootPackages */
export const PHOTOSHOOT_PACKAGES: { line: string; price: string }[] = DEFAULT_MAKEUP_MENU_ITEMS.filter(
  (i) => i.category === 'photoshoot',
).map((i) => ({ line: i.name, price: i.price }))

/** @deprecated Prefer useMakeupMenu().highlightTags */
export const MAKEUP_HIGHLIGHT_TAGS = DEFAULT_MAKEUP_MENU_ITEMS.filter((i) => i.highlight).map(
  (i) => i.name,
)

export function bookableServiceFromPhotoshootLine(
  line: string,
  items: BookableServiceItem[] = BOOKABLE_SERVICES,
): BookableServiceItem | null {
  const t = line.trim()
  return items.find((s) => s.name === t) ?? null
}

export function isPhotoshootService(
  name: string,
  items: Array<BookableServiceItem | MakeupMenuItem> = DEFAULT_MAKEUP_MENU_ITEMS,
): boolean {
  const s = items.find((x) => x.name === name)
  if (!s) return false
  if ('category' in s && s.category) return s.category === 'photoshoot'
  return s.duration === 'Photoshoot'
}

export function isStudioSessionService(name: string): boolean {
  return /studio/i.test(name.trim())
}

/** Home / bridal need a venue; studio and photoshoot packages do not. */
export function isLocationRequiredForService(
  name: string,
  items: MakeupMenuItem[] = DEFAULT_MAKEUP_MENU_ITEMS,
): boolean {
  const trimmed = name.trim()
  if (!trimmed) return false
  const found = items.find((x) => x.name === trimmed)
  if (found) return found.requiresLocation
  return !isStudioSessionService(trimmed) && !isPhotoshootService(trimmed, items)
}
