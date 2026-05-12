export type ProductGender = 'her' | 'him' | 'unisex'

/** Finish / shade / color — drives gallery + optional price on the detail page */
export type ProductColorOption = {
  id: string
  label: string
  /** Swatch fill (hex or CSS color) */
  swatch: string
  /** Photos for this option; falls back to product default images when omitted */
  images?: string[]
  price?: string
}

export type Product = {
  /** URL segment for /product/:slug */
  slug: string
  gender: ProductGender
  /** Primary photo (cards, cart default) */
  img: string
  alt: string
  /** Optional short label (e.g. material). Prefer category + name for navigation. */
  badge?: string
  /** @deprecated Use compareAt + price for sale labels */
  promo?: string
  name: string
  cat: string
  /** Selling price shown to customers (SP) */
  price: string
  /** Cost price for margin tracking (CP), admin-only display */
  cp?: string
  /** “Was” price — when higher than `price`, storefront shows an automatic sale / % off */
  compareAt?: string
  /** Extra angles / lifestyle shots (detail gallery); first hero is always `img` */
  gallery?: string[]
  /** When set, buyer picks a finish; each option can have its own photos & price */
  colorOptions?: ProductColorOption[]
  /** Longer story for the product detail page */
  description: string
  /** Optional collection / SEO-style tags (e.g. EARRINGS, SET JEWELRY) */
  tags?: string[]
  /** Admin: hide from shop when false; omitted = visible */
  published?: boolean
  /** Admin: stock on hand (ignored when stockUnlimited) */
  stock?: number
  /** Admin: treat stock as unlimited on storefront / lists */
  stockUnlimited?: boolean
}

/**
 * Parse ₦-style amounts to integer naira.
 * Avoid stripping `.` then concatenating digits (e.g. "6000.00" → 600000).
 */
export function parseProductPriceNgn(price: string | number | undefined): number {
  if (price === null || price === undefined) return 0
  if (typeof price === 'number' && Number.isFinite(price)) return Math.round(price)
  let s = String(price).trim()
  if (!s) return 0
  s = s.replace(/₦/gi, '').replace(/\s/g, '').replace(/,/g, '')
  const n = Number(s)
  return Number.isFinite(n) ? Math.round(n) : 0
}

/** For her / for him lists include unisex pieces; the Unisex tab lists only pieces marked unisex. */
export function productMatchesGender(p: Product, filter: 'all' | ProductGender): boolean {
  if (filter === 'all') return true
  if (filter === 'unisex') return p.gender === 'unisex'
  if (p.gender === 'unisex') return filter === 'her' || filter === 'him'
  return p.gender === filter
}

/**
 * Orange card / PDP pill: auto % off from compareAt vs price, or legacy `promo` text.
 */
export function productSalePill(p: Product): string | null {
  const sale = parseProductPriceNgn(p.price)
  const was = parseProductPriceNgn(p.compareAt)
  if (was > sale && sale > 0) {
    const pct = Math.round((1 - sale / was) * 100)
    return pct > 0 ? `${pct}% off` : 'Sale'
  }
  const legacy = typeof p.promo === 'string' && p.promo.trim()
  return legacy ? legacy.trim() : null
}

/** Normalize stored image URLs for `<img src>` (relative paths, protocol-relative, blob previews). */
export function displayableImageUrl(raw: string | undefined): string {
  const u = typeof raw === 'string' ? raw.trim() : ''
  if (!u) return ''
  if (u.startsWith('blob:') || u.startsWith('data:')) return u
  if (/^https?:\/\//i.test(u)) return u
  if (u.startsWith('//')) return `https:${u}`

  const supabaseBase = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') ?? ''

  // Full storage path without origin (some snapshots only store the path part)
  if (supabaseBase && /^\/?storage\/v1\/object\/public\/product-media\//i.test(u)) {
    const path = u.replace(/^\/+/, '')
    return `${supabaseBase}/${path}`
  }
  if (u.startsWith('/') && typeof window !== 'undefined') return `${window.location.origin}${u}`
  // Bare storage path (some imports store without host)
  if (/^(storage\/v1\/|object\/public\/)/i.test(u)) {
    if (supabaseBase) return `${supabaseBase}/${u.replace(/^\//, '')}`
  }

  // Supabase Storage: catalog / orders often store only the object key under bucket `product-media`
  // (e.g. `uuid/1730000000000-abc12345.jpg` from admin uploads).
  if (
    supabaseBase &&
    !/^https?:\/\//i.test(u) &&
    !u.startsWith('//') &&
    !u.startsWith('data:') &&
    !u.startsWith('blob:')
  ) {
    const trimmed = u.replace(/^\//, '')
    const uuidDir =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\//i.test(trimmed) ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i.test(trimmed)
    if (uuidDir || trimmed.toLowerCase().startsWith('product-media/')) {
      const objectPath = trimmed.toLowerCase().startsWith('product-media/') ? trimmed.slice('product-media/'.length) : trimmed
      return `${supabaseBase}/storage/v1/object/public/product-media/${objectPath.replace(/^\//, '')}`
    }
  }

  return u
}

/** Unique cart line: same slug + different color = separate rows */
export function cartLineKey(slug: string, variantId?: string): string {
  return `${slug}::${variantId ?? 'default'}`
}

/** Image URLs for PDP / card previews when no color is selected */
export function getDefaultImageUrls(product: Product): string[] {
  const urls: string[] = []
  const push = (u: string | undefined) => {
    const t = typeof u === 'string' ? u.trim() : ''
    if (!t || urls.includes(t)) return
    urls.push(t)
  }
  push(product.img)
  for (const u of product.gallery ?? []) push(u)
  if (!urls.length) {
    for (const c of product.colorOptions ?? []) {
      for (const u of c.images ?? []) push(u)
    }
  }
  return urls
}

export function getActiveColorOption(product: Product, colorId: string | undefined): ProductColorOption | undefined {
  if (!product.colorOptions?.length || !colorId) return undefined
  return product.colorOptions.find((c) => c.id === colorId)
}

/** Full gallery for current color (or default) */
export function getGalleryUrls(product: Product, colorId?: string): string[] {
  const opt = getActiveColorOption(product, colorId)
  if (opt?.images?.length) return opt.images.filter((u, i, a) => a.indexOf(u) === i)
  return getDefaultImageUrls(product)
}

export function getDisplayPrice(product: Product, colorId?: string): string {
  const opt = getActiveColorOption(product, colorId)
  return opt?.price ?? product.price
}

/** First color/finish when quick-adding from grids (shop / landing cards) */
export function defaultVariantSelection(product: Product): { id: string; label: string } | undefined {
  const o = product.colorOptions?.[0]
  if (!o) return undefined
  return { id: o.id, label: o.label }
}

/**
 * Rich-text / pasted HTML descriptions (`<p>`, `&nbsp;`, etc.).
 * Strip tags and common entities so the PDP shows readable plain text.
 */
export function productDescriptionPlainText(raw: string): string {
  if (!raw || typeof raw !== 'string') return ''
  let s = raw.trim()
  if (!s) return ''
  if (!s.includes('<')) {
    return s.replace(/&nbsp;/gi, ' ').replace(/\s+\n/g, '\n').trim()
  }
  s = s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*p\s*>\s*/gi, '\n\n')
    .replace(/<\/\s*div\s*>\s*/gi, '\n')
    .replace(/<[^>]+>/g, '')
  return s
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .trim()
}

/** Fallback when `catalog_products` is empty or Supabase is off — demo items removed; catalog is the source of truth. */
export const PRODUCTS: Product[] = []

export function getProductBySlug(slug: string | undefined): Product | undefined {
  if (!slug) return undefined
  return PRODUCTS.find((p) => p.slug === slug)
}
