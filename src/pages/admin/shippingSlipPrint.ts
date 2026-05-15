import type { AdminOrderRow } from '../../lib/adminOrders.ts'
import { normalizeOrderLineItems } from '../../lib/adminOrderLineSnapshots.ts'
import { openHtmlPrintWindow } from '../../lib/openHtmlPrintWindow.ts'
import { PRINT_LOGO_CSS, printLogoImgHtml } from '../../lib/printBrandAssets.ts'
import { STORE_RECEIPT_NAME } from '../../lib/storeBrand.ts'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function orderRefShort(id: string): string {
  const compact = id.replace(/-/g, '')
  return compact.slice(0, 6).toUpperCase()
}

const SHIP_KEYS = ['fullName', 'phone', 'email', 'line1', 'line2', 'city', 'state', 'postalCode', 'country'] as const

function shipLine(ship: Record<string, unknown>, k: string): string {
  const v = ship[k]
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return ''
}

function buildShipToLines(ship: Record<string, unknown>): string[] {
  const lines: string[] = []
  for (const k of SHIP_KEYS) {
    const s = shipLine(ship, k)
    if (s) lines.push(s)
  }
  const opt = shipLine(ship, 'deliveryOptionLabel')
  if (opt) lines.push(`Option: ${opt}`)
  return lines
}

export function buildShippingSlipHtml(order: AdminOrderRow): string {
  const ship = order.shipping && typeof order.shipping === 'object' ? (order.shipping as Record<string, unknown>) : {}
  const addrLines = buildShipToLines(ship)
  const placed = new Date(order.created_at)
  const placedStr = esc(placed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }))
  const tag = orderRefShort(order.id)
  const st = esc((order.delivery_status || order.status || '—').trim() || '—')

  const items = normalizeOrderLineItems(order.line_items)
  const bodyRows = items
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return ''
      const o = raw as Record<string, unknown>
      const name = esc(String(o.name ?? 'Item').trim() || 'Item')
      const vlRaw = o.variantLabel != null ? String(o.variantLabel).trim() : ''
      const vl = vlRaw ? esc(vlRaw) : '—'
      const q = Math.min(999, Math.max(1, Math.floor(Number(o.quantity)) || 1))
      return `<tr><td>${name}</td><td>${vl}</td><td class="num">${q}</td></tr>`
    })
    .filter(Boolean)
    .join('')

  const addrHtml =
    addrLines.length > 0
      ? addrLines.map((l) => `<p class="addr-line">${esc(l)}</p>`).join('')
      : '<p class="addr-line muted">No address on file.</p>'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${esc(STORE_RECEIPT_NAME)} — Shipping slip #${tag}</title>
  <style>
    * { box-sizing: border-box; }
    @page { margin: 12mm; size: auto; }
    body {
      margin: 0;
      padding: 20px 18px 28px;
      font-family: "Open Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
      font-size: 13px;
      line-height: 1.45;
      color: #181818;
      background: #faf8f5;
    }
    .sheet {
      max-width: 640px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid rgba(24,24,24,0.1);
      border-radius: 2px;
      box-shadow: 0 1px 0 rgba(24,24,24,0.04);
      overflow: hidden;
    }
    .accent { height: 3px; background: #bf8f48; }
    .inner { padding: 22px 22px 26px; }
    ${PRINT_LOGO_CSS}
    .kicker {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #bf8f48;
      margin: 0 0 4px;
    }
    h1 {
      font-family: "Plus Jakarta Sans", system-ui, sans-serif;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin: 0 0 14px;
      color: #181818;
    }
    .meta {
      display: grid;
      gap: 6px 16px;
      font-size: 12px;
      color: #8a7e78;
      margin-bottom: 18px;
      grid-template-columns: 1fr 1fr;
    }
    .meta b { color: #181818; font-weight: 600; }
    .mono { font-family: ui-monospace, monospace; font-size: 11px; word-break: break-all; }
    .rule {
      border: none;
      border-top: 1px dashed rgba(24,24,24,0.12);
      margin: 16px 0;
    }
    h2 {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #8a7e78;
      margin: 0 0 8px;
    }
    .addr-line { margin: 0 0 3px; font-size: 13px; color: #181818; }
    .addr-line.muted { color: #8a7e78; }
    table.items {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .items th {
      text-align: left;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #8a7e78;
      padding: 8px 6px 8px 0;
      border-bottom: 1px solid rgba(24,24,24,0.12);
    }
    .items th.num { text-align: right; }
    .items td {
      padding: 10px 8px 10px 0;
      border-bottom: 1px dashed rgba(24,24,24,0.08);
      vertical-align: top;
    }
    .items td.num {
      text-align: right;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
    .items td.muted { color: #8a7e78; font-style: italic; }
    .foot {
      margin-top: 20px;
      padding-top: 14px;
      border-top: 1px solid rgba(24,24,24,0.08);
      font-size: 10px;
      color: #c4b8b2;
      text-align: center;
      line-height: 1.5;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { box-shadow: none; border: none; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="accent"></div>
    <div class="inner">
      ${printLogoImgHtml(esc)}
      <p class="kicker">${esc(STORE_RECEIPT_NAME)}</p>
      <h1>Packing &amp; shipping slip</h1>
      <div class="meta">
        <div><span>Order</span> · <b>#${esc(tag)}</b></div>
        <div><span>Delivery</span> · <b>${st}</b></div>
        <div><span>Placed</span> · <b>${placedStr}</b></div>
        <div><span>Reference</span> · <b class="mono">${esc(order.id)}</b></div>
      </div>

      <hr class="rule"/>
      <h2>Ship to</h2>
      ${addrHtml}

      <hr class="rule"/>
      <h2>Items to fulfil</h2>
      <table class="items">
        <thead><tr><th>Item</th><th>Finish / notes</th><th class="num">Qty</th></tr></thead>
        <tbody>${bodyRows || '<tr><td colspan="3" class="muted">No line items.</td></tr>'}</tbody>
      </table>

      <p class="foot">Internal shipping slip — prices are omitted. Do not share this document with the delivery rider.</p>
    </div>
  </div>
</body>
</html>`
}

export function printShippingSlip(order: AdminOrderRow): boolean {
  return openHtmlPrintWindow(buildShippingSlipHtml(order))
}

export function downloadShippingSlip(order: AdminOrderRow): void {
  const html = buildShippingSlipHtml(order)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${STORE_RECEIPT_NAME.toLowerCase().replace(/\s+/g, '-')}-slip-${order.id.slice(0, 8)}.html`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function buildSellerReceiptHtml(order: AdminOrderRow): string {
  const placed = new Date(order.created_at)
  const placedStr = esc(placed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }))
  const tag = orderRefShort(order.id)

  const items = normalizeOrderLineItems(order.line_items)
  const bodyRows = items
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return ''
      const o = raw as Record<string, unknown>
      const name = esc(String(o.name ?? 'Item').trim() || 'Item')
      const vlRaw = o.variantLabel != null ? String(o.variantLabel).trim() : ''
      const vl = vlRaw ? esc(vlRaw) : '—'
      const q = Math.min(999, Math.max(1, Math.floor(Number(o.quantity)) || 1))
      const priceStr = typeof o.price === 'string' ? o.price : typeof o.price === 'number' ? `₦${Math.round(o.price).toLocaleString()}` : '₦0'
      const price = Number(String(o.price).replace(/[^\d]/g, '')) || 0
      const lineTot = Math.round(price * q).toLocaleString()
      return `<tr><td>${name}</td><td>${vl}</td><td class="num">${q}</td><td class="num">₦${priceStr}</td><td class="num">₦${lineTot}</td></tr>`
    })
    .filter(Boolean)
    .join('')

  const formatNaira = (n: number): string => `₦${Math.round(n).toLocaleString()}`
  const sub = formatNaira(Number(order.subtotal_ngn) || 0)
  const salesVatN = Number(order.sales_vat_ngn) || 0
  const salesVatRow = salesVatN > 0 ? `<tr><td colspan="4" class="tot-l">VAT on products</td><td class="num">${esc(formatNaira(salesVatN))}</td></tr>` : ''
  const del = formatNaira(Number(order.delivery_ngn) || 0)
  const proc = formatNaira(Number(order.processing_ngn) || 0)
  const tot = formatNaira(Number(order.total_ngn) || 0)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${esc(STORE_RECEIPT_NAME)} — Receipt #${tag}</title>
  <style>
    ${PRINT_LOGO_CSS}
    * { box-sizing: border-box; }
    @page { margin: 12mm; }
    body {
      margin: 0;
      padding: 20px 18px 28px;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      font-size: 13px;
      line-height: 1.45;
      color: #181818;
      background: #faf8f5;
    }
    .sheet {
      max-width: 640px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid rgba(24,24,24,0.1);
      border-radius: 2px;
      box-shadow: 0 1px 0 rgba(24,24,24,0.04);
      overflow: hidden;
    }
    .accent { height: 3px; background: #bf8f48; }
    .inner { padding: 22px 22px 26px; }
    .kicker {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #bf8f48;
      margin: 0 0 4px;
    }
    h1 {
      font-family: "Plus Jakarta Sans", system-ui, sans-serif;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin: 0 0 14px;
      color: #181818;
    }
    .meta {
      display: grid;
      gap: 6px 16px;
      font-size: 12px;
      color: #8a7e78;
      margin-bottom: 18px;
      grid-template-columns: 1fr 1fr;
    }
    .meta b { color: #181818; font-weight: 600; }
    .rule {
      border: none;
      border-top: 1px dashed rgba(24,24,24,0.12);
      margin: 16px 0;
    }
    h2 {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #8a7e78;
      margin: 0 0 8px;
    }
    table.items {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .items th {
      text-align: left;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #8a7e78;
      padding: 8px 6px 8px 0;
      border-bottom: 1px solid rgba(24,24,24,0.12);
    }
    .items th.num { text-align: right; }
    .items td {
      padding: 10px 8px 10px 0;
      border-bottom: 1px dashed rgba(24,24,24,0.08);
      vertical-align: top;
    }
    .items td.num {
      text-align: right;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
    .totals {
      margin-top: 14px;
      font-size: 12px;
      color: #8a7e78;
    }
    .totals table { width: 100%; border-collapse: collapse; }
    .totals td { padding: 4px 0; }
    .totals .tot-l { color: #8a7e78; }
    .totals .num { text-align: right; font-weight: 600; color: #181818; font-variant-numeric: tabular-nums; }
    .totals .grand td { padding-top: 10px; border-top: 2px solid #181818; font-size: 14px; font-weight: 700; color: #181818; }
    .foot {
      margin-top: 20px;
      padding-top: 14px;
      border-top: 1px solid rgba(24,24,24,0.08);
      font-size: 10px;
      color: #c4b8b2;
      text-align: center;
      line-height: 1.5;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { box-shadow: none; border: none; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="accent"></div>
    <div class="inner">
      ${printLogoImgHtml(esc)}
      <p class="kicker">${esc(STORE_RECEIPT_NAME)}</p>
      <h1>Order receipt</h1>
      <div class="meta">
        <div><span>Order</span> · <b>#${esc(tag)}</b></div>
        <div><span>Placed</span> · <b>${placedStr}</b></div>
        <div><span>Reference</span> · <b class="mono">${esc(order.id)}</b></div>
        <div><span>Email</span> · <b>${esc(order.email || '—')}</b></div>
      </div>

      <hr class="rule"/>
      <h2>Items ordered</h2>
      <table class="items">
        <thead><tr><th>Item</th><th>Variant</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Total</th></tr></thead>
        <tbody>${bodyRows || '<tr><td colspan="5">No line items.</td></tr>'}</tbody>
      </table>

      <div class="totals">
        <table>
          <tr><td class="tot-l">Subtotal</td><td class="num">${esc(sub)}</td></tr>
          ${salesVatRow}
          <tr><td class="tot-l">Delivery</td><td class="num">${esc(del)}</td></tr>
          <tr><td class="tot-l">Processing & tax</td><td class="num">${esc(proc)}</td></tr>
          <tr class="grand"><td>Total received</td><td class="num">${esc(tot)}</td></tr>
        </table>
      </div>

      <p class="foot">Seller's copy — marks full order details and amounts.</p>
    </div>
  </div>
</body>
</html>`
}

export function downloadSellerReceipt(order: AdminOrderRow): void {
  const html = buildSellerReceiptHtml(order)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${STORE_RECEIPT_NAME.toLowerCase().replace(/\s+/g, '-')}-receipt-${order.id.slice(0, 8)}.html`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
