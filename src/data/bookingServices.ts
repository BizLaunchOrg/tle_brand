/** Bookable offerings shown on the landing booking flow and makeup page. */
export type BookableServiceItem = {
  name: string
  price: string
  icon: string
  duration: string
  desc: string
}

export const BOOKABLE_SERVICES: BookableServiceItem[] = [
  {
    name: 'Studio Session',
    price: '₦35,000',
    icon: 'storefront',
    duration: 'By appointment',
    desc: 'Professional makeup at our studio.',
  },
  {
    name: 'Home Service',
    price: '₦50,000 and above',
    icon: 'home_pin',
    duration: 'By appointment',
    desc: 'We travel to you. Final price depends on your location.',
  },
  {
    name: 'Bridal',
    price: '₦100,000 and above',
    icon: 'favorite',
    duration: 'By appointment',
    desc: 'Bridal glam and touch-ups. Final price depends on your location.',
  },
  {
    name: 'One outfit | 4 edited pictures',
    price: '₦50,000',
    icon: 'photo_camera',
    duration: 'Photoshoot',
    desc: 'Styled shoot with four professionally edited images.',
  },
  {
    name: 'Two outfits | 8 edited pictures',
    price: '₦80,000',
    icon: 'photo_library',
    duration: 'Photoshoot',
    desc: 'Two looks, eight edited images.',
  },
  {
    name: 'Three outfits | 12 edited pictures',
    price: '₦120,000',
    icon: 'collections',
    duration: 'Photoshoot',
    desc: 'Three looks, twelve edited images.',
  },
]

/** Photoshoot tier lines for promo blocks (matches booking packages). */
export const PHOTOSHOOT_PACKAGES: { line: string; price: string }[] = [
  { line: 'One outfit | 4 edited pictures', price: '₦50,000' },
  { line: 'Two outfits | 8 edited pictures', price: '₦80,000' },
  { line: 'Three outfits | 12 edited pictures', price: '₦120,000' },
]

export const MAKEUP_HIGHLIGHT_TAGS = ['Studio Session', 'Home Service', 'Bridal'] as const

export function bookableServiceFromPhotoshootLine(line: string): BookableServiceItem | null {
  const t = line.trim()
  return BOOKABLE_SERVICES.find((s) => s.name === t) ?? null
}

export function isPhotoshootService(name: string): boolean {
  const s = BOOKABLE_SERVICES.find((x) => x.name === name)
  return s?.duration === 'Photoshoot'
}
