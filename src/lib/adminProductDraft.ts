import {
  formatProductPriceLabel,
  parseProductPriceNgn,
  type Product,
  type ProductColorOption,
} from '../data/products.ts'
import { ad } from '../pages/admin/adminUi.ts'

export type ColorDraft = {
  id: string
  label: string
  swatch: string
  price: string
  stock: string
  imagesText: string
}

export function adminFieldBox(theme: 'light' | 'dark') {
  return ad(
    theme,
    'mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[13px] text-stone-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
    'mt-1 w-full rounded-xl border border-neutral-600 bg-neutral-950 px-3 py-2.5 text-[13px] text-neutral-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25',
  )
}

export function slugFromProductName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** #RGB or #RRGGBB for HTML colour picker (requires 6-digit hex). */
export function swatchForColorInput(hex: string): string {
  const raw = hex.trim()
  if (!raw) return '#cccccc'
  let s = raw.startsWith('#') ? raw.slice(1) : raw
  if (!/^[0-9a-f]+$/i.test(s)) return '#cccccc'
  if (s.length === 3) s = `${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`
  if (s.length !== 6) return '#cccccc'
  return `#${s.toLowerCase()}`
}

export function nextColorOptionId(existing: ColorDraft[]): string {
  const tail = Date.now().toString().slice(-7)
  const id = `lady-v-${tail}`
  return existing.some((x) => x.id === id) ? `${id}-${existing.length}` : id
}

export function emptyProduct(): Product {
  return {
    slug: '',
    gender: 'her',
    img: '',
    alt: '',
    name: '',
    cat: '',
    price: '',
    description: '',
    published: true,
    stockUnlimited: false,
  }
}

export function colorsFromProduct(p: Product): ColorDraft[] {
  if (!p.colorOptions?.length) return []
  return p.colorOptions.map((c) => ({
    id: c.id,
    label: c.label,
    swatch: c.swatch,
    price: c.price ?? '',
    stock: typeof c.stock === 'number' ? String(c.stock) : '',
    imagesText: (c.images ?? []).join('\n'),
  }))
}

export function productFromDraft(
  core: Product,
  galleryText: string,
  tagsText: string,
  colors: ColorDraft[],
): Product {
  const gallery = galleryText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  const tags = tagsText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const colorOptions: ProductColorOption[] = []
  for (const c of colors) {
    if (!c.id.trim() || !c.label.trim() || !c.swatch.trim()) continue
    const opt: ProductColorOption = {
      id: c.id.trim(),
      label: c.label.trim(),
      swatch: c.swatch.trim(),
    }
    const imgs = c.imagesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    if (imgs.length) opt.images = imgs
    if (c.price.trim()) {
      const optRaw = c.price.trim()
      const optN = parseProductPriceNgn(optRaw)
      opt.price = optN > 0 ? formatProductPriceLabel(optRaw) : optRaw
    }
    const optStockRaw = c.stock.trim()
    if (optStockRaw !== '') {
      const optStock = Math.max(0, Math.floor(Number(optStockRaw)) || 0)
      opt.stock = optStock
      if (optStock === 0) {
        opt.manualStockZero = true
        delete opt.stockDepletedAt
      } else {
        delete opt.manualStockZero
        delete opt.stockDepletedAt
      }
    }
    colorOptions.push(opt)
  }

  const priceTrim = core.price.trim()
  const priceN = parseProductPriceNgn(priceTrim)

  const p: Product = {
    ...core,
    slug: core.slug.trim().replace(/\s+/g, '-'),
    price: priceN > 0 ? formatProductPriceLabel(priceTrim) : priceTrim,
    gallery: gallery.length ? gallery : undefined,
    tags: tags.length ? tags : undefined,
    colorOptions: colorOptions.length ? colorOptions : undefined,
  }
  const cpTrim = core.cp?.trim() ?? ''
  if (cpTrim) {
    const cpN = parseProductPriceNgn(cpTrim)
    ;(p as Product).cp = cpN > 0 ? formatProductPriceLabel(cpTrim) : cpTrim
  } else delete (p as { cp?: string }).cp

  const compareRaw = typeof core.compareAt === 'string' ? core.compareAt.trim() : ''
  const saleN = parseProductPriceNgn(p.price)
  const compN = parseProductPriceNgn(compareRaw)
  if (compareRaw && compN > saleN && saleN > 0) {
    ;(p as Product).compareAt = compN > 0 ? formatProductPriceLabel(compareRaw) : compareRaw
  } else delete (p as { compareAt?: string }).compareAt

  delete (p as { promo?: string }).promo
  if (core.badge?.trim()) (p as Product).badge = core.badge.trim()
  else delete (p as { badge?: string }).badge

  if (core.stockUnlimited === true) {
    ;(p as Product).stockUnlimited = true
    delete (p as { stock?: number }).stock
    delete (p as { manualStockZero?: boolean }).manualStockZero
    delete (p as { stockDepletedAt?: string }).stockDepletedAt
  } else {
    delete (p as { stockUnlimited?: boolean }).stockUnlimited
    if (typeof core.stock === 'number' && Number.isFinite(core.stock) && core.stock >= 0) {
      const n = Math.floor(core.stock)
      ;(p as Product).stock = n
      if (n === 0) {
        ;(p as Product).manualStockZero = true
        delete (p as { stockDepletedAt?: string }).stockDepletedAt
      } else {
        delete (p as { manualStockZero?: boolean }).manualStockZero
        delete (p as { stockDepletedAt?: string }).stockDepletedAt
      }
    } else {
      delete (p as { stock?: number }).stock
      delete (p as { manualStockZero?: boolean }).manualStockZero
    }
  }
  if (p.published !== false) delete (p as { published?: boolean }).published
  else (p as Product).published = false
  return p
}
