/**
 * Database Webhook target: INSERT on public.orders or public.makeup_bookings.
 * Configure in Supabase Dashboard → Database → Webhooks (HTTP POST, same URL for both tables).
 * Required headers: Content-Type: application/json, x-webhook-secret: <WEBHOOK_SECRET>
 *
 * Edge secrets (Dashboard → Project Settings → Edge Functions → Secrets):
 *   WEBHOOK_SECRET       — long random string; must match webhook header
 *   PUBLIC_APP_URL       — optional override; e.g. https://your-store.vercel.app (same as Admin → Account “Public site URL” in shop_settings.public_app_url)
 *   APP_URL / SITE_URL / STORE_URL / FRONTEND_URL — optional alternates if you prefer those names
 *   VAPID_SUBJECT        — e.g. mailto:you@yourdomain.com
 *   VAPID_PUBLIC_KEY     — same value as VITE_VAPID_PUBLIC_KEY in the frontend (generate: npm run vapid:keys)
 *   VAPID_PRIVATE_KEY    — from same command; never commit; Edge secret only
 *
 * SUPABASE_URL is provided automatically. Use service role via legacy SUPABASE_SERVICE_ROLE_KEY
 * or default entry in SUPABASE_SECRET_KEYS (JSON); the function supports both.
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

type SubRow = {
  id: string
  endpoint: string
  keys_p256dh: string
  keys_auth: string
}

function formatNgn(n: unknown): string {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v) || v < 0) return '—'
  return `₦${Math.round(v).toLocaleString('en-NG')}`
}

/** Title: price-first; body: product lines (truncated for OS limits). */
function buildOrderPushCopy(record: Record<string, unknown>): { title: string; body: string } {
  const total = formatNgn(record.total_ngn)
  const title = `New order · ${total}`

  const raw = record.line_items
  const items: unknown[] = Array.isArray(raw) ? raw : []
  const parts: string[] = []
  for (let i = 0; i < items.length && parts.length < 4; i++) {
    const o = items[i] as Record<string, unknown>
    const name = String(o.name ?? 'Item').trim() || 'Item'
    const q = Math.round(Number(o.quantity ?? 1)) || 1
    const vl = o.variantLabel != null ? String(o.variantLabel).trim() : ''
    const label = vl ? `${name} (${vl})` : name
    parts.push(`${label} ×${q}`)
  }
  let body = parts.join(' · ')
  if (items.length > 4) body += ` +${items.length - 4} more`
  if (!body) body = String(record.email ?? '').trim() || 'Order placed'
  if (body.length > 200) body = `${body.slice(0, 197)}…`
  return { title, body }
}

/** Supabase-hosted functions may expose only `SUPABASE_SECRET_KEYS` (JSON); legacy `SUPABASE_SERVICE_ROLE_KEY` still exists on some projects. */
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

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Logs disabled — avoid recording payloads or upstream error bodies. */
function logHook(_msg: string, _extra?: Record<string, unknown>) {}

/** HTTPS (or http://localhost) origin only — paths are stripped. */
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
  if (error) {
    logHook('public_url_db_error', { code: error.code })
    return null
  }
  if (!data) {
    logHook('public_url_db_empty', { reason: 'no default row' })
    return null
  }
  const raw = (data as { public_app_url?: string | null }).public_app_url
  const out = normalizePublicOrigin(raw)
  if (!out) {
    logHook('public_url_db_null', {
      reason: raw == null || String(raw).trim() === '' ? 'column_empty' : 'invalid_url',
    })
  }
  return out
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method' })

  const secret = Deno.env.get('WEBHOOK_SECRET')?.trim()
  const headerSecret = req.headers.get('x-webhook-secret')?.trim()
  if (!secret || secret !== headerSecret) {
    logHook('reject', { reason: 'bad_or_missing_x_webhook_secret' })
    return json(401, { ok: false, error: 'unauthorized' })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    logHook('reject', { reason: 'invalid_json' })
    return json(400, { ok: false, error: 'invalid json' })
  }

  const type = (body.type ?? body.eventType ?? body.event_type) as string | undefined
  const table = body.table as string | undefined
  const schema = body.schema as string | undefined
  const record = body.record as Record<string, unknown> | undefined

  if (schema !== 'public' || String(type || '').toUpperCase() !== 'INSERT' || !table || !record) {
    logHook('skipped', {
      reason: 'payload_shape',
      schema,
      type,
      table,
      hasRecord: Boolean(record),
    })
    return json(200, {
      ok: true,
      skipped: true,
      reason: 'payload_shape',
      got: { schema, type, table, hasRecord: Boolean(record) },
    })
  }

  logHook('insert_event', { table })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = getServiceRoleKey()
  if (!supabaseUrl || !serviceKey) {
    logHook('error', { reason: 'supabase_service_key' })
    return json(500, {
      ok: false,
      error: 'supabase_service_key',
      hint: 'Set SUPABASE_SERVICE_ROLE_KEY or ensure SUPABASE_SECRET_KEYS is available to Edge Functions.',
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  let publicUrl = resolvePublicAppUrlFromEnv()
  let publicSource: 'env' | 'database' | null = publicUrl ? 'env' : null
  if (!publicUrl) {
    publicUrl = await resolvePublicAppUrlFromDb(supabase)
    publicSource = publicUrl ? 'database' : null
  }

  if (!publicUrl) {
    logHook('error', {
      reason: 'public_app_url_missing',
      hint: 'Set Edge secret PUBLIC_APP_URL, or run migration shop_settings.public_app_url and save “Public site URL” in Admin → Account.',
    })
    return json(500, {
      ok: false,
      error: 'public_app_url_missing',
      hint:
        'Set PUBLIC_APP_URL (or APP_URL) in Edge Function secrets, or add column shop_settings.public_app_url via migration and save your live site URL in Admin → Account.',
    })
  }

  logHook('public_url', { publicUrlSource: publicSource })

  const vapidSubject = Deno.env.get('VAPID_SUBJECT')?.trim()
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')?.trim()
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')?.trim()
  if (!vapidSubject || !vapidPublic || !vapidPrivate) {
    const missing: string[] = []
    if (!vapidSubject) missing.push('VAPID_SUBJECT')
    if (!vapidPublic) missing.push('VAPID_PUBLIC_KEY')
    if (!vapidPrivate) missing.push('VAPID_PRIVATE_KEY')
    logHook('error', { reason: 'VAPID_* secrets not set', missing })
    return json(500, {
      ok: false,
      error: 'vapid_secrets_missing',
      missing,
      hint:
        'Supabase → Project Settings → Edge Functions → Secrets: add VAPID_SUBJECT (e.g. mailto:you@yourdomain.com), VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY. Run `npm run vapid:keys` in the repo, paste keys into Supabase, put the same public key in Vercel as VITE_VAPID_PUBLIC_KEY, redeploy the site, then re-enable Admin → Account notifications.',
    })
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  let title = 'TLE Brand'
  let notifBody = ''
  let openUrl = `${publicUrl}/admin`
  let tag = 'tle-admin'

  if (table === 'orders') {
    const id = String(record.id ?? '')
    if (!id) {
      logHook('skipped', { reason: 'no id', table })
      return json(200, { ok: true, skipped: true, reason: 'no id' })
    }
    const copy = buildOrderPushCopy(record)
    title = copy.title
    notifBody = copy.body
    openUrl = `${publicUrl}/admin/orders/${encodeURIComponent(id)}`
    tag = `order-${id}`
  } else if (table === 'makeup_bookings') {
    const id = String(record.id ?? '')
    if (!id) {
      logHook('skipped', { reason: 'no id', table })
      return json(200, { ok: true, skipped: true, reason: 'no id' })
    }
    const name = String(record.customer_name ?? 'Client')
    title = 'New makeup booking'
    notifBody = `${name} — ${String(record.service_name ?? 'Makeup')}`
    openUrl = `${publicUrl}/admin/makeup-bookings?open=${encodeURIComponent(id)}`
    tag = `makeup-${id}`
  } else {
    logHook('skipped', { reason: 'table', table })
    return json(200, { ok: true, skipped: true, reason: 'table' })
  }

  const iconUrl = `${publicUrl}/tlepic1.jpeg`
  const payload = JSON.stringify({ title, body: notifBody, url: openUrl, icon: iconUrl, tag })
  const { data: admins, error: adminErr } = await supabase.from('admin_users').select('user_id')
  if (adminErr || !admins?.length) {
    logHook('done', { sent: 0, note: adminErr?.message ?? 'no admin_users' })
    return json(200, { ok: true, sent: 0, note: 'no admin_users' })
  }

  const userIds = [...new Set(admins.map((a: { user_id: string }) => a.user_id))]
  const { data: subs, error: subErr } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, keys_p256dh, keys_auth')
    .in('user_id', userIds)

  if (subErr || !subs?.length) {
    logHook('done', {
      sent: 0,
      note: subErr?.message ?? 'no subscriptions',
      adminCount: userIds.length,
    })
    return json(200, { ok: true, sent: 0, note: subErr?.message ?? 'no subscriptions' })
  }

  let sent = 0
  let removed = 0
  const rows = subs as SubRow[]
  const failures: { statusCode: number; note: string }[] = []

  for (const row of rows) {
    const subscription = {
      endpoint: row.endpoint,
      keys: { p256dh: row.keys_p256dh, auth: row.keys_auth },
    }
    try {
      await webpush.sendNotification(subscription, payload, { TTL: 120 })
      sent += 1
    } catch (e: unknown) {
      const statusCode =
        typeof e === 'object' && e !== null && 'statusCode' in e ? (e as { statusCode: number }).statusCode : 0
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', row.id)
        removed += 1
      } else {
        const note =
          statusCode === 400
            ? 'stale_or_mismatched_subscription'
            : String(e).slice(0, 100)
        failures.push({ statusCode, note })
      }
    }
  }

  if (failures.length > 0) {
    logHook('push_failures', {
      failed: failures.length,
      targets: rows.length,
      sent,
      sample: failures.slice(0, 2),
      hint:
        'Each saved device/browser gets one send; 400 often means an old subscription (new VAPID keys, cleared site data). Turn notifications off/on on Admin → Account on that device.',
    })
  }

  logHook('done', { sent, removed, failed: failures.length, targets: rows.length })
  return json(200, { ok: true, sent, removed, failed: failures.length, targets: rows.length })
})
