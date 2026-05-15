import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { fetchOrdersForAdmin, updateOrderDeliveryStatus } from '../../lib/adminOrders.ts'
import type { AdminOrderRow } from '../../lib/adminOrders.ts'
import {
  effectiveDeliveryStatus,
  filterOrdersByRange,
  orderIsCancelled,
  orderIsPaidAwaitingDelivery,
  orderIsPaymentPaid,
  orderIsSettledComplete,
  type DateRangeFilter,
} from '../../lib/adminOrderAnalytics.ts'
import { normalizeOrderLineItems } from '../../lib/adminOrderLineSnapshots.ts'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { adminDeliveryPillClass, adminPaymentPillClass } from './adminRangeTabs.tsx'
import { ad, adminFont } from './adminUi.ts'
import { OrderRelativeTime } from './OrderRelativeTime.tsx'
import { OfflineOrderModal } from './OfflineOrderModal.tsx'

const formatNaira = (n: number) => `₦${Math.round(n).toLocaleString()}`

const DELIVERY_OPTIONS = ['pending', 'processing', 'delivered'] as const

const DATE_OPTIONS: { id: DateRangeFilter; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'all', label: 'All time' },
]

function orderLineSummary(line_items: unknown): string {
  const items = normalizeOrderLineItems(line_items)
  if (items.length === 0) return 'No line items'
  const first = items[0] as Record<string, unknown>
  const name = typeof first.name === 'string' && first.name.trim() ? first.name.trim() : 'Item'
  if (items.length === 1) return name
  return `${name} +${items.length - 1} more`
}

function customerDisplayName(o: AdminOrderRow): string {
  const ship = o.shipping && typeof o.shipping === 'object' ? (o.shipping as Record<string, unknown>) : {}
  const full = typeof ship.fullName === 'string' ? ship.fullName.trim() : ''
  if (full) return full
  const em = o.email?.trim() || ''
  const at = em.indexOf('@')
  return at > 0 ? em.slice(0, at) : em || 'Customer'
}

function orderRefShort(id: string): string {
  const compact = id.replace(/-/g, '')
  return compact.slice(0, 6).toUpperCase()
}

function ordersFilterSelect(theme: 'light' | 'dark') {
  return ad(
    theme,
    'h-11 w-full cursor-pointer rounded-lg border border-stone-200/90 bg-white px-3 text-[13px] font-semibold text-stone-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 lg:h-9 lg:text-[12px]',
    'h-11 w-full cursor-pointer rounded-lg border border-neutral-600 bg-neutral-950 px-3 text-[13px] font-semibold text-neutral-100 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 lg:h-9 lg:text-[12px]',
  )
}

function ordersSearchInput(theme: 'light' | 'dark') {
  return ad(
    theme,
    'h-11 w-full rounded-lg border border-stone-200/90 bg-white py-0 pr-3 pl-10 text-[13px] font-medium text-stone-900 shadow-sm outline-none placeholder:text-stone-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 lg:h-9 lg:text-[12px]',
    'h-11 w-full rounded-lg border border-neutral-600 bg-neutral-950 py-0 pr-3 pl-10 text-[13px] font-medium text-neutral-100 shadow-sm outline-none placeholder:text-neutral-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 lg:h-9 lg:text-[12px]',
  )
}

export function AdminOrdersPage() {
  const navigate = useNavigate()
  const { theme } = useAdminTheme()
  const [orders, setOrders] = useState<AdminOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<DateRangeFilter>('today')
  const [listTab, setListTab] = useState<'all' | 'attention' | 'offline'>('all')
  const [deliveryFilter, setDeliveryFilter] = useState<string>('all')
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [updating, setUpdating] = useState<string | null>(null)
  const [offlineModalOpen, setOfflineModalOpen] = useState(false)
  const load = async () => {
    setOrders(await fetchOrdersForAdmin(500))
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const ranged = useMemo(() => filterOrdersByRange(orders, range), [orders, range])

  const attentionOrders = useMemo(() => ranged.filter((o) => orderIsPaidAwaitingDelivery(o)), [ranged])

  const stats = useMemo(() => {
    let completedNgn = 0
    let awaitingDeliveryNgn = 0
    let awaitingDeliveryCount = 0
    let offlineCount = 0
    for (const o of ranged) {
      const t = Number(o.total_ngn) || 0
      if (orderIsSettledComplete(o)) completedNgn += t
      if (orderIsPaidAwaitingDelivery(o)) {
        awaitingDeliveryNgn += t
        awaitingDeliveryCount += 1
      }
      const ship = o.shipping && typeof o.shipping === 'object' ? (o.shipping as Record<string, unknown>) : {}
      if (ship.isOffline === true) offlineCount += 1
    }
    return {
      totalCount: ranged.length,
      completedNgn,
      awaitingDeliveryNgn,
      awaitingDeliveryCount,
      offlineCount,
    }
  }, [ranged])

  const filtered = useMemo(() => {
    let rows = ranged
    if (listTab === 'attention') rows = rows.filter((o) => orderIsPaidAwaitingDelivery(o))
    if (listTab === 'offline') {
      rows = rows.filter((o) => {
        const ship = o.shipping && typeof o.shipping === 'object' ? (o.shipping as Record<string, unknown>) : {}
        return ship.isOffline === true
      })
    }
    if (deliveryFilter !== 'all') rows = rows.filter((o) => effectiveDeliveryStatus(o) === deliveryFilter)
    if (paymentFilter === 'paid') rows = rows.filter((o) => orderIsPaymentPaid(o))
    if (paymentFilter === 'unpaid') rows = rows.filter((o) => !orderIsCancelled(o) && !orderIsPaymentPaid(o))
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter((o) => {
        const name = customerDisplayName(o).toLowerCase()
        const sum = orderLineSummary(o.line_items).toLowerCase()
        return (
          o.id.toLowerCase().includes(q) ||
          (o.email || '').toLowerCase().includes(q) ||
          name.includes(q) ||
          sum.includes(q)
        )
      })
    }
    return rows
  }, [ranged, listTab, deliveryFilter, paymentFilter, search])

  const attentionCount = attentionOrders.length

  const muted = ad(theme, 'text-stone-500', 'text-neutral-500')
  const heading = ad(theme, 'text-2xl font-bold tracking-tight text-stone-900', 'text-2xl font-bold tracking-tight text-white')
  const cardWrap = ad(
    theme,
    'rounded-2xl border border-stone-200/90 bg-white shadow-sm',
    'rounded-2xl border border-neutral-700/90 bg-neutral-900/50 shadow-sm',
  )
  const th = ad(
    theme,
    'border-b border-stone-100 bg-stone-50/95 px-2 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-stone-500 sm:px-3',
    'border-b border-neutral-800 bg-neutral-900/70 px-2 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-500 sm:px-3',
  )
  const td = ad(
    theme,
    'border-b border-stone-100/90 px-2 py-2.5 align-middle text-[12px] last:border-b-0 sm:px-3 sm:text-[13px]',
    'border-b border-neutral-800/70 px-2 py-2.5 align-middle text-[12px] last:border-b-0 sm:px-3 sm:text-[13px]',
  )
  const statusSelect = ad(
    theme,
    'w-full min-w-0 max-w-full cursor-pointer rounded-lg border border-stone-200 bg-white px-1.5 py-1 text-[11px] font-semibold text-stone-900 outline-none focus:border-emerald-500 disabled:opacity-50',
    'w-full min-w-0 max-w-full cursor-pointer rounded-lg border border-neutral-600 bg-neutral-950 px-1.5 py-1 text-[11px] font-semibold text-neutral-100 outline-none focus:border-emerald-500 disabled:opacity-50',
  )

  const onDeliveryChange = async (orderId: string, delivery: (typeof DELIVERY_OPTIONS)[number]) => {
    setUpdating(orderId)
    const res = await updateOrderDeliveryStatus(orderId, delivery)
    setUpdating(null)
    if (res.ok) {
      toast.success('Delivery updated')
      await load()
    } else {
      toast.error(res.message)
    }
  }

  const toggleRow = (id: string) => {
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const toggleAllVisible = () => {
    const ids = filtered.map((o) => o.id)
    const all = ids.length > 0 && ids.every((id) => selected.has(id))
    setSelected(() => {
      if (all) return new Set()
      return new Set(ids)
    })
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
    <div className={adminFont() + ' mx-auto w-full min-w-0 max-w-[88rem] pb-10'}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={heading}>Orders</h1>
          <p className={muted + ' mt-1 max-w-2xl text-[13px]'}>
            Website checkout. New orders are marked{' '}
            <strong className={ad(theme, 'font-semibold text-stone-800', 'font-semibold text-neutral-100')}>Paid</strong>{' '}
            when checkout completes (no card gateway yet). Open a row for full details.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOfflineModalOpen(true)}
          className={
            'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] ' +
            ad(theme, 'bg-stone-900 text-white hover:bg-stone-800', 'bg-emerald-600 text-white hover:bg-emerald-500')
          }
        >
          <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
          Upload Offline Sale
        </button>
      </div>

      {attentionCount > 0 ? (
        <div
          className={
            'mt-5 flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ' +
            ad(theme, 'border-amber-200 bg-amber-50 text-amber-950', 'border-amber-800/50 bg-amber-950/35 text-amber-100')
          }
        >
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined mt-0.5 text-[24px] font-light text-amber-600">warning</span>
            <p className="text-[14px] font-semibold leading-snug">
              You have {attentionCount} paid order{attentionCount === 1 ? '' : 's'} waiting to be delivered. Mark delivery when the customer receives them.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setListTab('attention')}
            className={
              'shrink-0 rounded-xl px-4 py-2.5 text-[13px] font-bold ' +
              ad(theme, 'bg-stone-900 text-white hover:bg-stone-800', 'bg-amber-200 text-amber-950 hover:bg-amber-100')
            }
          >
            View attention
          </button>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={'rounded-2xl border p-4 ' + cardWrap}>
          <div className="flex items-center justify-between gap-2">
            <p className={ad(theme, 'text-[10px] font-bold uppercase tracking-wider text-stone-500', 'text-[10px] font-bold uppercase tracking-wider text-neutral-500')}>Total orders</p>
            <span className="material-symbols-outlined text-[22px] font-light text-emerald-600">shopping_bag</span>
          </div>
          <p className={'mt-2 text-2xl font-bold tabular-nums ' + ad(theme, 'text-stone-900', 'text-white')}>{stats.totalCount}</p>
          <p className={muted + ' mt-1 text-[11px]'}>In selected date range</p>
        </div>
        <div className={'rounded-2xl border p-4 ' + cardWrap}>
          <div className="flex items-center justify-between gap-2">
            <p className={ad(theme, 'text-[10px] font-bold uppercase tracking-wider text-stone-500', 'text-[10px] font-bold uppercase tracking-wider text-neutral-500')}>Completed</p>
            <span className="material-symbols-outlined text-[22px] font-light text-sky-600">receipt_long</span>
          </div>
          <p className={'mt-2 text-lg font-bold tabular-nums sm:text-xl ' + ad(theme, 'text-stone-900', 'text-white')}>{formatNaira(stats.completedNgn)}</p>
          <p className={muted + ' mt-1 text-[11px]'}>Paid and delivered</p>
        </div>
        <div className={'rounded-2xl border p-4 ' + cardWrap}>
          <div className="flex items-center justify-between gap-2">
            <p className={ad(theme, 'text-[10px] font-bold uppercase tracking-wider text-stone-500', 'text-[10px] font-bold uppercase tracking-wider text-neutral-500')}>Awaiting delivery</p>
            <span className="material-symbols-outlined text-[22px] font-light text-amber-600">local_shipping</span>
          </div>
          <p className={'mt-2 text-lg font-bold tabular-nums sm:text-xl ' + ad(theme, 'text-stone-900', 'text-white')}>{formatNaira(stats.awaitingDeliveryNgn)}</p>
          <p className={muted + ' mt-1 text-[11px]'}>
            {stats.awaitingDeliveryCount} paid, not yet delivered
          </p>
        </div>
        <div className={'rounded-2xl border p-4 ' + cardWrap}>
          <div className="flex items-center justify-between gap-2">
            <p className={ad(theme, 'text-[10px] font-bold uppercase tracking-wider text-stone-500', 'text-[10px] font-bold uppercase tracking-wider text-neutral-500')}>Offline Sales</p>
            <span className="material-symbols-outlined text-[22px] font-light text-sky-600">share</span>
          </div>
          <p className={'mt-2 text-2xl font-bold tabular-nums ' + ad(theme, 'text-stone-900', 'text-white')}>{stats.offlineCount}</p>
          <p className={muted + ' mt-1 text-[11px]'}>Uploaded from social media</p>
        </div>
      </div>

      <div className={'mt-6 min-w-0 overflow-hidden ' + cardWrap}>
        <div className="flex flex-col">
          <div className={'flex items-center justify-between gap-2 border-b px-3 py-2.5 sm:px-4 ' + ad(theme, 'border-stone-100 bg-stone-50/60', 'border-neutral-800 bg-neutral-950/40')}>
            <p className={ad(theme, 'text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500', 'text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500')}>
              List
            </p>
            <div
              className={
                'inline-flex shrink-0 rounded-lg p-0.5 ' + ad(theme, 'bg-stone-200/70 ring-1 ring-stone-200/60', 'bg-neutral-800 ring-1 ring-neutral-700/60')
              }
              role="tablist"
              aria-label="Order list scope"
            >
              <button
                type="button"
                role="tab"
                aria-selected={listTab === 'all'}
                onClick={() => setListTab('all')}
                className={
                  'rounded-md px-3 py-1.5 text-[12px] font-bold transition sm:px-4 sm:py-2 sm:text-[13px] ' +
                  (listTab === 'all'
                    ? ad(theme, 'bg-emerald-600 text-white shadow-sm', 'bg-emerald-600 text-white shadow-sm')
                    : ad(theme, 'text-stone-600 hover:bg-white/70', 'text-neutral-400 hover:bg-neutral-700/80'))
                }
              >
                All
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={listTab === 'attention'}
                onClick={() => setListTab('attention')}
                className={
                  'relative rounded-md px-3 py-1.5 text-[12px] font-bold transition sm:px-4 sm:py-2 sm:text-[13px] ' +
                  (listTab === 'attention'
                    ? ad(theme, 'bg-emerald-600 text-white shadow-sm', 'bg-emerald-600 text-white shadow-sm')
                    : ad(theme, 'text-stone-600 hover:bg-white/70', 'text-neutral-400 hover:bg-neutral-700/80'))
                }
              >
                Attention
                {attentionCount > 0 ? (
                  <span
                    className={
                      'absolute -right-1 -top-1 flex min-w-[1rem] items-center justify-center rounded-full px-0.5 text-[9px] font-bold leading-none text-white ring-2 ' +
                      (listTab === 'attention'
                        ? 'bg-rose-500 ring-emerald-600'
                        : ad(theme, 'bg-rose-500 ring-stone-200', 'bg-rose-500 ring-neutral-800'))
                    }
                    aria-hidden
                  >
                    {attentionCount > 9 ? '9+' : attentionCount}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={listTab === 'offline'}
                onClick={() => setListTab('offline')}
                className={
                  'rounded-md px-3 py-1.5 text-[12px] font-bold transition sm:px-4 sm:py-2 sm:text-[13px] ' +
                  (listTab === 'offline'
                    ? ad(theme, 'bg-emerald-600 text-white shadow-sm', 'bg-emerald-600 text-white shadow-sm')
                    : ad(theme, 'text-stone-600 hover:bg-white/70', 'text-neutral-400 hover:bg-neutral-700/80'))
                }
              >
                Offline
              </button>
            </div>
          </div>

          <div className={'px-3 py-3 sm:px-4 sm:py-3.5 ' + ad(theme, 'bg-white', 'bg-neutral-900/20')}>
            <p
              className={
                'mb-3 text-[10px] font-bold uppercase tracking-[0.14em] ' +
                ad(theme, 'text-stone-500', 'text-neutral-500')
              }
            >
              Filters
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end lg:gap-x-3">
              <div className="sm:col-span-2 lg:col-span-2">
                <label className={muted + ' mb-1 block text-[10px] font-bold uppercase tracking-[0.12em]'} htmlFor="orders-filter-range">
                  Date range
                </label>
                <select
                  id="orders-filter-range"
                  className={ordersFilterSelect(theme)}
                  value={range}
                  aria-label="Date range"
                  onChange={(e) => setRange(e.target.value as DateRangeFilter)}
                >
                  {DATE_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-1 lg:col-span-2">
                <label className={muted + ' mb-1 block text-[10px] font-bold uppercase tracking-[0.12em]'} htmlFor="orders-filter-delivery">
                  Delivery
                </label>
                <select
                  id="orders-filter-delivery"
                  className={ordersFilterSelect(theme)}
                  value={deliveryFilter}
                  aria-label="Delivery status"
                  onChange={(e) => setDeliveryFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  {DELIVERY_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-1 lg:col-span-2">
                <label className={muted + ' mb-1 block text-[10px] font-bold uppercase tracking-[0.12em]'} htmlFor="orders-filter-payment">
                  Payment
                </label>
                <select
                  id="orders-filter-payment"
                  className={ordersFilterSelect(theme)}
                  value={paymentFilter}
                  aria-label="Payment filter"
                  onChange={(e) => setPaymentFilter(e.target.value as 'all' | 'paid' | 'unpaid')}
                >
                  <option value="all">All</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-6">
                <label className={muted + ' mb-1 block text-[10px] font-bold uppercase tracking-[0.12em]'} htmlFor="orders-filter-search">
                  Search
                </label>
                <div className="relative">
                  <span className={'material-symbols-outlined pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[20px] ' + muted}>
                    search
                  </span>
                  <input
                    id="orders-filter-search"
                    type="search"
                    placeholder="Reference, name, email, product…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={ordersSearchInput(theme)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={'hidden w-full min-w-0 overflow-hidden border-t md:block ' + ad(theme, 'border-stone-100', 'border-neutral-800')}>
          <table className="w-full min-w-0 table-fixed border-collapse text-left">
            <colgroup>
              <col style={{ width: '3%' }} />
              <col style={{ width: '28%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '21%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className={th}>
                  <input type="checkbox" className="rounded border-stone-300" checked={filtered.length > 0 && filtered.every((o) => selected.has(o.id))} onChange={toggleAllVisible} aria-label="Select all" />
                </th>
                <th className={th}>Order</th>
                <th className={th + ' text-right'}>Total</th>
                <th className={th}>Delivery</th>
                <th className={th}>Payment</th>
                <th className={th}>When</th>
                <th className={th}> </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className={td + ' py-16 text-center ' + muted}>
                    No orders match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => {
                  const d = effectiveDeliveryStatus(o)
                  const pPaid = orderIsPaymentPaid(o)
                  const cancelled = orderIsCancelled(o)
                  const name = customerDisplayName(o)
                  const summary = orderLineSummary(o.line_items)
                  return (
                    <tr
                      key={o.id}
                      className={ad(theme, 'cursor-pointer transition-colors hover:bg-emerald-50/50', 'cursor-pointer transition-colors hover:bg-emerald-950/20')}
                      onClick={() => navigate(`/admin/orders/${encodeURIComponent(o.id)}`, { state: { from: 'orders' } })}
                    >
                      <td className={td} onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="rounded border-stone-300" checked={selected.has(o.id)} onChange={() => toggleRow(o.id)} onClick={(e) => e.stopPropagation()} />
                      </td>
                      <td className={td + ' min-w-0'}>
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className={'break-words font-semibold leading-snug ' + ad(theme, 'text-stone-900', 'text-white')}>
                              <span className={'font-mono text-[11px] ' + ad(theme, 'text-stone-500', 'text-neutral-400')}>{orderRefShort(o.id)}</span>
                              <span className={ad(theme, 'text-stone-400', 'text-neutral-500')}> · </span>
                              {name}
                            </p>
                            <p className={'mt-0.5 line-clamp-2 break-words text-[11px] leading-snug ' + muted}>{summary}</p>
                          </div>
                          {(() => {
                            const ship = o.shipping && typeof o.shipping === 'object' ? (o.shipping as Record<string, unknown>) : {}
                            if (ship.isOffline !== true) return null
                            const src = String(ship.source || 'other')
                            const icon = src === 'whatsapp' ? 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg' :
                                        src === 'instagram' ? 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg' :
                                        src === 'facebook' ? 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg' :
                                        src === 'tiktok' ? 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg' : null
                            return (
                              <div className="mt-0.5 shrink-0" title={`Offline Sale: ${src}`}>
                                {icon ? (
                                  <img src={icon} alt={src} className="size-3.5 opacity-80" />
                                ) : (
                                  <span className="material-symbols-outlined text-[16px] text-stone-400">share</span>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      </td>
                      <td className={td + ' text-right text-[12px] font-bold tabular-nums sm:text-[13px] ' + ad(theme, 'text-emerald-700', 'text-emerald-300')}>
                        {formatNaira(Number(o.total_ngn) || 0)}
                      </td>
                      <td className={td + ' min-w-0'}>
                        <span className={'inline-flex max-w-full truncate rounded-full px-1.5 py-0.5 text-[9px] font-bold capitalize sm:text-[10px] ' + adminDeliveryPillClass(d, theme)}>
                          {cancelled ? '—' : d}
                        </span>
                      </td>
                      <td className={td + ' min-w-0'}>
                        <span className={'inline-flex max-w-full truncate rounded-full px-1.5 py-0.5 text-[9px] font-bold sm:text-[10px] ' + adminPaymentPillClass(pPaid, theme)}>
                          {cancelled ? '—' : pPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                      <td className={td + ' min-w-0 max-w-[140px] break-words text-[11px] leading-snug'}>
                        <OrderRelativeTime iso={o.created_at} theme={theme} className="block w-full" />
                      </td>
                      <td className={td + ' min-w-0'} onClick={(e) => e.stopPropagation()}>
                        <select
                          value={d}
                          disabled={updating === o.id || cancelled}
                          onChange={(e) => void onDeliveryChange(o.id, e.target.value as (typeof DELIVERY_OPTIONS)[number])}
                          className={statusSelect}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {DELIVERY_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className={'space-y-3 border-t px-3 py-3 md:hidden ' + ad(theme, 'border-stone-100', 'border-neutral-800')}>
          {filtered.length === 0 ? (
            <p className={'py-10 text-center text-[14px] ' + muted}>No orders match.</p>
          ) : (
            filtered.map((o) => {
              const d = effectiveDeliveryStatus(o)
              const pPaid = orderIsPaymentPaid(o)
              const cancelled = orderIsCancelled(o)
              return (
                <div key={o.id} className={'overflow-hidden rounded-xl border ' + ad(theme, 'border-stone-200 bg-stone-50/60', 'border-neutral-700 bg-neutral-900/40')}>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/orders/${encodeURIComponent(o.id)}`, { state: { from: 'orders' } })}
                    className={
                      'w-full border-b px-3 py-3 text-left transition ' +
                      ad(theme, 'border-stone-100 bg-white/80 hover:bg-white', 'border-neutral-800 bg-neutral-950/40 hover:bg-neutral-900/50')
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={'font-mono text-[11px] ' + muted}>{orderRefShort(o.id)}</p>
                        <p className={'text-[15px] font-semibold ' + ad(theme, 'text-stone-900', 'text-white')}>{customerDisplayName(o)}</p>
                      </div>
                      {(() => {
                        const ship = o.shipping && typeof o.shipping === 'object' ? (o.shipping as Record<string, unknown>) : {}
                        if (ship.isOffline !== true) return null
                        const src = String(ship.source || 'other')
                        const icon = src === 'whatsapp' ? 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg' :
                                    src === 'instagram' ? 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg' :
                                    src === 'facebook' ? 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg' :
                                    src === 'tiktok' ? 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg' : null
                        return (
                          <div className="shrink-0 rounded-lg border p-1.5 bg-white/50 dark:bg-black/20">
                            {icon ? (
                              <img src={icon} alt={src} className="size-4" />
                            ) : (
                              <span className="material-symbols-outlined text-[18px] text-stone-400">share</span>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                    <p className={'mt-0.5 line-clamp-2 text-[12px] ' + muted}>{orderLineSummary(o.line_items)}</p>
                    <p className={'mt-2 text-lg font-bold tabular-nums ' + ad(theme, 'text-emerald-700', 'text-emerald-300')}>{formatNaira(Number(o.total_ngn) || 0)}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className={'rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ' + adminDeliveryPillClass(d, theme)}>{cancelled ? 'Cancelled' : d}</span>
                      <span className={'rounded-full px-2 py-0.5 text-[10px] font-bold ' + adminPaymentPillClass(pPaid, theme)}>{cancelled ? '—' : pPaid ? 'Paid' : 'Unpaid'}</span>
                    </div>
                    <div className="mt-2">
                      <OrderRelativeTime iso={o.created_at} theme={theme} />
                    </div>
                  </button>
                  <div className="px-3 py-3">
                    <label className={'mb-1 block text-[10px] font-bold uppercase ' + muted}>Delivery</label>
                    <select
                      value={d}
                      disabled={updating === o.id || cancelled}
                      onChange={(e) => void onDeliveryChange(o.id, e.target.value as (typeof DELIVERY_OPTIONS)[number])}
                      className={'w-full ' + statusSelect}
                    >
                      {DELIVERY_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {offlineModalOpen && (
        <OfflineOrderModal
          onClose={() => setOfflineModalOpen(false)}
          onSuccess={() => {
            void load()
          }}
        />
      )}
    </div>
  )
}
