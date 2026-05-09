import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
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
import { ad } from './adminUi.ts'

const formatNaira = (n: number) => `₦${Math.round(n).toLocaleString()}`

function RangeTabs({
  value,
  onChange,
  theme,
}: {
  value: DateRangeFilter
  onChange: (v: DateRangeFilter) => void
  theme: 'light' | 'dark'
}) {
  const tabs: { id: DateRangeFilter; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: '7d', label: '7 days' },
    { id: '30d', label: '30 days' },
    { id: 'all', label: 'All time' },
  ]
  return (
    <div
      className={ad(
        theme,
        'inline-flex rounded-lg border border-zinc-200/90 bg-white p-0.5 shadow-sm',
        'inline-flex rounded-lg border border-zinc-800 bg-zinc-900/50 p-0.5',
      )}
      role="tablist"
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={[
            'rounded-md px-3 py-1.5 text-[12px] font-semibold tracking-tight transition-colors',
            value === t.id
              ? ad(theme, 'bg-zinc-900 text-white shadow-sm', 'bg-zinc-100 text-zinc-900')
              : ad(theme, 'text-zinc-500 hover:text-zinc-800', 'text-zinc-500 hover:text-zinc-200'),
          ].join(' ')}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

function Kpi({
  label,
  value,
  sub,
  icon,
  theme,
}: {
  label: string
  value: string
  sub?: string
  icon: string
  theme: 'light' | 'dark'
}) {
  return (
    <div
      className={ad(
        theme,
        'rounded-xl border border-zinc-200/90 bg-white p-5 shadow-sm',
        'rounded-xl border border-zinc-800/90 bg-[#0c0c0e] p-5',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={ad(
              theme,
              'text-[11px] font-semibold uppercase tracking-wider text-zinc-500',
              'text-[11px] font-semibold uppercase tracking-wider text-zinc-500',
            )}
          >
            {label}
          </p>
          <p className="mt-2 font-sans text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          {sub ? (
            <p className={ad(theme, 'mt-1 text-[12px] text-zinc-500', 'mt-1 text-[12px] text-zinc-500')}>{sub}</p>
          ) : null}
        </div>
        <span
          className={ad(
            theme,
            'flex size-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600',
            'flex size-10 items-center justify-center rounded-lg bg-zinc-800/80 text-zinc-300',
          )}
          style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
        >
          <span className="material-symbols-outlined text-[22px] leading-none">{icon}</span>
        </span>
      </div>
    </div>
  )
}

function Panel({
  title,
  action,
  children,
  theme,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  theme: 'light' | 'dark'
}) {
  return (
    <div
      className={ad(
        theme,
        'overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm',
        'overflow-hidden rounded-xl border border-zinc-800/90 bg-[#0c0c0e]',
      )}
    >
      <div
        className={ad(
          theme,
          'flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4',
          'flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 px-5 py-4',
        )}
      >
        <h2 className="font-sans text-[15px] font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

export function AdminDashboardPage() {
  const { theme } = useAdminTheme()
  const [orders, setOrders] = useState<AdminOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<DateRangeFilter>('today')

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

  const pendingAll = useMemo(() => orders.filter((o) => isPendingStatus(o.status)), [orders])
  const completedAll = useMemo(() => orders.filter((o) => isCompletedStatus(o.status)), [orders])

  const topStates = useMemo(() => topStatesByRevenue(orders, 8), [orders])
  const maxStateRev = topStates[0]?.revenue ?? 1

  const recentOrders = orders.slice(0, 7)
  const recentTx = orders.slice(0, 10)

  const rowBorder = ad(theme, 'border-zinc-100', 'border-zinc-800/80')
  const muted = ad(theme, 'text-zinc-500', 'text-zinc-500')
  const strong = ad(theme, 'text-zinc-900', 'text-zinc-100')

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <div
          className={ad(
            theme,
            'size-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-800',
            'size-8 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-200',
          )}
        />
        <p className={muted + ' text-sm'}>Syncing ledger…</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-sans text-2xl font-semibold tracking-tight sm:text-[26px]">Overview</h1>
          <p className={muted + ' mt-1 max-w-xl text-sm leading-relaxed'}>
            Performance for the selected window. Figures derive from checkout orders in Supabase.
          </p>
        </div>
        <RangeTabs value={range} onChange={setRange} theme={theme} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          theme={theme}
          icon="receipt_long"
          label={`Orders · ${range === 'today' ? 'today' : range === 'all' ? 'all time' : range}`}
          value={String(rangeStats.count)}
          sub="In selected range"
        />
        <Kpi
          theme={theme}
          icon="account_balance_wallet"
          label="Revenue · range"
          value={formatNaira(rangeStats.revenue)}
          sub="Sum of order totals"
        />
        <Kpi
          theme={theme}
          icon="hourglass_top"
          label="Pending"
          value={String(pendingAll.length)}
          sub="All statuses awaiting fulfilment"
        />
        <Kpi
          theme={theme}
          icon="check_circle"
          label="Completed"
          value={String(completedAll.length)}
          sub="Delivered / fulfilled"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5 lg:items-start">
        <div className="lg:col-span-3 space-y-6">
          <Panel
            theme={theme}
            title="Recent orders"
            action={
              <Link
                to="/admin/orders"
                className={ad(
                  theme,
                  'text-[12px] font-semibold text-tle-deep no-underline hover:underline',
                  'text-[12px] font-semibold text-tle-light no-underline hover:underline',
                )}
              >
                Open queue →
              </Link>
            }
          >
            {recentOrders.length === 0 ? (
              <p className={'px-5 py-12 text-center text-sm ' + muted}>No orders yet.</p>
            ) : (
              <ul className="divide-y">
                {recentOrders.map((o) => (
                  <li key={o.id} className={'flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 ' + rowBorder}>
                    <div className="min-w-0">
                      <p className={'truncate text-sm font-medium ' + strong}>{o.email}</p>
                      <p className={'text-[11px] ' + muted}>
                        {new Date(o.created_at).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={
                          'text-sm font-semibold tabular-nums ' +
                          ad(theme, 'text-tle-deep', 'text-tle-light')
                        }
                      >
                        {formatNaira(Number(o.total_ngn) || 0)}
                      </p>
                      <span
                        className={[
                          'mt-0.5 inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                          isCompletedStatus(o.status)
                            ? ad(
                                theme,
                                'bg-emerald-500/15 text-emerald-800',
                                'bg-emerald-500/10 text-emerald-400',
                              )
                            : isPendingStatus(o.status)
                              ? ad(
                                  theme,
                                  'bg-amber-500/15 text-amber-900',
                                  'bg-amber-500/10 text-amber-400',
                                )
                              : ad(theme, 'bg-zinc-100 text-zinc-600', 'bg-zinc-800 text-zinc-400'),
                        ].join(' ')}
                      >
                        {o.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            theme={theme}
            title="Recent transactions"
            action={
              <Link
                to="/admin/transactions"
                className={ad(
                  theme,
                  'text-[12px] font-semibold text-tle-deep no-underline hover:underline',
                  'text-[12px] font-semibold text-tle-light no-underline hover:underline',
                )}
              >
                Full ledger →
              </Link>
            }
          >
            {recentTx.length === 0 ? (
              <p className={'px-5 py-12 text-center text-sm ' + muted}>No transactions.</p>
            ) : (
              <ul className="divide-y">
                {recentTx.map((o) => (
                  <li key={o.id} className={'flex items-center justify-between gap-3 px-5 py-3 ' + rowBorder}>
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={ad(
                          theme,
                          'flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600',
                          'flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400',
                        )}
                      >
                        <span className="material-symbols-outlined text-[18px] leading-none">swap_horiz</span>
                      </span>
                      <div className="min-w-0">
                        <p className={'truncate text-[13px] font-medium ' + strong}>Order · {o.id.slice(0, 8)}…</p>
                        <p className={'text-[11px] ' + muted}>{o.email}</p>
                      </div>
                    </div>
                    <p
                      className={
                        'shrink-0 text-sm font-semibold tabular-nums ' +
                        ad(theme, 'text-tle-deep', 'text-tle-light')
                      }
                    >
                      {formatNaira(Number(o.total_ngn) || 0)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="lg:col-span-2">
          <Panel theme={theme} title="Top states · revenue">
            {topStates.length === 0 ? (
              <p className={'px-5 py-10 text-center text-sm ' + muted}>No geographic data yet.</p>
            ) : (
              <div className="space-y-4 px-5 py-5">
                {topStates.map((s) => (
                  <div key={s.state}>
                    <div className="mb-1 flex justify-between text-[12px]">
                      <span className={'font-medium ' + strong}>{s.state}</span>
                      <span className={muted + ' tabular-nums'}>
                        {formatNaira(s.revenue)} · {s.orders} orders
                      </span>
                    </div>
                    <div
                      className={ad(
                        theme,
                        'h-2 overflow-hidden rounded-full bg-zinc-100',
                        'h-2 overflow-hidden rounded-full bg-zinc-800/80',
                      )}
                    >
                      <div
                        className={'h-full rounded-full ' + ad(theme, 'bg-tle-deep', 'bg-tle-pink')}
                        style={{ width: `${Math.max(8, (s.revenue / maxStateRev) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <div
            className={ad(
              theme,
              'mt-6 rounded-xl border border-zinc-200/90 bg-white p-5 shadow-sm',
              'mt-6 rounded-xl border border-zinc-800/90 bg-[#0c0c0e] p-5',
            )}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] leading-none text-zinc-500">inventory_2</span>
              <h3 className="text-[13px] font-semibold tracking-tight">Catalog</h3>
            </div>
            <p className={muted + ' mt-2 text-[12px] leading-relaxed'}>
              Stage new SKUs in the catalog workspace. Live storefront still reads the static catalog until you wire
              Supabase.
            </p>
            <Link
              to="/admin/products"
              className={ad(
                theme,
                'mt-4 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-[12px] font-semibold text-white no-underline hover:bg-zinc-800',
                'mt-4 inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2.5 text-[12px] font-semibold text-zinc-900 no-underline hover:bg-white',
              )}
            >
              <span className="material-symbols-outlined text-[18px] leading-none">add</span>
              Manage products
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
