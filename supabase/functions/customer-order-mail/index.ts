/**
 * Database Webhook → customer transactional email (Resend).
 *
 * Supabase Dashboard → Database → Webhooks (HTTP POST):
 *   Table: public.orders
 *   Events: INSERT, UPDATE
 *   URL: https://<project-ref>.supabase.co/functions/v1/customer-order-mail
 *   Headers: Content-Type: application/json, x-webhook-secret: <your secret>
 *
 * Edge secrets (Project Settings → Edge Functions → Secrets):
 *   ORDER_EMAIL_WEBHOOK_SECRET — required (or set WEBHOOK_SECRET to the same value for one shared secret)
 *   RESEND_API_KEY — required, from https://resend.com/api-keys
 *   RESEND_FROM — e.g. "TLE-BRAND <orders@yourdomain.com>" (domain must be verified in Resend)
 *   PUBLIC_APP_URL — optional; e.g. https://your-store.vercel.app (also reads APP_URL / SITE_URL / STORE_URL)
 *   If PUBLIC_APP_URL is unset, shop_settings.public_app_url is used (same as admin-push-hook).
 *
 * Behaviour:
 *   INSERT — sends two emails to orders.email: (1) order confirmed with line items, (2) processing notice.
 *   UPDATE — when status changes, sends one email describing the new fulfilment status.
 *
 * Deploy: supabase functions deploy customer-order-mail --no-verify-jwt
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

function log(_msg: string, _extra?: Record<string, unknown>) {
  /* intentionally quiet: do not log payloads or provider responses */
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function getWebhookSecret(): string | undefined {
  return (
    Deno.env.get('ORDER_EMAIL_WEBHOOK_SECRET')?.trim() ||
    Deno.env.get('WEBHOOK_SECRET')?.trim() ||
    undefined
  )
}

function getServiceRoleKey(): string | undefined {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()
  if (legacy) return legacy
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS')?.trim()
  if (!raw) return undefined
  try {
    const o = JSON.parse(raw) as Record<string, string>
    return o.default ?? o.service_role ?? Object.values(o).find((v) => typeof v === 'string' && v.length > 20)
  } catch {
    return undefined
  }
}

function normalizePublicOrigin(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== 'string') return null
  let s = raw.trim()
  if (!s) return null
  if (!/^https?:\/\//i.test(s)) {
    if (s.startsWith('//')) s = `https:${s}`
    else if (/^localhost\b|^127\./i.test(s)) s = `http://${s}`
    else s = `https://${s}`
  }
  try {
    const u = new URL(s)
    return `${u.protocol}//${u.host}`
  } catch {
    return null
  }
}

function resolvePublicAppUrlFromEnv(): string | null {
  const keys = ['PUBLIC_APP_URL', 'APP_URL', 'SITE_URL', 'STORE_URL', 'FRONTEND_URL'] as const
  for (const k of keys) {
    const v = normalizePublicOrigin(Deno.env.get(k))
    if (v) return v
  }
  return null
}

async function resolvePublicAppUrlFromDb(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase
    .from('shop_settings')
    .select('public_app_url')
    .eq('id', 'default')
    .maybeSingle()
  if (error || !data) return null
  const raw = (data as { public_app_url?: string | null }).public_app_url
  return normalizePublicOrigin(raw)
}

async function resolvePublicUrl(supabase: SupabaseClient): Promise<string | null> {
  let u = resolvePublicAppUrlFromEnv()
  if (u) return u
  u = await resolvePublicAppUrlFromDb(supabase)
  return u
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatNgn(n: unknown): string {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v) || v < 0) return '—'
  return `₦${Math.round(v).toLocaleString('en-NG')}`
}

function orderTag(id: unknown): string {
  const s = String(id ?? '').replace(/-/g, '')
  return s.length >= 8 ? s.slice(0, 8).toUpperCase() : (s.toUpperCase() || 'ORDER')
}

type LineItem = Record<string, unknown>

function lineItemsHtml(lineItems: unknown): string {
  const items: LineItem[] = Array.isArray(lineItems) ? (lineItems as LineItem[]) : []
  if (items.length === 0) {
    return '<p style="margin:0;color:#6b5f58;font-size:14px;">(No line items in this notification.)</p>'
  }
  const rows = items
    .map((o) => {
      const name = escapeHtml(String(o.name ?? 'Item').trim() || 'Item')
      const vl = o.variantLabel != null ? String(o.variantLabel).trim() : ''
      const variant = vl ? `<br/><span style="font-size:12px;color:#8a7e78;">${escapeHtml(vl)}</span>` : ''
      const q = Math.round(Number(o.quantity ?? 1)) || 1
      const price = parseProductLineTotal(o)
      return `<tr>
  <td style="padding:12px 8px;border-bottom:1px dashed #e8e2dc;font-size:14px;color:#181818;">${name}${variant}</td>
  <td style="padding:12px 8px;border-bottom:1px dashed #e8e2dc;text-align:center;font-size:14px;color:#6b5f58;">${q}</td>
  <td style="padding:12px 8px;border-bottom:1px dashed #e8e2dc;text-align:right;font-size:14px;font-weight:600;color:#181818;">${formatNgn(price)}</td>
</tr>`
    })
    .join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:8px;">
<thead><tr>
  <th align="left" style="padding:8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#8a7e78;border-bottom:1px solid #18181820;">Item</th>
  <th align="center" style="padding:8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#8a7e78;border-bottom:1px solid #18181820;">Qty</th>
  <th align="right" style="padding:8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#8a7e78;border-bottom:1px solid #18181820;">Line</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>`
}

function parseProductLineTotal(o: LineItem): number {
  const q = Math.round(Number(o.quantity ?? 1)) || 1
  const p = o.price
  if (typeof p === 'number' && Number.isFinite(p)) return p * q
  if (typeof p === 'string') {
    const n = Number(p.replace(/[^\d.]/g, ''))
    if (Number.isFinite(n)) return Math.round(n) * q
  }
  return 0
}

function shippingSnippet(record: Record<string, unknown>): string {
  const sh = record.shipping
  if (!sh || typeof sh !== 'object') return ''
  const o = sh as Record<string, unknown>
  const name = String(o.fullName ?? '').trim()
  const opt = String(o.deliveryOptionLabel ?? '').trim()
  const parts: string[] = []
  if (name) parts.push(`<strong>${escapeHtml(name)}</strong>`)
  if (opt) parts.push(`Option: ${escapeHtml(opt)}`)
  if (parts.length === 0) return ''
  return `<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#6b5f58;">${parts.join(' · ')}</p>`
}

function totalsBlock(record: Record<string, unknown>): string {
  const sub = formatNgn(record.subtotal_ngn)
  const salesVatN = Math.round(Number(record.sales_vat_ngn ?? 0)) || 0
  const salesVatRow =
    salesVatN > 0
      ? `<tr><td style="padding-top:6px;">VAT on products</td><td align="right" style="padding-top:6px;font-weight:600;color:#181818;">${formatNgn(salesVatN)}</td></tr>`
      : ''
  const del = formatNgn(record.delivery_ngn)
  const proc = formatNgn(record.processing_ngn)
  const tot = formatNgn(record.total_ngn)
  return `<table role="presentation" width="100%" style="margin-top:16px;font-size:14px;color:#6b5f58;">
<tr><td>Subtotal</td><td align="right" style="font-weight:600;color:#181818;">${sub}</td></tr>${salesVatRow}
<tr><td style="padding-top:6px;">Delivery / pickup</td><td align="right" style="padding-top:6px;font-weight:600;color:#181818;">${del}</td></tr>
<tr><td style="padding-top:6px;">Processing</td><td align="right" style="padding-top:6px;font-weight:600;color:#181818;">${proc}</td></tr>
<tr><td style="border-top:2px solid #181818;padding-top:12px;font-size:16px;font-weight:700;color:#181818;">Total</td><td align="right" style="border-top:2px solid #181818;padding-top:12px;font-size:16px;font-weight:700;color:#181818;">${tot}</td></tr>
</table>`
}

function shellHtml(inner: string, publicUrl: string | null, ctaLabel: string, footerNote?: string): string {
  const shop = publicUrl ? `${publicUrl}/shop` : null
  const cta = shop
    ? `<a href="${escapeHtml(shop)}" style="display:inline-block;margin-top:20px;padding:14px 28px;background:#181818;color:#fff;text-decoration:none;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">${ctaLabel}</a>`
    : ''
  const foot = footerNote ?? 'This message was sent because you placed an order on our store.'
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;background:#faf8f5;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #18181812;border-radius:16px;padding:28px 24px 32px;">
      <tr><td>${inner}${cta}<p style="margin:24px 0 0;font-size:11px;color:#c4b8b2;">TLE-BRAND · ${escapeHtml(foot)}</p></td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

function buildConfirmedEmail(record: Record<string, unknown>, publicUrl: string | null): { subject: string; html: string } {
  const tag = orderTag(record.id)
  const subject = `#${tag} CONFIRMED — Your order was placed successfully`
  const inner = `
<p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#bf8f48;">Order confirmed</p>
<h1 style="margin:0 0 12px;font-size:22px;color:#181818;">Thank you for your order</h1>
<p style="margin:0 0 20px;font-size:14px;line-height:1.55;color:#6b5f58;">Your payment and checkout completed successfully. Here is what you ordered. Order reference: <strong style="color:#181818;">${escapeHtml(String(record.id ?? ''))}</strong></p>
${shippingSnippet(record)}
${lineItemsHtml(record.line_items)}
${totalsBlock(record)}
`
  return { subject, html: shellHtml(inner, publicUrl, 'Continue shopping') }
}

function buildProcessingEmail(record: Record<string, unknown>, publicUrl: string | null): { subject: string; html: string } {
  const tag = orderTag(record.id)
  const subject = `#${tag} — Your order is being processed`
  const inner = `
<p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#bf8f48;">Processing</p>
<h1 style="margin:0 0 12px;font-size:22px;color:#181818;">We're on it</h1>
<p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#6b5f58;">Your order <strong style="color:#181818;">#${escapeHtml(tag)}</strong> is now being processed. We'll keep you updated when the status changes.</p>
<p style="margin:0;font-size:13px;color:#8a7e78;">You will receive another email when your order moves to the next stage (for example shipped or ready for pickup).</p>
`
  return { subject, html: shellHtml(inner, publicUrl, 'Visit the shop') }
}

function statusCopy(newStatus: string): { headline: string; body: string } {
  const s = newStatus.toLowerCase().trim()
  const map: Record<string, { headline: string; body: string }> = {
    pending: {
      headline: 'Order pending',
      body: 'Your order is pending review. We will update you shortly.',
    },
    processing: {
      headline: 'Processing',
      body: 'Your order is being prepared. Thank you for your patience.',
    },
    paid: {
      headline: 'Payment received',
      body: 'We have recorded payment for your order and are preparing the next steps.',
    },
    shipped: {
      headline: 'On the way',
      body: 'Your order has been shipped or handed to the courier. Watch for delivery updates.',
    },
    delivered: {
      headline: 'Delivered',
      body: 'Your order has been marked as delivered. We hope you love it.',
    },
    completed: {
      headline: 'Completed',
      body: 'Your order is complete. Thank you for shopping with us.',
    },
    cancelled: {
      headline: 'Order cancelled',
      body: 'This order has been cancelled. If you did not request this, please reply to this email or contact us.',
    },
  }
  return (
    map[s] ?? {
      headline: 'Order updated',
      body: `Your order status is now: ${escapeHtml(newStatus)}.`,
    }
  )
}

function buildStatusEmail(
  record: Record<string, unknown>,
  publicUrl: string | null,
  oldStatus: string,
  newStatus: string,
): { subject: string; html: string } {
  const tag = orderTag(record.id)
  const copy = statusCopy(newStatus)
  const subject = `#${tag} UPDATE — ${copy.headline}`
  const inner = `
<p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#bf8f48;">Status update</p>
<h1 style="margin:0 0 12px;font-size:22px;color:#181818;">${copy.headline}</h1>
<p style="margin:0 0 8px;font-size:14px;line-height:1.55;color:#6b5f58;">${copy.body}</p>
<p style="margin:12px 0 0;font-size:12px;color:#8a7e78;">Previous: <strong style="color:#181818;">${escapeHtml(oldStatus)}</strong> → Now: <strong style="color:#181818;">${escapeHtml(newStatus)}</strong></p>
${lineItemsHtml(record.line_items)}
${totalsBlock(record)}
`
  return { subject, html: shellHtml(inner, publicUrl, 'View the shop', 'Order status update from our store.') }
}

async function sendResend(to: string, subject: string, html: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = Deno.env.get('RESEND_API_KEY')?.trim()
  const from = Deno.env.get('RESEND_FROM')?.trim() ?? 'TLE-BRAND <onboarding@resend.dev>'
  if (!key) return { ok: false, error: 'RESEND_API_KEY not set' }

  const replyTo = Deno.env.get('RESEND_REPLY_TO')?.trim()

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  })

  const text = await res.text()
  if (!res.ok) {
    return { ok: false, error: text.slice(0, 500) || String(res.status) }
  }
  return { ok: true }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method' })

  const expected = getWebhookSecret()
  const headerSecret = req.headers.get('x-webhook-secret')?.trim()
  if (!expected || expected !== headerSecret) {
    log('reject', { reason: 'bad_or_missing_x_webhook_secret' })
    return json(401, { ok: false, error: 'unauthorized' })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return json(400, { ok: false, error: 'invalid json' })
  }

  const type = String(body.type ?? body.eventType ?? body.event_type ?? '').toUpperCase()
  const table = body.table as string | undefined
  const schema = body.schema as string | undefined
  const record = body.record as Record<string, unknown> | undefined
  const oldRecord = body.old_record as Record<string, unknown> | undefined

  if (schema !== 'public' || table !== 'orders' || !record) {
    log('skipped', { reason: 'payload_shape', schema, table, type })
    return json(200, { ok: true, skipped: true, reason: 'payload_shape' })
  }

  const to = String(record.email ?? '').trim()
  if (!to || !to.includes('@')) {
    log('skipped', { reason: 'bad_email' })
    return json(200, { ok: true, skipped: true, reason: 'bad_email' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = getServiceRoleKey()
  if (!supabaseUrl || !serviceKey) {
    log('error', { reason: 'supabase_service_key' })
    return json(500, { ok: false, error: 'supabase_service_key' })
  }
  const supabase = createClient(supabaseUrl, serviceKey)
  const publicUrl = await resolvePublicUrl(supabase)

  if (type === 'INSERT') {
    const a = buildConfirmedEmail(record, publicUrl)
    const r1 = await sendResend(to, a.subject, a.html)
    if (!r1.ok) {
      log('send_failed', { step: 'confirmed', error: r1.error })
      return json(502, { ok: false, step: 'confirmed', error: r1.error })
    }
    const b = buildProcessingEmail(record, publicUrl)
    const r2 = await sendResend(to, b.subject, b.html)
    if (!r2.ok) {
      log('send_failed', { step: 'processing', error: r2.error, note: 'confirmed_already_sent' })
      return json(502, { ok: false, step: 'processing', error: r2.error })
    }
    log('done', { event: 'insert', to, sent: 2 })
    return json(200, { ok: true, sent: 2, event: 'insert' })
  }

  if (type === 'UPDATE') {
    const newStatus = String(record.status ?? '').trim()
    const oldStatus = String(oldRecord?.status ?? '').trim()
    if (!newStatus || newStatus.toLowerCase() === oldStatus.toLowerCase()) {
      log('skipped', { reason: 'status_unchanged', oldStatus, newStatus })
      return json(200, { ok: true, skipped: true, reason: 'status_unchanged' })
    }
    // Avoid a third redundant mail when moving paid → processing (already emailed "processing" on insert).
    const skipRedundantProcessing =
      oldStatus.toLowerCase() === 'paid' && newStatus.toLowerCase() === 'processing'
    if (skipRedundantProcessing) {
      log('skipped', { reason: 'redundant_paid_to_processing' })
      return json(200, { ok: true, skipped: true, reason: 'redundant_paid_to_processing' })
    }
    const mail = buildStatusEmail(record, publicUrl, oldStatus, newStatus)
    const r = await sendResend(to, mail.subject, mail.html)
    if (!r.ok) {
      log('send_failed', { step: 'status', error: r.error })
      return json(502, { ok: false, step: 'status', error: r.error })
    }
    log('done', { event: 'update', to, oldStatus, newStatus })
    return json(200, { ok: true, sent: 1, event: 'update' })
  }

  log('skipped', { reason: 'type', type })
  return json(200, { ok: true, skipped: true, reason: 'type', type })
})
