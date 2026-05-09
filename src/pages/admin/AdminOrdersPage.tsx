import { useEffect, useMemo, useState } from 'react'
import { fetchOrdersForAdmin, updateOrderStatus } from '../../lib/adminOrders.ts'
import type { AdminOrderRow } from '../../lib/adminOrders.ts'
import {
  filterOrdersByRange,
  isCompletedStatus,
  isPendingStatus,
  isInDateRange,
  type DateRangeFilter,
} from '../../lib/adminOrderAnalytics.ts'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { ad } from './adminUi.ts'

const formatNaira = (n: number) => `₦${Math.round(n).toLocaleString()}`

function formatShipping(shipping: Record<string, unknown>): string {
  const city = typeof shipping.city === 'string' ? shipping.city : ''
  const state = typeof shipping.state === 'string' ? shipping.state : ''
  const line1 = typeof shipping.line1 === 'string' ? shipping.line1 : ''
  const parts = [line1, city, state].filter(Boolean)
  return parts.join(' · ') || '—'
}

const STATUS_OPTIONS = ['pending', 'processing', 'completed', 'delivered', 'cancelled'] as const

export function AdminOrdersPage() {
  const { theme } = useAdminTheme()
  const [orders, setOrders] = useState<AdminOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<DateRangeFilter>('all')
  const [bucket, setBucket] = useState<'all' | 'pending' | 'completed'>('all')
  const [updating, setUpdating] = useState<string | null>(null)

  const load = async () => {
    const rows = await fetchOrdersForAdmin(500)
    setOrders(rows)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const ranged = useMemo(() => filterOrdersByRange(orders, range), [orders, range])

  const filtered = useMemo(() => {
    if (bucket === 'pending') return ranged.filter((o) => isPendingStatus(o.status))
    if (bucket === 'completed') return ranged.filter((o) => isCompletedStatus(o.status))
    return ranged
  }, [ranged, bucket])

  const todayCount = useMemo(() => orders.filter((o) => isInDateRange(o, 'today')).length, [orders])

  const tableWrap = ad(
    theme,
    'overflow-x-auto rounded-xl border border-zinc-200/90 bg-white shadow-sm',
    'overflow-x-auto rounded-xl border border-zinc-800/90 bg-[#0c0c0e]',
  )
  const th = ad(
    theme,
    'border-b border-zinc-100 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500',
    'border-b border-zinc-800 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500',
  )

  const onStatusChange = async (orderId: string, status: string) => {
    setUpdating(orderId)
    const res = await updateOrderStatus(orderId, status)
    setUpdating(null)
    if (res.ok) await load()
  }

  const chip = (active: boolean) =>
    [
      'rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors',
      active
        ? ad(theme, 'bg-zinc-900 text-white', 'bg-zinc-100 text-zinc-900')
        : ad(theme, 'text-zinc-500 hover:bg-zinc-100', 'text-zinc-500 hover:bg-zinc-800/80'),
    ].join(' ')

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div
          className={ad(
            theme,
            'size-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-800',
            'size-8 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-200',
          )}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-sans text-2xl font-semibold tracking-tight">Orders</h1>
      <p className={ad(theme, 'mt-1 text-sm text-zinc-500', 'mt-1 text-sm text-zinc-500')}>
        Fulfillment queue ·{' '}
        <span className={'font-medium ' + ad(theme, 'text-zinc-800', 'text-zinc-200')}>{todayCount} today</span> in
        dataset
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(['today', '7d', '30d', 'all'] as const).map((r) => (
            <button key={r} type="button" className={chip(range === r)} onClick={() => setRange(r)}>
              {r === 'today' ? 'Today' : r === '7d' ? '7d' : r === '30d' ? '30d' : 'All dates'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chip(bucket === 'all')} onClick={() => setBucket('all')}>
            All · {ranged.length}
          </button>
          <button type="button" className={chip(bucket === 'pending')} onClick={() => setBucket('pending')}>
            Pending · {ranged.filter((o) => isPendingStatus(o.status)).length}
          </button>
          <button type="button" className={chip(bucket === 'completed')} onClick={() => setBucket('completed')}>
            Completed · {ranged.filter((o) => isCompletedStatus(o.status)).length}
          </button>
        </div>
      </div>

      <div className={'mt-6 ' + tableWrap}>
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr>
              <th className={th}>Date</th>
              <th className={th}>Customer</th>
              <th className={th}>Destination</th>
              <th className={th + ' text-right'}>Total</th>
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody className={ad(theme, 'divide-y divide-zinc-100', 'divide-y divide-zinc-800/80')}>
            {filtered.map((o) => (
              <tr key={o.id} className={ad(theme, 'text-zinc-700', 'text-zinc-300')}>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                  {new Date(o.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-4 py-3">
                  <p className={ad(theme, 'font-medium text-zinc-900', 'font-medium text-zinc-100')}>{o.email}</p>
                  <p className="font-mono text-[11px] text-zinc-500">{o.id.slice(0, 8)}…</p>
                </td>
                <td className="max-w-[220px] truncate px-4 py-3 text-xs">{formatShipping(o.shipping)}</td>
                <td
                  className={
                    'px-4 py-3 text-right text-sm font-semibold tabular-nums ' +
                    ad(theme, 'text-tle-deep', 'text-tle-light')
                  }
                >
                  {formatNaira(Number(o.total_ngn) || 0)}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={o.status}
                    disabled={updating === o.id}
                    onChange={(e) => void onStatusChange(o.id, e.target.value)}
                    className={ad(
                      theme,
                      'max-w-[160px] rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[12px] font-semibold outline-none focus:border-zinc-400',
                      'max-w-[160px] rounded-lg border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-[12px] font-semibold text-zinc-100 outline-none focus:border-zinc-500',
                    )}
                  >
                    {[...new Set([...STATUS_OPTIONS, o.status])].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-center text-sm text-zinc-500">No orders match these filters.</p>
      ) : null}
    </div>
  )
}
