/**
 * Opt-in desktop / mobile browser notifications while the admin app is open (or in a background tab).
 *
 * True “push when the phone is locked” needs Web Push + a server (e.g. Supabase Edge Function) to send
 * notifications when rows are inserted — not included here; this layer still helps day-to-day when the
 * merchant keeps a pinned tab or home-screen shortcut open.
 */

const LS_ENABLED = 'tle_admin_browser_notify_enabled'

export function getAdminBrowserNotifyEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(LS_ENABLED) === '1'
  } catch {
    return false
  }
}

export function setAdminBrowserNotifyEnabled(on: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (on) window.localStorage.setItem(LS_ENABLED, '1')
    else window.localStorage.removeItem(LS_ENABLED)
  } catch {
    /* ignore */
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

export function canUseBrowserNotifications(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

const SS_NOTIFIED_ORDERS = 'tle_admin_notified_order_ids'
const SS_NOTIFIED_BOOKINGS = 'tle_admin_notified_booking_ids'

function readIdSet(key: string): Set<string> {
  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    return new Set(Array.isArray(arr) ? arr.map(String) : [])
  } catch {
    return new Set()
  }
}

function writeIdSet(key: string, ids: Set<string>) {
  try {
    const trimmed = [...ids].slice(-40)
    window.sessionStorage.setItem(key, JSON.stringify(trimmed))
  } catch {
    /* ignore */
  }
}

export function wasOrderAlreadyNotified(id: string): boolean {
  return readIdSet(SS_NOTIFIED_ORDERS).has(id)
}

export function markOrderNotified(id: string) {
  const s = readIdSet(SS_NOTIFIED_ORDERS)
  s.add(id)
  writeIdSet(SS_NOTIFIED_ORDERS, s)
}

export function wasBookingAlreadyNotified(id: string): boolean {
  return readIdSet(SS_NOTIFIED_BOOKINGS).has(id)
}

export function markBookingNotified(id: string) {
  const s = readIdSet(SS_NOTIFIED_BOOKINGS)
  s.add(id)
  writeIdSet(SS_NOTIFIED_BOOKINGS, s)
}

export function showOrderNotification(orderId: string, summary?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  const url = `${window.location.origin}/admin/orders/${encodeURIComponent(orderId)}`
  const n = new Notification('New order', {
    body: summary || 'Open to view details.',
    icon: '/tlepic1.jpeg',
    tag: `order-${orderId}`,
    data: { url },
  })
  n.onclick = () => {
    window.focus()
    window.location.assign(url)
    n.close()
  }
}

export function showMakeupBookingNotification(bookingId: string, summary?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  const url = `${window.location.origin}/admin/makeup-bookings?open=${encodeURIComponent(bookingId)}`
  const n = new Notification('New makeup booking', {
    body: summary || 'Open to review this request.',
    icon: '/tlepic1.jpeg',
    tag: `makeup-${bookingId}`,
    data: { url },
  })
  n.onclick = () => {
    window.focus()
    window.location.assign(url)
    n.close()
  }
}
