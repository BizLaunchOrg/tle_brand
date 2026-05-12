import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchOrdersForAdmin, updateOrderStatus } from '../../lib/adminOrders.ts'
import type { AdminOrderRow } from '../../lib/adminOrders.ts'
import { filterOrdersByRange, isCompletedStatus, type DateRangeFilter } from '../../lib/adminOrderAnalytics.ts'
import { normalizeOrderLineItems } from '../../lib/adminOrderLineSnapshots.ts'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { adminStatusPillClass } from './adminRangeTabs.tsx'
import { ad, adminFont } from './adminUi.ts'

const formatNaira = (n: number) => `₦${Math.round(n).toLocaleString()}`

const STATUS_OPTIONS = ['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'] as const

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

function isPaidOrderStatus(status: string): boolean {
  const s = status.toLowerCase()
  return isCompletedStatus(status) || s === 'paid'
}

/** Paid (or in paid fulfilment path) but not yet delivered / completed. Excludes unpaid `pending`. */
function isPaidButNotDelivered(status: string): boolean {
  const s = status.toLowerCase()
  if (s === 'cancelled' || s === 'pending' || s === 'awaiting_payment') return false
  if (s === 'delivered' || s === 'completed' || s === 'fulfilled') return false
  return s === 'paid' || s === 'processing' || s === 'shipped'
}

function paymentPill(status: string, theme: 'light' | 'dark'): { label: string; cls: string } {
  const s = status.toLowerCase()
  if (s === 'cancelled')
    return {
      label: 'N/A',
      cls: ad(theme, 'bg-stone-100 text-stone-600', 'bg-neutral-800 text-neutral-400'),
    }
  if (isPaidOrderStatus(status))
    return {
      label: 'Paid',
      cls: ad(theme, 'bg-emerald-100 text-emerald-900', 'bg-emerald-950/50 text-emerald-300'),
    }
  return {
    label: 'Unpaid',
    cls: ad(theme, 'bg-rose-100 text-rose-900', 'bg-rose-950/40 text-rose-200'),
  }
}

function shippingPill(status: string, theme: 'light' | 'dark'): { label: string; cls: string } {
  const s = status.toLowerCase()
  if (s === 'cancelled')
    return {
      label: 'Cancelled',
      cls: ad(theme, 'bg-stone-100 text-stone-600', 'bg-neutral-800 text-neutral-400'),
    }
  if (s === 'delivered' || s === 'completed' || s === 'fulfilled')
    return {
      label: 'Delivered',
      cls: ad(theme, 'bg-emerald-100 text-emerald-900', 'bg-emerald-950/50 text-emerald-300'),
    }
  if (s === 'processing' || s === 'shipped')
    return {
      label: 'Shipped',
      cls: ad(theme, 'bg-sky-100 text-sky-900', 'bg-sky-950/50 text-sky-200'),
    }
  return {
    label: 'Unfulfilled',
    cls: ad(theme, 'bg-amber-100 text-amber-950', 'bg-amber-950/40 text-amber-200'),
  }
}

function formatOrderWhen(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (sameDay) return `Today at ${time}`
  const yest = new Date(now)
  yest.setDate(yest.getDate() - 1)
  if (d.getFullYear() === yest.getFullYear() && d.getMonth() === yest.getMonth() && d.getDate() === yest.getDate()) {
    return `Yesterday at ${time}`
  }
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function selectField(theme: 'light' | 'dark') {
  return ad(
    theme,
    'min-h-[44px] w-full cursor-pointer rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[14px] font-semibold text-stone-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 sm:min-h-0 sm:py-2 sm:text-[13px]',
    'min-h-[44px] w-full cursor-pointer rounded-xl border border-neutral-600 bg-neutral-950 px-3 py-2.5 text-[14px] font-semibold text-neutral-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 sm:min-h-0 sm:py-2 sm:text-[13px]',
  )
}

export function AdminOrdersPage() {
  const navigate = useNavigate()
  const { theme } = useAdminTheme()
  const [orders, setOrders] = useState<AdminOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<DateRangeFilter>('30d')
  const [listTab, setListTab] = useState<'all' | 'attention'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [updating, setUpdating] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const load = async () => {
    setOrders(await fetchOrdersForAdmin(500))
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const ranged = useMemo(() => filterOrdersByRange(orders, range), [orders, range])

  const attentionOrders = useMemo(() => ranged.filter((o) => isPaidButNotDelivered(o.status)), [ranged])

  const stats = useMemo(() => {
    let completedNgn = 0
    let awaitingDeliveryNgn = 0
    let awaitingDeliveryCount = 0
    for (const o of ranged) {
      const t = Number(o.total_ngn) || 0
      if (isCompletedStatus(o.status)) completedNgn += t
      if (isPaidButNotDelivered(o.status)) {
        awaitingDeliveryNgn += t
        awaitingDeliveryCount += 1
      }
    }
    return {
      totalCount: ranged.length,
      completedNgn,
      awaitingDeliveryNgn,
      awaitingDeliveryCount,
    }
  }, [ranged])

  const filtered = useMemo(() => {
    let rows = ranged
    if (listTab === 'attention') rows = rows.filter((o) => isPaidButNotDelivered(o.status))
    if (statusFilter !== 'all') rows = rows.filter((o) => o.status.toLowerCase() === statusFilter.toLowerCase())
    if (paymentFilter === 'paid') rows = rows.filter((o) => isPaidOrderStatus(o.status))
    if (paymentFilter === 'unpaid') rows = rows.filter((o) => o.status.toLowerCase() !== 'cancelled' && !isPaidOrderStatus(o.status))
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
  }, [ranged, listTab, statusFilter, paymentFilter, search])

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
          <p className={muted + ' mt-1 max-w-2xl text-[14px] leading-relaxed'}>
            Website checkout only. Open a row for delivery details and line items. Status drives payment and shipping labels until you add separate payment fields.
          </p>
        </div>
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
              You have {attentionCount} paid order{attentionCount === 1 ? '' : 's'} still waiting to be delivered. Mark shipped or delivered when you send them out.
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

      {banner ? (
        <div
          role="status"
          className={
            'mt-4 flex items-center gap-2 rounded-2xl border px-4 py-3 text-[13px] font-medium ' +
            (banner.type === 'ok'
              ? ad(theme, 'border-emerald-200 bg-emerald-50 text-emerald-900', 'border-emerald-800/50 bg-emerald-950/40 text-emerald-200')
              : ad(theme, 'border-rose-200 bg-rose-50 text-rose-900', 'border-rose-900/40 bg-rose-950/30 text-rose-200'))
          }
        >
          <span className="material-symbols-outlined text-[20px] font-light">{banner.type === 'ok' ? 'check_circle' : 'error'}</span>
          {banner.text}
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
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
          <p className={muted + ' mt-1 text-[11px]'}>Delivered / fulfilled totals</p>
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
      </div>

      <div className={'mt-6 min-w-0 ' + cardWrap}>
        <div className={'flex flex-nowrap gap-2 overflow-x-auto border-b px-3 py-2 [-webkit-overflow-scrolling:touch] sm:px-4 ' + ad(theme, 'border-stone-100', 'border-neutral-800')}>
          <button
            type="button"
            onClick={() => setListTab('all')}
            className={
              'shrink-0 rounded-lg px-4 py-2.5 text-[13px] font-bold transition sm:py-2 ' +
              (listTab === 'all'
                ? ad(theme, 'bg-emerald-600 text-white', 'bg-emerald-600 text-white')
                : ad(theme, 'text-stone-600 hover:bg-stone-50', 'text-neutral-400 hover:bg-neutral-800/60'))
            }
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setListTab('attention')}
            className={
              'relative shrink-0 rounded-lg px-4 py-2.5 text-[13px] font-bold transition sm:py-2 ' +
              (listTab === 'attention'
                ? ad(theme, 'bg-emerald-600 text-white', 'bg-emerald-600 text-white')
                : ad(theme, 'text-stone-600 hover:bg-stone-50', 'text-neutral-400 hover:bg-neutral-800/60'))
            }
          >
            Attention
            {attentionCount > 0 ? (
              <span
                className={
                  'absolute top-1.5 right-1.5 size-2 rounded-full bg-rose-500 ring-2 sm:top-2 sm:right-2 ' +
                  ad(theme, 'ring-white', 'ring-neutral-900')
                }
                aria-hidden
              />
            ) : null}
          </button>
        </div>

        <div
          className={
            'flex flex-col gap-2.5 border-b px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 sm:px-4 ' +
            ad(theme, 'border-stone-100 bg-stone-50/40', 'border-neutral-800 bg-neutral-950/25')
          }
        >
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-1 sm:flex-wrap sm:gap-2">
            <select className={selectField(theme)} value={range} aria-label="Date range" onChange={(e) => setRange(e.target.value as DateRangeFilter)}>
              {DATE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <select className={selectField(theme)} value={statusFilter} aria-label="Order status" onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Order status · All</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
            <select
              className={selectField(theme) + ' col-span-2 w-full sm:max-w-[200px]'}
              value={paymentFilter}
              aria-label="Payment status"
              onChange={(e) => setPaymentFilter(e.target.value as 'all' | 'paid' | 'unpaid')}
            >
              <option value="all">Payment · All</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
          <div className={'relative min-h-[44px] w-full min-w-0 sm:max-w-xs sm:flex-1 ' + ad(theme, '', '')}>
            <span className={'material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[20px] ' + muted}>search</span>
            <input
              type="search"
              placeholder="Search orders…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={selectField(theme) + ' h-full min-h-[44px] w-full pl-11'}
            />
          </div>
        </div>

        <div className="hidden w-full min-w-0 overflow-hidden md:block">
          <table className="w-full min-w-0 table-fixed border-collapse text-left">
            <colgroup>
              <col style={{ width: '3%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '16%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className={th}>
                  <input type="checkbox" className="rounded border-stone-300" checked={filtered.length > 0 && filtered.every((o) => selected.has(o.id))} onChange={toggleAllVisible} aria-label="Select all" />
                </th>
                <th className={th}>Order</th>
                <th className={th + ' text-right'}>Total</th>
                <th className={th}>Status</th>
                <th className={th}>Payment</th>
                <th className={th}>Shipping</th>
                <th className={th}>When</th>
                <th className={th}> </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className={td + ' py-16 text-center ' + muted}>
                    No orders match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => {
                  const pay = paymentPill(o.status, theme)
                  const ship = shippingPill(o.status, theme)
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
                        <p className={'break-words font-semibold leading-snug ' + ad(theme, 'text-stone-900', 'text-white')}>
                          <span className={'font-mono text-[11px] ' + ad(theme, 'text-stone-500', 'text-neutral-400')}>{orderRefShort(o.id)}</span>
                          <span className={ad(theme, 'text-stone-400', 'text-neutral-500')}> · </span>
                          {name}
                        </p>
                        <p className={'mt-0.5 line-clamp-2 break-words text-[11px] leading-snug ' + muted}>{summary}</p>
                      </td>
                      <td className={td + ' text-right text-[12px] font-bold tabular-nums sm:text-[13px] ' + ad(theme, 'text-emerald-700', 'text-emerald-300')}>
                        {formatNaira(Number(o.total_ngn) || 0)}
                      </td>
                      <td className={td + ' min-w-0'}>
                        <span className={'inline-flex max-w-full truncate rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase sm:text-[10px] ' + adminStatusPillClass(o.status, theme)}>{o.status}</span>
                      </td>
                      <td className={td + ' min-w-0'}>
                        <span className={'inline-flex max-w-full truncate rounded-full px-1.5 py-0.5 text-[9px] font-bold sm:text-[10px] ' + pay.cls}>{pay.label}</span>
                      </td>
                      <td className={td + ' min-w-0'}>
                        <span className={'inline-flex max-w-full truncate rounded-full px-1.5 py-0.5 text-[9px] font-bold sm:text-[10px] ' + ship.cls}>{ship.label}</span>
                      </td>
                      <td className={td + ' min-w-0 break-words text-[11px] leading-snug ' + muted}>{formatOrderWhen(o.created_at)}</td>
                      <td className={td + ' min-w-0'} onClick={(e) => e.stopPropagation()}>
                        <select
                          value={o.status}
                          disabled={updating === o.id}
                          onChange={(e) => void onStatusChange(o.id, e.target.value)}
                          className={statusSelect}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {[...new Set([...STATUS_OPTIONS, o.status])].map((s) => (
                            <option key={s} value={s}>
                              {s}
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
              const pay = paymentPill(o.status, theme)
              const ship = shippingPill(o.status, theme)
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
                    <p className={'font-mono text-[11px] ' + muted}>{orderRefShort(o.id)}</p>
                    <p className={'text-[15px] font-semibold ' + ad(theme, 'text-stone-900', 'text-white')}>{customerDisplayName(o)}</p>
                    <p className={'mt-0.5 line-clamp-2 text-[12px] ' + muted}>{orderLineSummary(o.line_items)}</p>
                    <p className={'mt-2 text-lg font-bold tabular-nums ' + ad(theme, 'text-emerald-700', 'text-emerald-300')}>{formatNaira(Number(o.total_ngn) || 0)}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className={'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ' + adminStatusPillClass(o.status, theme)}>{o.status}</span>
                      <span className={'rounded-full px-2 py-0.5 text-[10px] font-bold ' + pay.cls}>{pay.label}</span>
                      <span className={'rounded-full px-2 py-0.5 text-[10px] font-bold ' + ship.cls}>{ship.label}</span>
                    </div>
                    <p className={muted + ' mt-2 text-[11px]'}>{formatOrderWhen(o.created_at)}</p>
                  </button>
                  <div className="px-3 py-3">
                    <label className={'mb-1 block text-[10px] font-bold uppercase ' + muted}>Update status</label>
                    <select value={o.status} disabled={updating === o.id} onChange={(e) => void onStatusChange(o.id, e.target.value)} className={'w-full ' + statusSelect}>
                      {[...new Set([...STATUS_OPTIONS, o.status])].map((s) => (
                        <option key={s} value={s}>
                          {s}
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
    </div>
  )
}
