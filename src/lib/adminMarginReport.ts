import { openHtmlPrintWindow } from './openHtmlPrintWindow.ts'
import type { CatalogProductRow } from './adminCatalog'
import type { AdminOrderRow } from './adminOrders'
import { normalizeOrderLineItems } from './adminOrderLineSnapshots.ts'
import { parseProductPriceNgn, type Product } from '../data/products.ts'

export function aggregateSoldBySlug(orders: AdminOrderRow[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const o of orders) {
    const st = (o.status || '').toLowerCase()
    if (st === 'cancelled') continue
    for (const line of normalizeOrderLineItems(o.line_items)) {
      if (!line || typeof line !== 'object') continue
      const rec = line as Record<string, unknown>
      const slug = typeof rec.slug === 'string' ? rec.slug.trim() : ''
      if (!slug) continue
      const key = slug.toLowerCase()
      const q = Math.min(9999, Math.max(1, Math.floor(Number(rec.quantity)) || 1))
      map.set(key, (map.get(key) ?? 0) + q)
    }
  }
  return map
}

function formatNaira(n: number) {
  return `₦${Math.round(n).toLocaleString()}`
}

/** Opens a printable HTML report (use browser Print → Save as PDF). */
export function openProductMarginPrintReport(rows: CatalogProductRow[], orders: AdminOrderRow[]) {
  const soldBySlug = aggregateSoldBySlug(orders)
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const lines: string[] = []
  for (const row of rows) {
    const p = row.payload as Product
    const sold = soldBySlug.get(row.slug.trim().toLowerCase()) ?? 0
    const cp = parseProductPriceNgn(p.cp)
    const sp = parseProductPriceNgn(p.price)
    const stock =
      p.stockUnlimited === true ? 'Unlimited' : typeof p.stock === 'number' && Number.isFinite(p.stock) ? String(p.stock) : '—'
    const gainLine = sold > 0 && sp > 0 && cp >= 0 ? formatNaira((sp - cp) * sold) : '—'
    lines.push(
      `<tr><td>${esc(p.name || row.slug)}</td><td>${esc(row.slug)}</td><td class="n">${sold}</td><td class="n">${cp ? formatNaira(cp) : '—'}</td><td class="n">${sp ? formatNaira(sp) : '—'}</td><td>${stock}</td><td class="n">${gainLine}</td></tr>`,
    )
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>TLE product margin report</title>
<style>
body{font-family:system-ui,sans-serif;padding:24px;color:#111}
h1{font-size:18px}
p{color:#555;font-size:13px}
table{border-collapse:collapse;width:100%;margin-top:16px;font-size:12px}
th,td{border:1px solid #ccc;padding:8px;text-align:left}
th{background:#f4f4f4}
td.n{text-align:right;font-variant-numeric:tabular-nums}
@media print{body{padding:0}}
</style></head><body>
<h1>TLE-BRAND — product list &amp; margin (sold × (SP − CP))</h1>
<p>Printed ${new Date().toLocaleString()}. Totals exclude cancelled orders. Cost (CP) and sale (SP) use digits from stored amounts.</p>
<table><thead><tr><th>Product</th><th>Slug</th><th>Sold (units)</th><th>CP</th><th>SP</th><th>Stock left</th><th>Est. gain (sold)</th></tr></thead><tbody>
${lines.join('')}
</tbody></table>
</body></html>`

  openHtmlPrintWindow(html)
}
