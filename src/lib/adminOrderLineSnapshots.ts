import { displayableImageUrl } from '../data/products.ts'

export function normalizeOrderLineItems(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

/** Resolve a product image URL from a persisted checkout line object. */
export function pickLineImageFromItem(o: Record<string, unknown>): string | undefined {
  const keys = ['image', 'img', 'photo', 'picture', 'thumbnail', 'imageUrl', 'thumbnailUrl', 'src'] as const
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  const images = o.images
  if (Array.isArray(images)) {
    for (const el of images) {
      if (typeof el === 'string' && el.trim()) return el.trim()
      if (el && typeof el === 'object' && 'url' in el) {
        const u = (el as { url: unknown }).url
        if (typeof u === 'string' && u.trim()) return u.trim()
      }
    }
  }
  return undefined
}

export function firstLineItemRawImageUrl(line_items: unknown): string | undefined {
  for (const item of normalizeOrderLineItems(line_items)) {
    if (!item || typeof item !== 'object') continue
    const u = pickLineImageFromItem(item as Record<string, unknown>)
    if (u) return u
  }
  return undefined
}

export function firstLineItemDisplayableImage(line_items: unknown): string {
  return displayableImageUrl(firstLineItemRawImageUrl(line_items))
}
