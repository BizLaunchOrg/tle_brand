import type { CatalogProductRow } from './adminCatalog'
import type { AdminOrderRow } from './adminOrders'

import type { Product } from '../data/products.ts'
import { parseProductPriceNgn } from '../data/products.ts'

/** Sum of (unit price × stock) using optional `stock` on each product; stock omitted counts as 0. */
export function computeInventoryValueNgn(rows: CatalogProductRow[]): number {
  let sum = 0
  for (const r of rows) {
    const p = r.payload as Product
    if (p.stockUnlimited === true) continue
    const unit = parseProductPriceNgn(p.price)
    const stock = typeof p.stock === 'number' && Number.isFinite(p.stock) ? Math.max(0, Math.floor(p.stock)) : 0
    sum += unit * stock
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

/** Rows with tracked stock at 0 (sold through or entered as 0). Omits unlimited and products with no stock field. */
export function countExplicitOutOfStock(rows: CatalogProductRow[]): number {
  return rows.filter((r) => {
    const p = r.payload as Product
    if (p.stockUnlimited === true) return false
    return typeof p.stock === 'number' && p.stock <= 0
  }).length
}

/** Stock column / label colouring: 0 red, 1–4 amber, 5+ green; unlimited / untracked neutral. Pair for `ad(theme, light, dark)`. */
export function adminStockAdClasses(p: Product): [string, string] {
  if (p.stockUnlimited === true) return ['text-stone-600', 'text-neutral-400']
  if (typeof p.stock !== 'number' || !Number.isFinite(p.stock)) return ['text-stone-500', 'text-neutral-500']
  const n = Math.floor(p.stock)
  if (n <= 0) return ['font-semibold text-red-600', 'font-semibold text-red-400']
  if (n < 5) return ['font-semibold text-amber-600', 'font-semibold text-amber-300']
  return ['font-semibold text-emerald-600', 'font-semibold text-emerald-400']
}
