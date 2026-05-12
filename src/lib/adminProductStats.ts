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

/** Rows with explicit stock ≤ 0 (does not count rows with no stock field). Unlimited stock is never OOS. */
export function countExplicitOutOfStock(rows: CatalogProductRow[]): number {
  return rows.filter((r) => {
    const p = r.payload as Product
    if (p.stockUnlimited === true) return false
    return typeof p.stock === 'number' && p.stock <= 0
  }).length
}
