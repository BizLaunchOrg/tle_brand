import type { AdminOrderRow } from './adminOrders'

export type DateRangeFilter = 'today' | '7d' | '30d' | 'all'

const startOfLocalDay = (d: Date) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function orderCreatedAt(o: AdminOrderRow): Date {
  return new Date(o.created_at)
}

export function isInDateRange(o: AdminOrderRow, filter: DateRangeFilter, now = new Date()): boolean {
  if (filter === 'all') return true
  const t = orderCreatedAt(o).getTime()
  const start = startOfLocalDay(now).getTime()
  if (filter === 'today') return t >= start
  const days = filter === '7d' ? 7 : 30
  const cutoff = start - (days - 1) * 86400000
  return t >= cutoff
}

export function isPendingStatus(status: string): boolean {
  const s = status.toLowerCase()
  return s === 'pending' || s === 'processing' || s === 'paid' || s === 'awaiting_payment'
}

export function isCompletedStatus(status: string): boolean {
  const s = status.toLowerCase()
  return s === 'completed' || s === 'delivered' || s === 'fulfilled' || s === 'shipped'
}

export function filterOrdersByRange(orders: AdminOrderRow[], filter: DateRangeFilter): AdminOrderRow[] {
  return orders.filter((o) => isInDateRange(o, filter))
}

export function countAndRevenue(orders: AdminOrderRow[]): { count: number; revenue: number } {
  let revenue = 0
  for (const o of orders) {
    revenue += Number(o.total_ngn) || 0
  }
  return { count: orders.length, revenue }
}

/** Distinct checkout emails (lowercased) with a non-empty value. */
export function uniqueBuyerCount(orders: AdminOrderRow[]): number {
  const s = new Set<string>()
  for (const o of orders) {
    const e = (o.email || '').trim().toLowerCase()
    if (e) s.add(e)
  }
  return s.size
}

export type BuyerRollupRow = {
  emailNorm: string
  emailDisplay: string
  orderCount: number
  lastOrderAt: string
  lifetimeSpendNgn: number
}

/** One row per distinct email; sorted by most recent order first. */
export function buyerRollupFromOrders(orders: AdminOrderRow[]): BuyerRollupRow[] {
  const map = new Map<string, { emailDisplay: string; orderCount: number; lastOrderAt: string; lifetimeSpendNgn: number }>()
  for (const o of orders) {
    const raw = (o.email || '').trim()
    const key = raw.toLowerCase()
    if (!key) continue
    const spend = Number(o.total_ngn) || 0
    const cur = map.get(key)
    if (!cur) {
      map.set(key, { emailDisplay: raw || key, orderCount: 1, lastOrderAt: o.created_at, lifetimeSpendNgn: spend })
    } else {
      cur.orderCount += 1
      cur.lifetimeSpendNgn += spend
      if (new Date(o.created_at) > new Date(cur.lastOrderAt)) {
        cur.lastOrderAt = o.created_at
        if (raw) cur.emailDisplay = raw
      }
    }
  }
  return Array.from(map.entries())
    .map(([emailNorm, v]) => ({ emailNorm, ...v }))
    .sort((a, b) => new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime())
}

export type StateSalesRow = { state: string; orders: number; revenue: number }

export function topStatesByRevenue(orders: AdminOrderRow[], limit = 8): StateSalesRow[] {
  const map = new Map<string, { orders: number; revenue: number }>()
  for (const o of orders) {
    const ship = o.shipping as Record<string, unknown>
    const raw = typeof ship.state === 'string' ? ship.state.trim() : ''
    const state = raw || 'Unknown'
    const cur = map.get(state) ?? { orders: 0, revenue: 0 }
    cur.orders += 1
    cur.revenue += Number(o.total_ngn) || 0
    map.set(state, cur)
  }
  return Array.from(map.entries())
    .map(([state, v]) => ({ state, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}
