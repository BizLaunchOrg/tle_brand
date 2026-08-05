import { getSupabase } from './supabaseClient'
import { isSupabaseConfigured } from './mapSupabaseAuthError'

const VISITOR_KEY_STORAGE = 'tle_visitor_id'
const LAST_PING_STORAGE = 'tle_visitor_last_ping_ms'
const PING_MIN_MS = 45_000

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function getOrCreateVisitorKey(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const existing = localStorage.getItem(VISITOR_KEY_STORAGE)?.trim()
    if (existing && UUID_RE.test(existing)) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(VISITOR_KEY_STORAGE, id)
    return id
  } catch {
    return null
  }
}

/** Record a storefront visit (skipped for /admin). Throttled to avoid spamming the API. */
export async function recordStoreVisit(path: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  if (typeof window === 'undefined') return
  if (path.startsWith('/admin')) return

  const visitorKey = getOrCreateVisitorKey()
  if (!visitorKey) return

  const now = Date.now()
  try {
    const last = Number(sessionStorage.getItem(LAST_PING_STORAGE) || 0)
    if (last && now - last < PING_MIN_MS) return
    sessionStorage.setItem(LAST_PING_STORAGE, String(now))
  } catch {
    /* sessionStorage unavailable — still try once */
  }

  await getSupabase().rpc('record_store_visit', {
    p_visitor_key: visitorKey,
    p_path: path.slice(0, 500),
  })
}
