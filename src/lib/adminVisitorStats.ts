import type { DateRangeFilter } from './adminOrderAnalytics.ts'
import { getSupabase } from './supabaseClient'
import { isSupabaseConfigured } from './mapSupabaseAuthError'

const STORE_TZ = 'Africa/Lagos'

export type VisitorStats = {
  uniqueVisitors: number
  pageViews: number
}

function lagosDateString(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: STORE_TZ })
}

function addDaysToDateString(dateStr: string, deltaDays: number): string {
  const [y, m, day] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, day))
  dt.setUTCDate(dt.getUTCDate() + deltaDays)
  return dt.toISOString().slice(0, 10)
}

/** Inclusive Lagos calendar dates for dashboard period tabs. */
export function visitorDateRange(filter: DateRangeFilter, now = new Date()): { from: string; to: string } {
  const to = lagosDateString(now)
  if (filter === 'today') return { from: to, to }
  if (filter === 'all') return { from: '2020-01-01', to }
  const span = filter === '7d' ? 7 : 30
  return { from: addDaysToDateString(to, -(span - 1)), to }
}

export async function fetchVisitorStatsForRange(filter: DateRangeFilter): Promise<VisitorStats> {
  if (!isSupabaseConfigured()) return { uniqueVisitors: 0, pageViews: 0 }

  const { from, to } = visitorDateRange(filter)
  const { data, error } = await getSupabase()
    .from('store_visitor_days')
    .select('page_views')
    .gte('visit_date', from)
    .lte('visit_date', to)

  if (error || !data) return { uniqueVisitors: 0, pageViews: 0 }

  let pageViews = 0
  for (const row of data) {
    pageViews += Number(row.page_views) || 0
  }
  return { uniqueVisitors: data.length, pageViews }
}
