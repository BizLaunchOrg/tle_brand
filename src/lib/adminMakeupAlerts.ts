import { getSupabase } from './supabaseClient'
import { isSupabaseConfigured } from './mapSupabaseAuthError'

const LS_KEY = 'tle_admin_makeup_bookings_last_seen_at'

export function getAdminMakeupBookingsLastSeenAt(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(LS_KEY)
  } catch {
    return null
  }
}

/** Call when the merchant opens Makeup requests (clears “new” badge for bookings). */
export function markAdminMakeupBookingsSeenNow(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LS_KEY, new Date().toISOString())
  } catch {
    /* ignore */
  }
}

export function ensureAdminMakeupBookingsSeenBaseline(): void {
  if (typeof window === 'undefined') return
  try {
    if (!window.localStorage.getItem(LS_KEY)) {
      window.localStorage.setItem(LS_KEY, new Date().toISOString())
    }
  } catch {
    /* ignore */
  }
}

export async function countNewMakeupBookingsSince(iso: string): Promise<number> {
  if (!isSupabaseConfigured() || !iso.trim()) return 0
  const { count, error } = await getSupabase()
    .from('makeup_bookings')
    .select('id', { count: 'exact', head: true })
    .gt('created_at', iso)

  if (error) return 0
  return Math.min(99, count ?? 0)
}

export async function fetchNewMakeupBookingIdsSince(iso: string): Promise<string[]> {
  if (!isSupabaseConfigured() || !iso.trim()) return []
  const { data, error } = await getSupabase()
    .from('makeup_bookings')
    .select('id')
    .gt('created_at', iso)
    .order('created_at', { ascending: false })
    .limit(15)

  if (error || !data) return []
  return data.map((r) => String((r as { id: string }).id))
}
