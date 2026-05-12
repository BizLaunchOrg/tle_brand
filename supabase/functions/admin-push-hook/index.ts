/**
 * Database Webhook target: INSERT on public.orders or public.makeup_bookings.
 * Configure in Supabase Dashboard → Database → Webhooks (HTTP POST, same URL for both tables).
 * Required headers: Content-Type: application/json, x-webhook-secret: <WEBHOOK_SECRET>
 *
 * Edge secrets (Dashboard → Project Settings → Edge Functions → Secrets):
 *   WEBHOOK_SECRET       — long random string; must match webhook header
 *   PUBLIC_APP_URL       — e.g. https://your-store.vercel.app (no trailing slash)
 *   VAPID_SUBJECT        — e.g. mailto:you@yourdomain.com
 *   VAPID_PUBLIC_KEY     — same value as VITE_VAPID_PUBLIC_KEY in the frontend
 *   VAPID_PRIVATE_KEY    — keep secret; generate with: npx web-push generate-vapid-keys
 *
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

type SubRow = {
  id: string
  endpoint: string
  keys_p256dh: string
  keys_auth: string
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method' })

  const secret = Deno.env.get('WEBHOOK_SECRET')?.trim()
  const sent = req.headers.get('x-webhook-secret')?.trim()
  if (!secret || secret !== sent) return json(401, { ok: false, error: 'unauthorized' })

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return json(400, { ok: false, error: 'invalid json' })
  }

  const type = (body.type ?? body.eventType) as string | undefined
  const table = body.table as string | undefined
  const schema = body.schema as string | undefined
  const record = body.record as Record<string, unknown> | undefined

  if (schema !== 'public' || String(type || '').toUpperCase() !== 'INSERT' || !table || !record) {
    return json(200, { ok: true, skipped: true })
  }

  const publicUrl = (Deno.env.get('PUBLIC_APP_URL') ?? '').trim().replace(/\/$/, '')
  if (!publicUrl) return json(500, { ok: false, error: 'PUBLIC_APP_URL not set' })

  const vapidSubject = Deno.env.get('VAPID_SUBJECT')?.trim()
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')?.trim()
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')?.trim()
  if (!vapidSubject || !vapidPublic || !vapidPrivate) {
    return json(500, { ok: false, error: 'VAPID_* secrets not set' })
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  let title = 'TLE Brand'
  let notifBody = ''
  let openUrl = `${publicUrl}/admin`
  let tag = 'tle-admin'

  if (table === 'orders') {
    const id = String(record.id ?? '')
    if (!id) return json(200, { ok: true, skipped: true, reason: 'no id' })
    title = 'New order'
    notifBody = String(record.email ?? 'New checkout')
    openUrl = `${publicUrl}/admin/orders/${encodeURIComponent(id)}`
    tag = `order-${id}`
  } else if (table === 'makeup_bookings') {
    const id = String(record.id ?? '')
    if (!id) return json(200, { ok: true, skipped: true, reason: 'no id' })
    const name = String(record.customer_name ?? 'Client')
    title = 'New makeup booking'
    notifBody = `${name} — ${String(record.service_name ?? 'Makeup')}`
    openUrl = `${publicUrl}/admin/makeup-bookings?open=${encodeURIComponent(id)}`
    tag = `makeup-${id}`
  } else {
    return json(200, { ok: true, skipped: true, reason: 'table' })
  }

  const iconUrl = `${publicUrl}/tlepic1.jpeg`
  const payload = JSON.stringify({ title, body: notifBody, url: openUrl, icon: iconUrl, tag })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return json(500, { ok: false, error: 'supabase env' })

  const supabase = createClient(supabaseUrl, serviceKey)
  const { data: admins, error: adminErr } = await supabase.from('admin_users').select('user_id')
  if (adminErr || !admins?.length) {
    return json(200, { ok: true, sent: 0, note: 'no admin_users' })
  }

  const userIds = [...new Set(admins.map((a: { user_id: string }) => a.user_id))]
  const { data: subs, error: subErr } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, keys_p256dh, keys_auth')
    .in('user_id', userIds)

  if (subErr || !subs?.length) {
    return json(200, { ok: true, sent: 0, note: subErr?.message ?? 'no subscriptions' })
  }

  let sent = 0
  let removed = 0
  const rows = subs as SubRow[]

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
        console.error('push failed', statusCode, e)
      }
    }
  }

  return json(200, { ok: true, sent, removed, targets: rows.length })
})
