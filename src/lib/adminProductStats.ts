import type { CatalogProductRow } from './adminCatalog'
import type { AdminOrderRow } from './adminOrders'

import type { Product } from '../data/products.ts'
import {
  isProductManuallyArchived,
  isProductOutOfStock,
  isProductSoldThrough,
  parseProductPriceNgn,
  productUsesVariantStock,
} from '../data/products.ts'

/** Sum of (unit price × stock) using optional `stock` on each product; stock omitted counts as 0. */
export function computeInventoryValueNgn(rows: CatalogProductRow[]): number {
  let sum = 0
  for (const r of rows) {
    const p = r.payload as Product
    if (p.stockUnlimited === true) continue
    const unit = parseProductPriceNgn(p.price)
    if (productUsesVariantStock(p)) {
      for (const o of p.colorOptions ?? []) {
        const stock = typeof o.stock === 'number' && Number.isFinite(o.stock) ? Math.max(0, Math.floor(o.stock)) : 0
        const optPrice = o.price ? parseProductPriceNgn(o.price) : unit
        sum += optPrice * stock
      }
    } else {
      const stock = typeof p.stock === 'number' && Number.isFinite(p.stock) ? Math.max(0, Math.floor(p.stock)) : 0
      sum += unit * stock
    }
  }
  return sum
}

/** Total line-item units across all orders (rough “products touched” / volume). */
export function computeSoldUnitsFromOrders(orders: AdminOrderRow[]): number {
  let n = 0
  for (const o of orders) {
    const raw = o.line_items
    if (!Array.isArray(raw)) continue
    for (const line of raw) {
      if (!line || typeof line !== 'object') continue
      const q = (line as { quantity?: unknown }).quantity
      n += Math.min(999, Math.max(1, Math.floor(Number(q)) || 1))
    }
  }
  return n
}

/** Seller set stock to 0 (Archive tab). */
export function countManuallyArchived(rows: CatalogProductRow[]): number {
  return rows.filter((r) => isProductManuallyArchived(r.payload as Product)).length
}

/** Sold through to 0 from orders (Sold out tab). */
export function countSoldThrough(rows: CatalogProductRow[]): number {
  return rows.filter((r) => {
    const p = r.payload as Product
    return isProductSoldThrough(p) && isProductOutOfStock(p)
  }).length
}

/** Stock column / label colouring: 0 red, 1–4 amber, 5+ green; unlimited / untracked neutral. Pair for `ad(theme, light, dark)`. */
export function adminStockAdClasses(p: Product): [string, string] {
  if (p.stockUnlimited === true) return ['text-stone-600', 'text-neutral-400']
  let n: number | null = null
  if (productUsesVariantStock(p)) {
    const nums = (p.colorOptions ?? [])
      .map((o) => (typeof o.stock === 'number' && Number.isFinite(o.stock) ? Math.floor(o.stock) : null))
      .filter((x): x is number => x !== null)
    if (nums.length) n = Math.min(...nums)
  } else if (typeof p.stock === 'number' && Number.isFinite(p.stock)) {
    n = Math.floor(p.stock)
  }
  if (n === null) return ['text-stone-500', 'text-neutral-500']
  if (n <= 0) return ['font-semibold text-red-600', 'font-semibold text-red-400']
  if (n < 5) return ['font-semibold text-amber-600', 'font-semibold text-amber-300']
  return ['font-semibold text-emerald-600', 'font-semibold text-emerald-400']
}
