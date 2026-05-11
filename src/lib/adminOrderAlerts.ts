import { getSupabase } from './supabaseClient'
import { isSupabaseConfigured } from './mapSupabaseAuthError'

const LS_KEY = 'tle_admin_orders_last_seen_at'

export function getAdminOrdersLastSeenAt(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(LS_KEY)
  } catch {
    return null
  }
}

/** Call when the merchant opens Orders, Transactions, or an order detail — clears “new” badges. */
export function markAdminOrdersSeenNow(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LS_KEY, new Date().toISOString())
  } catch {
    /* ignore */
  }
}

/** If never set, establish a baseline so the first visit does not show hundreds of historical orders. */
export function ensureAdminOrdersSeenBaseline(): void {
  if (typeof window === 'undefined') return
  try {
    if (!window.localStorage.getItem(LS_KEY)) {
      window.localStorage.setItem(LS_KEY, new Date().toISOString())
    }
  } catch {
    /* ignore */
  }
}

/** Orders with created_at strictly after the last “seen” timestamp (admin RLS). */
export async function countNewOrdersSince(iso: string): Promise<number> {
  if (!isSupabaseConfigured() || !iso.trim()) return 0
  const { count, error } = await getSupabase()
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .gt('created_at', iso)

  if (error) return 0
  return Math.min(99, count ?? 0)
}
