export type ProductGender = 'her' | 'him'

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
  badge: string
  /** Shown in orange promo pill on the card when set */
  promo?: string
  name: string
  cat: string
  price: string
  /** Extra angles / lifestyle shots (detail gallery); first hero is always `img` */
  gallery?: string[]
  /** When set, buyer picks a finish; each option can have its own photos & price */
  colorOptions?: ProductColorOption[]
  /** Longer story for the product detail page */
  description: string
  /** Optional collection / SEO-style tags (e.g. EARRINGS, SET JEWELRY) */
  tags?: string[]
}

/** Unique cart line: same slug + different color = separate rows */
export function cartLineKey(slug: string, variantId?: string): string {
  return `${slug}::${variantId ?? 'default'}`
}

/** Image URLs for PDP / card previews when no color is selected */
export function getDefaultImageUrls(product: Product): string[] {
  const urls = [product.img, ...(product.gallery ?? [])]
  return urls.filter((u, i) => u && urls.indexOf(u) === i)
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
