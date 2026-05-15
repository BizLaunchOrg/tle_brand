import type { AdminOrderRow } from '../../lib/adminOrders.ts'
import { effectiveDeliveryStatus, orderIsOpenPipeline, orderIsSettledComplete } from '../../lib/adminOrderAnalytics.ts'
import { openHtmlPrintWindow } from '../../lib/openHtmlPrintWindow.ts'
import { PRINT_LOGO_CSS, printLogoImgHtml } from '../../lib/printBrandAssets.ts'
import { STORE_RECEIPT_NAME } from '../../lib/storeBrand.ts'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function formatNaira(n: number): string {
  return `₦${Math.round(n).toLocaleString()}`
}

export type StatementMeta = {
  /** Shown under the title, e.g. "Date: Last 7 days · Status: Completed" */
  subtitle: string
  /** Shown in footer */
  note?: string
}

export function buildStatementHtml(rows: AdminOrderRow[], meta: StatementMeta): string {
  const sorted = [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const totalNgn = sorted.reduce((a, o) => a + (Number(o.total_ngn) || 0), 0)
  const settled = sorted.filter((o) => orderIsSettledComplete(o)).reduce((a, o) => a + (Number(o.total_ngn) || 0), 0)
  const pipeline = sorted.filter((o) => orderIsOpenPipeline(o)).reduce((a, o) => a + (Number(o.total_ngn) || 0), 0)
  const generated = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

  const tableRows = sorted
    .map((o) => {
      const when = esc(new Date(o.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }))
      const ref = esc(o.id)
      const email = esc(o.email || '—')
      const amt = esc(formatNaira(Number(o.total_ngn) || 0))
      const st = esc(effectiveDeliveryStatus(o))
      return `<tr><td>${when}</td><td class="mono">${ref}</td><td>${email}</td><td class="num">${amt}</td><td><span class="pill">${st}</span></td></tr>`
    })
    .join('')

  const note = meta.note ? `<p class="foot">${esc(meta.note)}</p>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(STORE_RECEIPT_NAME)} — Transaction statement</title>
  <style>
    * { box-sizing: border-box; }
    @page { margin: 14mm; }
    body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #1c1917; margin: 0; padding: 24px 20px 40px; font-size: 13px; line-height: 1.45; }
    ${PRINT_LOGO_CSS}
    .bar { height: 4px; border-radius: 999px; background: linear-gradient(90deg, #059669, #34d399); margin-bottom: 20px; }
    h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 6px; }
    .sub { color: #57534e; font-size: 12px; margin: 0 0 18px; max-width: 640px; }
    .gen { font-size: 11px; color: #78716c; margin-bottom: 22px; }
    .stats { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 22px; }
    .stat { border: 1px solid #e7e5e4; border-radius: 12px; padding: 12px 16px; min-width: 140px; background: #fafaf9; }
    .stat label { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #78716c; margin-bottom: 4px; }
    .stat b { font-size: 17px; font-weight: 800; tabular-nums; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { text-align: left; padding: 10px 8px; background: #ecfdf5; color: #065f46; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 2px solid #a7f3d0; }
    td { padding: 9px 8px; border-bottom: 1px solid #e7e5e4; vertical-align: top; }
    tr:nth-child(even) td { background: #fafaf9; }
    .mono { font-family: ui-monospace, monospace; font-size: 10px; word-break: break-all; max-width: 200px; }
    .num { text-align: right; font-weight: 700; white-space: nowrap; }
    .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #f5f5f4; font-size: 10px; font-weight: 600; }
    .foot { margin-top: 28px; font-size: 10px; color: #a8a29e; }
    @media print {
      body { padding: 0; }
      .stat { break-inside: avoid; }
      tr { break-inside: avoid; }
    }
  </style>
</head>
<body>
  ${printLogoImgHtml(esc)}
  <div class="bar"></div>
  <h1>${esc(STORE_RECEIPT_NAME)} — Transaction statement</h1>
  <p class="sub">${esc(meta.subtitle)}</p>
  <p class="gen">Generated: ${esc(generated)}</p>
  <div class="stats">
    <div class="stat"><label>Transactions</label><b>${sorted.length}</b></div>
    <div class="stat"><label>Total (all listed)</label><b>${esc(formatNaira(totalNgn))}</b></div>
    <div class="stat"><label>Settled (completed)</label><b>${esc(formatNaira(settled))}</b></div>
    <div class="stat"><label>Pipeline (pending)</label><b>${esc(formatNaira(pipeline))}</b></div>
  </div>
  <table>
    <thead><tr><th>Date &amp; time</th><th>Reference</th><th>Customer</th><th>Amount</th><th>Delivery</th></tr></thead>
    <tbody>${tableRows || '<tr><td colspan="5">No transactions in this selection.</td></tr>'}</tbody>
  </table>
  ${note}
</body>
</html>`
}

export function printOrdersStatement(rows: AdminOrderRow[], meta: StatementMeta): boolean {
  return openHtmlPrintWindow(buildStatementHtml(rows, meta))
}
