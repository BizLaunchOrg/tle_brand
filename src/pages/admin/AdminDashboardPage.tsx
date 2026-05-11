import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  countAndRevenue,
  filterOrdersByRange,
  isCompletedStatus,
  isPendingStatus,
  topStatesByRevenue,
  type DateRangeFilter,
} from '../../lib/adminOrderAnalytics.ts'
import { fetchOrdersForAdmin } from '../../lib/adminOrders.ts'
import type { AdminOrderRow } from '../../lib/adminOrders.ts'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { AdminRangeTabs, adminStatusPillClass } from './adminRangeTabs.tsx'
import { ad, adminFont } from './adminUi.ts'

const formatNaira = (n: number) => `₦${Math.round(n).toLocaleString()}`

function filterOrdersByYear(orders: AdminOrderRow[], year: number) {
  return orders.filter((o) => new Date(o.created_at).getFullYear() === year)
}

function uniqueBuyerCount(orders: AdminOrderRow[]): number {
  const s = new Set<string>()
  for (const o of orders) {
    const e = (o.email || '').trim().toLowerCase()
    if (e) s.add(e)
  }
  return s.size
}

function revenueCompleted(orders: AdminOrderRow[]) {
  return orders.filter((o) => isCompletedStatus(o.status)).reduce((a, o) => a + (Number(o.total_ngn) || 0), 0)
}

function revenuePending(orders: AdminOrderRow[]) {
  return orders.filter((o) => isPendingStatus(o.status)).reduce((a, o) => a + (Number(o.total_ngn) || 0), 0)
}

function completedCount(orders: AdminOrderRow[]) {
  return orders.filter((o) => isCompletedStatus(o.status)).length
}

type OverviewTint = 'emerald' | 'sky' | 'amber' | 'rose'

function overviewShell(tint: OverviewTint, theme: 'light' | 'dark') {
  const map: Record<OverviewTint, [string, string]> = {
    emerald: ['border-emerald-100/80 bg-emerald-50/90', 'border-emerald-900/30 bg-emerald-950/25'],
    sky: ['border-sky-100/80 bg-sky-50/90', 'border-sky-900/30 bg-sky-950/25'],
    amber: ['border-amber-100/80 bg-amber-50/90', 'border-amber-900/25 bg-amber-950/20'],
    rose: ['border-rose-100/80 bg-rose-50/90', 'border-rose-900/25 bg-rose-950/20'],
  }
  const [L, D] = map[tint]
  return ad(theme, L, D)
}

function OverviewCard({
  label,
  value,
  hint,
  theme,
  icon,
  iconColor,
  tint,
}: {
  label: string
  value: string
  hint: string
  theme: 'light' | 'dark'
  icon: string
  iconColor: string
  tint: OverviewTint
}) {
  return (
    <div className={['min-w-[152px] shrink-0 snap-start rounded-2xl border p-4 shadow-sm', overviewShell(tint, theme)].join(' ')}>
      <div className="flex items-start justify-between gap-2">
        <p className={ad(theme, 'text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-600', 'text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400')}>
          {label}
        </p>
        <span className={`flex size-9 items-center justify-center rounded-xl ${iconColor}`}>
          <span className="material-symbols-outlined text-[18px] font-light leading-none text-white">{icon}</span>
        </span>
      </div>
      <p className={ad(theme, 'mt-2.5 text-xl font-bold tabular-nums tracking-tight text-stone-900', 'mt-2.5 text-xl font-bold tabular-nums tracking-tight text-neutral-50')}>
        {value}
      </p>
      <p className={ad(theme, 'mt-1 text-[11px] text-stone-600/90', 'mt-1 text-[11px] text-neutral-500')}>{hint}</p>
    </div>
  )
}

export function AdminDashboardPage() {
  const { user } = useAuth()
  const { theme } = useAdminTheme()
  const [orders, setOrders] = useState<AdminOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<DateRangeFilter>('7d')
  const [yearSel, setYearSel] = useState(() => new Date().getFullYear())

  useEffect(() => {
    let on = true
    ;(async () => {
      const rows = await fetchOrdersForAdmin(500)
      if (on) {
        setOrders(rows)
        setLoading(false)
      }
    })()
    return () => {
      on = false
    }
  }, [])

  const inRange = useMemo(() => filterOrdersByRange(orders, range), [orders, range])
  const rangeStats = useMemo(() => countAndRevenue(inRange), [inRange])
  const buyersInRange = useMemo(() => uniqueBuyerCount(inRange), [inRange])
  const completedInRange = useMemo(() => completedCount(inRange), [inRange])
  const pendingAll = useMemo(() => orders.filter((o) => isPendingStatus(o.status)), [orders])
  const completedAll = useMemo(() => orders.filter((o) => isCompletedStatus(o.status)), [orders])
  const topStates = useMemo(() => topStatesByRevenue(orders, 10), [orders])
  const recent = orders.slice(0, 12)
  const allTime = useMemo(() => countAndRevenue(orders), [orders])

  const yearOptions = useMemo(() => {
    const ys = new Set<number>()
    const y0 = new Date().getFullYear()
    for (let i = 0; i < 6; i++) ys.add(y0 - i)
    for (const o of orders) ys.add(new Date(o.created_at).getFullYear())
    return Array.from(ys).sort((a, b) => b - a)
  }, [orders])

  const inYear = useMemo(() => filterOrdersByYear(orders, yearSel), [orders, yearSel])
  const yearTotal = useMemo(() => countAndRevenue(inYear), [inYear])
  const yearSettled = useMemo(() => revenueCompleted(inYear), [inYear])
  const yearOwed = useMemo(() => revenuePending(inYear), [inYear])

  const rangeLabel =
    range === 'today' ? 'Today' : range === 'all' ? 'All time' : range === '7d' ? 'Last 7 days' : 'Last 30 days'

  const surface = ad(theme, 'rounded-2xl border border-stone-100/90 bg-white shadow-sm', 'rounded-2xl border border-neutral-800 bg-[#141816] shadow-sm')
  const th = ad(
    theme,
    'border-b border-stone-100 bg-stone-50/90 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-500',
    'border-b border-neutral-800 bg-neutral-900/50 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500',
  )
  const td = ad(
    theme,
    'border-b border-stone-50 px-3 py-2.5 text-[13px] text-stone-800',
    'border-b border-neutral-800/80 px-3 py-2.5 text-[13px] text-neutral-200',
  )
  const muted = ad(theme, 'text-stone-500', 'text-neutral-500')
  const link = ad(
    theme,
    'text-[12px] font-semibold text-emerald-700 underline decoration-emerald-200 underline-offset-2 hover:text-emerald-900',
    'text-[12px] font-semibold text-emerald-400 underline decoration-emerald-800 underline-offset-2 hover:text-emerald-200',
  )

  if (loading) {
    return (
      <div className={'flex min-h-[32vh] items-center justify-center ' + muted}>
        <p className="text-[13px]">Loading dashboard…</p>
      </div>
    )
  }

  const overviewMobile = [
    {
      label: 'Orders',
      value: String(rangeStats.count),
      hint: rangeLabel,
      icon: 'shopping_bag' as const,
      iconColor: 'bg-emerald-600',
      tint: 'emerald' as const,
    },
    {
      label: 'Sales',
      value: formatNaira(rangeStats.revenue),
      hint: 'In selected period',
      icon: 'payments' as const,
      iconColor: 'bg-sky-600',
      tint: 'sky' as const,
    },
    {
      label: 'Customers',
      value: String(buyersInRange),
      hint: 'Unique buyers',
      icon: 'group' as const,
      iconColor: 'bg-amber-500',
      tint: 'amber' as const,
    },
    {
      label: 'Completed',
      value: String(completedInRange),
      hint: 'Orders in period',
      icon: 'check_circle' as const,
      iconColor: 'bg-rose-500',
      tint: 'rose' as const,
    },
  ]

  return (
    <div className={['mx-auto max-w-6xl', adminFont()].join(' ')}>
      {/* Mobile */}
      <div className="space-y-5 lg:hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className={ad(theme, 'text-xl font-bold tracking-tight text-stone-900', 'text-xl font-bold tracking-tight text-neutral-50')}>
              Hi {user?.name?.split(' ')[0] || 'there'}
            </h1>
            <p className={muted + ' mt-0.5 text-[13px]'}>Here is how your store is performing.</p>
          </div>
          <AdminRangeTabs value={range} onChange={setRange} theme={theme} compact />
        </div>

        <div className={surface + ' p-5'}>
          <div className="flex items-center justify-between gap-2">
            <p className={ad(theme, 'text-[11px] font-semibold uppercase tracking-wide text-stone-500', 'text-[11px] font-semibold uppercase tracking-wide text-neutral-500')}>
              Total sales
            </p>
            <span className={muted + ' text-[11px]'}>{rangeLabel}</span>
          </div>
          <p className={ad(theme, 'mt-2 text-3xl font-bold tabular-nums tracking-tight text-stone-900', 'mt-2 text-3xl font-bold tabular-nums tracking-tight text-white')}>
            {formatNaira(rangeStats.revenue)}
          </p>
          <p className={muted + ' mt-1 text-[12px]'}>{rangeStats.count} orders in this period</p>
        </div>

        <div>
          <p className={ad(theme, 'mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500', 'mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500')}>
            Business overview
          </p>
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden">
            {overviewMobile.map((s) => (
              <OverviewCard key={s.label} {...s} theme={theme} />
            ))}
          </div>
        </div>

        <div className={surface + ' p-5'}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className={ad(theme, 'text-[14px] font-bold text-stone-900', 'text-[14px] font-bold text-neutral-100')}>Yearly overview</h2>
            <label className={ad(theme, 'flex items-center gap-2 text-[12px] font-medium text-stone-600', 'flex items-center gap-2 text-[12px] font-medium text-neutral-400')}>
              <span className="sr-only">Year</span>
              <select
                value={yearSel}
                onChange={(e) => setYearSel(Number(e.target.value))}
                className={ad(
                  theme,
                  'cursor-pointer rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] font-semibold text-stone-900 outline-none focus:border-emerald-500',
                  'cursor-pointer rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-[13px] font-semibold text-neutral-100 outline-none focus:border-emerald-500',
                )}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className={'rounded-xl border p-3 sm:p-4 ' + ad(theme, 'border-stone-100 bg-stone-50/50', 'border-neutral-700 bg-neutral-900/40')}>
              <p className={muted + ' text-[10px] font-semibold uppercase tracking-wide'}>Total sales</p>
              <p className={ad(theme, 'mt-1 text-lg font-bold tabular-nums text-stone-900', 'mt-1 text-lg font-bold tabular-nums text-white')}>{formatNaira(yearTotal.revenue)}</p>
            </div>
            <div className={'rounded-xl border p-3 sm:p-4 ' + ad(theme, 'border-emerald-100 bg-emerald-50/60', 'border-emerald-900/40 bg-emerald-950/20')}>
              <p className={muted + ' text-[10px] font-semibold uppercase tracking-wide'}>Total settled</p>
              <p className={ad(theme, 'mt-1 text-lg font-bold tabular-nums text-emerald-800', 'mt-1 text-lg font-bold tabular-nums text-emerald-300')}>{formatNaira(yearSettled)}</p>
            </div>
            <div className={'rounded-xl border p-3 sm:p-4 ' + ad(theme, 'border-amber-100 bg-amber-50/60', 'border-amber-900/35 bg-amber-950/20')}>
              <p className={muted + ' text-[10px] font-semibold uppercase tracking-wide'}>Pipeline (pending)</p>
              <p className={ad(theme, 'mt-1 text-lg font-bold tabular-nums text-amber-800', 'mt-1 text-lg font-bold tabular-nums text-amber-200')}>{formatNaira(yearOwed)}</p>
            </div>
            <div className={'rounded-xl border p-3 sm:p-4 ' + ad(theme, 'border-stone-100 bg-stone-50/50', 'border-neutral-700 bg-neutral-900/40')}>
              <p className={muted + ' text-[10px] font-semibold uppercase tracking-wide'}>Orders</p>
              <p className={ad(theme, 'mt-1 text-lg font-bold tabular-nums text-stone-900', 'mt-1 text-lg font-bold tabular-nums text-white')}>{yearTotal.count}</p>
            </div>
          </div>
        </div>

        <Link
          to="/admin/transactions"
          className={ad(
            theme,
            'flex items-center justify-between gap-3 rounded-2xl bg-emerald-600 px-4 py-3.5 text-white shadow-md shadow-emerald-900/20 no-underline transition active:scale-[0.99]',
            'flex items-center justify-between gap-3 rounded-2xl bg-emerald-600 px-4 py-3.5 text-white shadow-md shadow-black/30 no-underline transition active:scale-[0.99]',
          )}
        >
          <span className="material-symbols-outlined text-[26px] font-light">account_balance_wallet</span>
          <span className="flex-1 text-left text-[13px] font-semibold leading-snug">Review settlements and payouts in Transactions.</span>
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </Link>

        <div className={surface + ' p-4'}>
          <p className={ad(theme, 'text-[13px] font-bold text-stone-900', 'text-[13px] font-bold text-neutral-100')}>To-do</p>
          <ul className="mt-3 space-y-2">
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined mt-0.5 text-[18px] text-amber-500">warning</span>
              <span className={muted + ' text-[13px] leading-snug'}>
                {pendingAll.length > 0 ? (
                  <>
                    <strong className={ad(theme, 'text-stone-800', 'text-neutral-200')}>{pendingAll.length} orders</strong> need attention — review status and fulfilment.
                  </>
                ) : (
                  'No pending pipeline items. You are all caught up.'
                )}
              </span>
            </li>
          </ul>
          {pendingAll.length > 0 ? (
            <Link to="/admin/orders" className={'mt-3 inline-block ' + link}>
              Review orders →
            </Link>
          ) : null}
        </div>

        <div>
          <p className={ad(theme, 'mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500', 'mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500')}>
            Quick actions
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { to: '/admin/orders', icon: 'add_shopping_cart', label: 'Orders' },
              { to: '/admin/transactions', icon: 'payments', label: 'Wallet' },
              { to: '/', icon: 'storefront', label: 'Store' },
              { to: '/admin/account', icon: 'tune', label: 'Settings' },
            ].map((q) => (
              <Link
                key={q.label}
                to={q.to}
                className={ad(
                  theme,
                  'flex flex-col items-center gap-1.5 rounded-2xl border border-stone-100 bg-white py-3 no-underline shadow-sm transition active:scale-[0.98]',
                  'flex flex-col items-center gap-1.5 rounded-2xl border border-neutral-800 bg-[#141816] py-3 no-underline shadow-sm transition active:scale-[0.98]',
                )}
              >
                <span
                  className={ad(
                    theme,
                    'flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-700',
                    'flex size-11 items-center justify-center rounded-full bg-emerald-950/50 text-emerald-300',
                  )}
                >
                  <span className="material-symbols-outlined text-[22px] font-light">{q.icon}</span>
                </span>
                <span className={ad(theme, 'text-[10px] font-semibold text-stone-600', 'text-[10px] font-semibold text-neutral-400')}>{q.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className={ad(theme, 'text-[14px] font-bold text-stone-900', 'text-[14px] font-bold text-neutral-100')}>Recent orders</h2>
            <Link to="/admin/orders" className={link}>
              View all
            </Link>
          </div>
          <div className={surface + ' overflow-x-auto'}>
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead>
                <tr>
                  <th className={th}>When</th>
                  <th className={th}>Customer</th>
                  <th className={th + ' text-right'}>Total</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={3} className={td + ' py-8 text-center ' + muted}>
                      No orders yet.
                    </td>
                  </tr>
                ) : (
                  recent.slice(0, 6).map((o) => (
                    <tr key={o.id}>
                      <td className={td + ' whitespace-nowrap tabular-nums ' + muted}>
                        {new Date(o.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric' })}
                      </td>
                      <td className={td + ' max-w-[140px] truncate'}>{o.email}</td>
                      <td className={td + ' text-right font-semibold tabular-nums ' + ad(theme, 'text-emerald-800', 'text-emerald-300')}>
                        {formatNaira(Number(o.total_ngn) || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden lg:block">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <h1 className={ad(theme, 'text-3xl font-bold tracking-tight text-stone-900', 'text-3xl font-bold tracking-tight text-neutral-50')}>
              Hi {user?.name?.split(' ')[0] || 'there'}
            </h1>
            <p className={muted + ' mt-2 max-w-xl text-[15px] leading-relaxed'}>
              Business overview from checkout. Use the period filter for a quick pulse; yearly figures use the year selector below.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <p className={ad(theme, 'text-right text-[10px] font-semibold uppercase tracking-wide text-stone-500', 'text-right text-[10px] font-semibold uppercase tracking-wide text-neutral-500')}>
              Period
            </p>
            <AdminRangeTabs value={range} onChange={setRange} theme={theme} />
          </div>
        </div>

        <p className={ad(theme, 'mt-8 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500', 'mt-8 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500')}>
          Business overview
        </p>
        <div className="mt-3 grid grid-cols-2 gap-4 xl:grid-cols-4">
          {overviewMobile.map((s) => (
            <OverviewCard key={s.label + '-d'} {...s} theme={theme} />
          ))}
        </div>

        <div className={surface + ' mt-10 p-6'}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className={ad(theme, 'text-[16px] font-bold text-stone-900', 'text-[16px] font-bold text-neutral-100')}>Yearly overview</h2>
              <p className={muted + ' mt-1 text-[13px]'}>Totals for the selected calendar year (all channels).</p>
            </div>
            <label className={ad(theme, 'flex items-center gap-2 text-[13px] font-medium text-stone-600', 'flex items-center gap-2 text-[13px] font-medium text-neutral-400')}>
              Year
              <select
                value={yearSel}
                onChange={(e) => setYearSel(Number(e.target.value))}
                className={ad(
                  theme,
                  'cursor-pointer rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[14px] font-semibold text-stone-900 outline-none focus:border-emerald-500',
                  'cursor-pointer rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-[14px] font-semibold text-neutral-100 outline-none focus:border-emerald-500',
                )}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className={'mt-6 grid gap-4 border-t pt-6 sm:grid-cols-2 lg:grid-cols-4 ' + ad(theme, 'border-stone-100', 'border-neutral-800')}>
            <div className="rounded-2xl border border-stone-100 bg-stone-50/60 p-4">
              <p className={muted + ' text-[11px] font-semibold uppercase tracking-wide'}>Total sales</p>
              <p className={ad(theme, 'mt-2 text-xl font-bold tabular-nums text-stone-900', 'mt-2 text-xl font-bold tabular-nums text-white')}>{formatNaira(yearTotal.revenue)}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100/80 bg-emerald-50/50 p-4">
              <p className={muted + ' text-[11px] font-semibold uppercase tracking-wide'}>Total settled</p>
              <p className={ad(theme, 'mt-2 text-xl font-bold tabular-nums text-emerald-900', 'mt-2 text-xl font-bold tabular-nums text-emerald-300')}>{formatNaira(yearSettled)}</p>
              <p className={muted + ' mt-1 text-[11px]'}>Completed / delivered orders</p>
            </div>
            <div className="rounded-2xl border border-amber-100/80 bg-amber-50/50 p-4">
              <p className={muted + ' text-[11px] font-semibold uppercase tracking-wide'}>Pipeline (pending)</p>
              <p className={ad(theme, 'mt-2 text-xl font-bold tabular-nums text-amber-900', 'mt-2 text-xl font-bold tabular-nums text-amber-200')}>{formatNaira(yearOwed)}</p>
              <p className={muted + ' mt-1 text-[11px]'}>Awaiting payment / processing</p>
            </div>
            <div className="rounded-2xl border border-stone-100 bg-stone-50/60 p-4">
              <p className={muted + ' text-[11px] font-semibold uppercase tracking-wide'}>Orders</p>
              <p className={ad(theme, 'mt-2 text-xl font-bold tabular-nums text-stone-900', 'mt-2 text-xl font-bold tabular-nums text-white')}>{yearTotal.count}</p>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-3 lg:items-start">
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className={ad(theme, 'text-[16px] font-bold text-stone-900', 'text-[16px] font-bold text-neutral-100')}>Recent orders</h2>
              <Link to="/admin/orders" className={link}>
                View all
              </Link>
            </div>
            <div className={surface + ' overflow-x-auto'}>
              <table className="w-full min-w-[560px] border-collapse text-left">
                <thead>
                  <tr>
                    <th className={th}>Created</th>
                    <th className={th}>Reference</th>
                    <th className={th}>Customer</th>
                    <th className={th + ' text-right'}>Total</th>
                    <th className={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={td + ' py-10 text-center ' + muted}>
                        No orders yet.
                      </td>
                    </tr>
                  ) : (
                    recent.map((o) => (
                      <tr key={o.id} className={ad(theme, 'transition-colors hover:bg-stone-50/80', 'transition-colors hover:bg-neutral-900/40')}>
                        <td className={td + ' whitespace-nowrap tabular-nums ' + muted}>
                          {new Date(o.created_at).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className={td + ' font-mono text-[12px]'}>{o.id.slice(0, 10)}…</td>
                        <td className={td + ' max-w-[180px] truncate'}>{o.email}</td>
                        <td className={td + ' text-right font-semibold tabular-nums ' + ad(theme, 'text-emerald-800', 'text-emerald-300')}>
                          {formatNaira(Number(o.total_ngn) || 0)}
                        </td>
                        <td className={td}>
                          <span className={'inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ' + adminStatusPillClass(o.status, theme)}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className={muted + ' mt-4 text-[12px]'}>
              Need payout detail?{' '}
              <Link to="/admin/transactions" className={link}>
                Open transactions
              </Link>
              .
            </p>
          </div>

          <div>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className={ad(theme, 'text-[16px] font-bold text-stone-900', 'text-[16px] font-bold text-neutral-100')}>Top states</h2>
              <span className={muted + ' text-[11px]'}>By revenue</span>
            </div>
            <div className={surface + ' overflow-x-auto'}>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th className={th}>#</th>
                    <th className={th}>State</th>
                    <th className={th + ' text-right'}>Orders</th>
                    <th className={th + ' text-right'}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {topStates.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={td + ' py-8 text-center ' + muted}>
                        No shipping data.
                      </td>
                    </tr>
                  ) : (
                    topStates.map((row, i) => (
                      <tr key={row.state}>
                        <td className={td + ' tabular-nums ' + muted}>{i + 1}</td>
                        <td className={td + ' font-medium'}>{row.state}</td>
                        <td className={td + ' text-right tabular-nums ' + muted}>{row.orders}</td>
                        <td className={td + ' text-right font-medium tabular-nums ' + ad(theme, 'text-emerald-800', 'text-emerald-300')}>
                          {formatNaira(row.revenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className={surface + ' mt-6 px-4 py-4'}>
              <p className={ad(theme, 'text-[13px] font-bold text-stone-900', 'text-[13px] font-bold text-neutral-100')}>
                Lifetime snapshot
              </p>
              <p className={muted + ' mt-1 text-[12px] leading-relaxed'}>
                {allTime.count} orders · {formatNaira(allTime.revenue)} total revenue · {completedAll.length} completed · {pendingAll.length} pending
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
