import { getSupabase } from './supabaseClient'
import { isSupabaseConfigured } from './mapSupabaseAuthError'
import { setAdminWebPushActive } from './adminPushLocalFlag.ts'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function getVapidPublicKeyForPush(): string | null {
  const k = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim()
  return k || null
}

export function isPushApiSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

export async function registerAdminPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator) || typeof window === 'undefined') return null
  const base = import.meta.env.BASE_URL || '/'
  const withSlash = base.endsWith('/') ? base : `${base}/`
  const swPath = `${withSlash}sw.js`
  try {
    return await navigator.serviceWorker.register(swPath, { scope: withSlash })
  } catch {
    return null
  }
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushApiSupported()) return null
  const reg = await navigator.serviceWorker.ready.catch(() => null)
  if (!reg) return null
  return reg.pushManager.getSubscription()
}

export async function subscribeAdminPush(): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: 'unavailable' }
  if (!isPushApiSupported()) return { ok: false, message: 'unavailable' }

  const vapid = getVapidPublicKeyForPush()
  if (!vapid) return { ok: false, message: 'unavailable' }

  const { data: sessionData } = await getSupabase().auth.getSession()
  const user = sessionData.session?.user
  if (!user) return { ok: false, message: 'unavailable' }

  const reg = await registerAdminPushServiceWorker()
  if (!reg) return { ok: false, message: 'unavailable' }

  let perm = Notification.permission
  if (perm === 'default') {
    perm = await Notification.requestPermission()
  }
  if (perm !== 'granted') {
    return { ok: false, message: 'unavailable' }
  }

  const existing = await reg.pushManager.getSubscription()
  if (existing) {
    await existing.unsubscribe().catch(() => {})
  }

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
  })

  const json = sub.toJSON()
  const endpoint = json.endpoint
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!endpoint || !p256dh || !auth) {
    await sub.unsubscribe().catch(() => {})
    return { ok: false, message: 'unavailable' }
  }

  const { error } = await getSupabase().from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      keys_p256dh: p256dh,
      keys_auth: auth,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,endpoint' },
  )

  if (error) {
    await sub.unsubscribe().catch(() => {})
    return { ok: false, message: 'unavailable' }
  }

  setAdminWebPushActive(true)
  return { ok: true }
}

export async function unsubscribeAdminPush(): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: 'unavailable' }

  const { data: sessionData } = await getSupabase().auth.getSession()
  const user = sessionData.session?.user
  if (!user) {
    setAdminWebPushActive(false)
    return { ok: true }
  }

  const reg = await navigator.serviceWorker?.ready.catch(() => null)
  const sub = reg ? await reg.pushManager.getSubscription() : null
  const endpoint = sub?.endpoint
  if (sub) await sub.unsubscribe().catch(() => {})

  if (endpoint) {
    await getSupabase().from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint)
  } else {
    await getSupabase().from('push_subscriptions').delete().eq('user_id', user.id)
  }

  setAdminWebPushActive(false)
  return { ok: true }
}
export async function syncAdminWebPushLocalFromBrowser(): Promise<void> {
  if (!isPushApiSupported()) {
    setAdminWebPushActive(false)
    return
  }
  const sub = await getExistingPushSubscription()
  setAdminWebPushActive(!!sub)
}
