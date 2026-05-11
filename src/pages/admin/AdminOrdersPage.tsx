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
import { AdminOrderDetailModal } from './AdminOrderDetailModal.tsx'
import { AdminStatusBucketTabs, adminStatusPillClass, type AdminOrderBucket } from './adminRangeTabs.tsx'
import { ad, adminFont } from './adminUi.ts'

const formatNaira = (n: number) => `₦${Math.round(n).toLocaleString()}`

function formatShipping(shipping: Record<string, unknown>): string {
  const city = typeof shipping.city === 'string' ? shipping.city : ''
  const state = typeof shipping.state === 'string' ? shipping.state : ''
  const line1 = typeof shipping.line1 === 'string' ? shipping.line1 : ''
  return [line1, city, state].filter(Boolean).join(', ') || '—'
}

const STATUS_OPTIONS = ['pending', 'processing', 'completed', 'delivered', 'cancelled'] as const

const DATE_OPTIONS: { id: DateRangeFilter; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'all', label: 'All time' },
]

function overviewShell(tint: 'emerald' | 'sky' | 'amber', theme: 'light' | 'dark') {
  const map = {
    emerald: ['border-emerald-100/80 bg-emerald-50/90', 'border-emerald-900/30 bg-emerald-950/25'],
    sky: ['border-sky-100/80 bg-sky-50/90', 'border-sky-900/30 bg-sky-950/25'],
    amber: ['border-amber-100/80 bg-amber-50/90', 'border-amber-900/25 bg-amber-950/20'],
  } as const
  const [L, D] = map[tint]
  return ad(theme, L, D)
}

function detailBtn(theme: 'light' | 'dark') {
  return ad(
    theme,
    'inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-[12px] font-bold text-emerald-900 transition hover:bg-emerald-100',
    'inline-flex items-center gap-1.5 rounded-xl border border-emerald-800/50 bg-emerald-950/30 px-3 py-2 text-[12px] font-bold text-emerald-200 transition hover:bg-emerald-950/50',
  )
}

export function AdminOrdersPage() {
  const { theme } = useAdminTheme()
  const [orders, setOrders] = useState<AdminOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<DateRangeFilter>('7d')
  const [bucket, setBucket] = useState<AdminOrderBucket>('all')
  const [updating, setUpdating] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [detailOrder, setDetailOrder] = useState<AdminOrderRow | null>(null)

  const load = async () => {
    setOrders(await fetchOrdersForAdmin(500))
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
  const pendingInRange = useMemo(() => ranged.filter((o) => isPendingStatus(o.status)).length, [ranged])
  const volumeInView = useMemo(
    () => filtered.reduce((a, o) => a + (Number(o.total_ngn) || 0), 0),
    [filtered],
  )

  const muted = ad(theme, 'text-stone-500', 'text-neutral-500')
  const heading = ad(theme, 'text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl', 'text-2xl font-bold tracking-tight text-white sm:text-3xl')
  const cardWrap = ad(
    theme,
    'rounded-2xl border border-stone-200/90 bg-white shadow-sm',
    'rounded-2xl border border-neutral-700/90 bg-neutral-900/50 shadow-sm',
  )
  const filterCard =
    'rounded-2xl border p-4 sm:p-5 ' + ad(theme, 'border-stone-200/90 bg-white/90 shadow-sm', 'border-neutral-700/80 bg-neutral-900/35 shadow-sm')
  const rangeSelect =
    'relative inline-block w-full max-w-[220px] ' +
    ad(theme, 'rounded-xl border border-stone-200 bg-white shadow-sm', 'rounded-xl border border-neutral-600 bg-neutral-950 shadow-sm')
  const th = ad(
    theme,
    'border-b border-stone-100 bg-stone-50/95 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500 sm:px-4',
    'border-b border-neutral-800 bg-neutral-900/70 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-500 sm:px-4',
  )
  const td = ad(
    theme,
    'border-b border-stone-100/90 px-3 py-3 align-middle text-[13px] last:border-b-0 sm:px-4',
    'border-b border-neutral-800/70 px-3 py-3 align-middle text-[13px] last:border-b-0 sm:px-4',
  )
  const selectCls = ad(
    theme,
    'min-w-[120px] max-w-[160px] cursor-pointer rounded-xl border border-stone-200 bg-white px-2.5 py-2 text-[12px] font-semibold text-stone-900 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 disabled:opacity-50 sm:min-w-[148px] sm:max-w-[200px] sm:px-3 sm:py-2.5 sm:text-[13px]',
    'min-w-[120px] max-w-[160px] cursor-pointer rounded-xl border border-neutral-600 bg-neutral-950 px-2.5 py-2 text-[12px] font-semibold text-neutral-100 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50 sm:min-w-[148px] sm:max-w-[200px] sm:px-3 sm:py-2.5 sm:text-[13px]',
  )

  const onStatusChange = async (orderId: string, status: string) => {
    setUpdating(orderId)
    setBanner(null)
    const res = await updateOrderStatus(orderId, status)
    setUpdating(null)
    if (res.ok) {
      setBanner({ type: 'ok', text: 'Order status updated.' })
      await load()
      window.setTimeout(() => setBanner(null), 3200)
    } else {
      setBanner({ type: 'err', text: res.message })
    }
  }

  if (loading) {
    return (
      <div className={adminFont() + ' flex min-h-[40vh] flex-col items-center justify-center gap-3 ' + muted}>
        <span className="material-symbols-outlined animate-pulse text-3xl font-light text-emerald-600">receipt_long</span>
        <p className="text-[14px] font-medium">Loading orders…</p>
      </div>
    )
  }

  return (
    <div className={adminFont() + ' mx-auto max-w-6xl pb-8'}>
      {detailOrder ? (
        <AdminOrderDetailModal order={detailOrder} onClose={() => setDetailOrder(null)} headline="Order details" />
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/25">
              <span className="material-symbols-outlined text-[22px] font-light">shopping_bag</span>
            </span>
            <h1 className={heading}>Orders</h1>
          </div>
          <p className={muted + ' mt-2 max-w-xl text-[14px] leading-relaxed'}>
            {todayCount} new today · {orders.length} on file. Choose dates first, then stage. Open <strong className={ad(theme, 'text-stone-700', 'text-neutral-300')}>Details</strong> for full
            name, phone, address, and cart lines.
          </p>
        </div>
      </div>

      {banner ? (
        <div
          role="status"
          className={
            'mt-5 flex items-center gap-2 rounded-2xl border px-4 py-3 text-[13px] font-medium ' +
            (banner.type === 'ok'
              ? ad(theme, 'border-emerald-200 bg-emerald-50 text-emerald-900', 'border-emerald-800/50 bg-emerald-950/40 text-emerald-200')
              : ad(theme, 'border-rose-200 bg-rose-50 text-rose-900', 'border-rose-900/40 bg-rose-950/30 text-rose-200'))
          }
        >
          <span className="material-symbols-outlined text-[20px] font-light">
            {banner.type === 'ok' ? 'check_circle' : 'error'}
          </span>
          {banner.text}
        </div>
      ) : null}

      <div
        className={
          'mt-6 flex flex-col gap-3 rounded-2xl border px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3.5 ' +
          ad(theme, 'border-stone-200/90 bg-white/90', 'border-neutral-700/80 bg-neutral-900/35')
        }
      >
        <div>
          <p className={ad(theme, 'text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500', 'text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500')}>
            Date range
          </p>
          <p className={muted + ' mt-0.5 text-[11px]'}>Filters stats and the list below.</p>
        </div>
        <div className={rangeSelect}>
          <select
            value={range}
            aria-label="Date range"
            onChange={(e) => setRange(e.target.value as DateRangeFilter)}
            className={
              'w-full cursor-pointer appearance-none rounded-xl border-0 bg-transparent py-2.5 pl-3 pr-10 text-[13px] font-semibold outline-none ring-0 ' +
              ad(theme, 'text-stone-900', 'text-neutral-100')
            }
          >
            {DATE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <span
            className={'pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] font-light opacity-50 ' + muted}
            aria-hidden
          >
            expand_more
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className={'rounded-2xl border p-4 shadow-sm ' + overviewShell('emerald', theme)}>
          <p className={ad(theme, 'text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-800/80', 'text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300/90')}>
            Orders in this view
          </p>
          <p className={ad(theme, 'mt-2 text-2xl font-bold tabular-nums text-stone-900', 'mt-2 text-2xl font-bold tabular-nums text-white')}>{filtered.length}</p>
          <p className={muted + ' mt-1 text-[11px]'}>After date + stage filters</p>
        </div>
        <div className={'rounded-2xl border p-4 shadow-sm ' + overviewShell('amber', theme)}>
          <p className={ad(theme, 'text-[10px] font-bold uppercase tracking-[0.12em] text-amber-900/80', 'text-[10px] font-bold uppercase tracking-[0.12em] text-amber-200/90')}>
            Needs attention
          </p>
          <p className={ad(theme, 'mt-2 text-2xl font-bold tabular-nums text-stone-900', 'mt-2 text-2xl font-bold tabular-nums text-white')}>{pendingInRange}</p>
          <p className={muted + ' mt-1 text-[11px]'}>Pending / processing in range</p>
        </div>
        <div className={'rounded-2xl border p-4 shadow-sm ' + overviewShell('sky', theme)}>
          <p className={ad(theme, 'text-[10px] font-bold uppercase tracking-[0.12em] text-sky-900/75', 'text-[10px] font-bold uppercase tracking-[0.12em] text-sky-200/90')}>
            Value in this view
          </p>
          <p className={ad(theme, 'mt-2 text-xl font-bold tabular-nums text-stone-900 sm:text-2xl', 'mt-2 text-xl font-bold tabular-nums text-white sm:text-2xl')}>{formatNaira(volumeInView)}</p>
          <p className={muted + ' mt-1 text-[11px]'}>Sum of order totals listed</p>
        </div>
      </div>

      <div className={'mt-6 ' + filterCard}>
        <p className={ad(theme, 'text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500', 'text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500')}>
          Order stage
        </p>
        <div className="mt-3">
          <AdminStatusBucketTabs
            value={bucket}
            onChange={setBucket}
            theme={theme}
            counts={{
              all: ranged.length,
              pending: pendingInRange,
              completed: ranged.filter((o) => isCompletedStatus(o.status)).length,
            }}
          />
        </div>
      </div>

      <div className="mt-6 space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <div className={'rounded-2xl border px-4 py-14 text-center text-[14px] ' + cardWrap + ' ' + muted}>No orders match these filters.</div>
        ) : (
          filtered.map((o) => (
            <div key={o.id} className={'overflow-hidden rounded-2xl border ' + cardWrap}>
              <div className={'flex items-start justify-between gap-3 border-b px-4 py-3 ' + ad(theme, 'border-stone-100 bg-stone-50/80', 'border-neutral-800 bg-neutral-950/50')}>
                <div className="min-w-0">
                  <p className={'font-mono text-[11px] ' + muted}>{o.id.slice(0, 10)}…</p>
                  <p className={'truncate text-[15px] font-semibold ' + ad(theme, 'text-stone-900', 'text-white')}>{o.email}</p>
                  <p className={muted + ' mt-0.5 text-[12px]'}>{formatShipping(o.shipping)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={'text-lg font-bold tabular-nums ' + ad(theme, 'text-emerald-700', 'text-emerald-300')}>{formatNaira(Number(o.total_ngn) || 0)}</p>
                  <span className={'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ' + adminStatusPillClass(o.status, theme)}>
                    {o.status}
                  </span>
                </div>
              </div>
              <div className="space-y-3 px-4 py-4">
                <button type="button" onClick={() => setDetailOrder(o)} className={'w-full justify-center ' + detailBtn(theme)}>
                  <span className="material-symbols-outlined text-[18px] font-light">visibility</span>
                  View full details
                </button>
                <label className={'block text-[10px] font-bold uppercase tracking-wider ' + muted}>Update status</label>
                <select
                  value={o.status}
                  disabled={updating === o.id}
                  onChange={(e) => void onStatusChange(o.id, e.target.value)}
                  className={'w-full ' + selectCls}
                >
                  {[...new Set([...STATUS_OPTIONS, o.status])].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <p className={muted + ' text-[11px]'}>
                  {new Date(o.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={'mt-6 hidden overflow-hidden md:block ' + cardWrap}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr>
                <th className={th}>Created</th>
                <th className={th}>Reference</th>
                <th className={th}>Customer</th>
                <th className={th}>Ship to</th>
                <th className={th + ' text-right'}>Total</th>
                <th className={th}>Details</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className={td + ' py-16 text-center ' + muted}>
                    No rows for this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className={ad(theme, 'transition-colors hover:bg-emerald-50/40', 'transition-colors hover:bg-emerald-950/15')}>
                    <td className={td + ' whitespace-nowrap tabular-nums ' + muted}>
                      {new Date(o.created_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className={td + ' font-mono text-[12px] ' + ad(theme, 'text-stone-700', 'text-neutral-300')}>{o.id.slice(0, 12)}…</td>
                    <td className={td + ' max-w-[140px] truncate font-medium ' + ad(theme, 'text-stone-900', 'text-neutral-100')}>{o.email}</td>
                    <td className={td + ' max-w-[200px] truncate text-[12px] ' + muted}>{formatShipping(o.shipping)}</td>
                    <td className={td + ' text-right text-[14px] font-bold tabular-nums ' + ad(theme, 'text-emerald-700', 'text-emerald-300')}>
                      {formatNaira(Number(o.total_ngn) || 0)}
                    </td>
                    <td className={td}>
                      <button type="button" onClick={() => setDetailOrder(o)} className={detailBtn(theme)}>
                        <span className="material-symbols-outlined text-[18px] font-light">visibility</span>
                        View
                      </button>
                    </td>
                    <td className={td}>
                      <select
                        value={o.status}
                        disabled={updating === o.id}
                        onChange={(e) => void onStatusChange(o.id, e.target.value)}
                        className={selectCls}
                      >
                        {[...new Set([...STATUS_OPTIONS, o.status])].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
