const LS = 'tle_admin_web_push_active'

/** True after a successful PushManager subscribe + DB upsert (used to avoid duplicate tab notifications). */
export function getAdminWebPushActive(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(LS) === '1'
  } catch {
    return false
  }
}

export function setAdminWebPushActive(on: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (on) window.localStorage.setItem(LS, '1')
    else window.localStorage.removeItem(LS)
  } catch {
    /* ignore */
  }
}
