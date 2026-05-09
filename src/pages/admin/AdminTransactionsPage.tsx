import { useEffect, useMemo, useState } from 'react'
import { fetchOrdersForAdmin } from '../../lib/adminOrders.ts'
import type { AdminOrderRow } from '../../lib/adminOrders.ts'
import { isCompletedStatus, isPendingStatus } from '../../lib/adminOrderAnalytics.ts'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { ad } from './adminUi.ts'

const formatNaira = (n: number) => `₦${Math.round(n).toLocaleString()}`

export function AdminTransactionsPage() {
  const { theme } = useAdminTheme()
  const [orders, setOrders] = useState<AdminOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')

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

  const filtered = useMemo(() => {
    if (filter === 'pending') return orders.filter((o) => isPendingStatus(o.status))
    if (filter === 'completed') return orders.filter((o) => isCompletedStatus(o.status))
    return orders
  }, [orders, filter])

  const muted = ad(theme, 'text-zinc-500', 'text-zinc-500')
  const strong = ad(theme, 'text-zinc-900', 'text-zinc-100')
  const card = ad(
    theme,
    'rounded-xl border border-zinc-200/90 bg-white shadow-sm',
    'rounded-xl border border-zinc-800/90 bg-[#0c0c0e]',
  )

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
    <div className="mx-auto max-w-4xl">
      <h1 className="font-sans text-2xl font-semibold tracking-tight">Transactions</h1>
      <p className={muted + ' mt-1 text-sm'}>Each row is a checkout capture (pay-on-delivery flow).</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" className={chip(filter === 'all')} onClick={() => setFilter('all')}>
          All · {orders.length}
        </button>
        <button type="button" className={chip(filter === 'pending')} onClick={() => setFilter('pending')}>
          Pending · {orders.filter((o) => isPendingStatus(o.status)).length}
        </button>
        <button type="button" className={chip(filter === 'completed')} onClick={() => setFilter('completed')}>
          Completed · {orders.filter((o) => isCompletedStatus(o.status)).length}
        </button>
      </div>

      <ul className="mt-6 space-y-3">
        {filtered.map((o) => (
          <li key={o.id} className={card + ' flex flex-wrap items-center justify-between gap-4 p-4'}>
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={ad(
                  theme,
                  'flex size-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600',
                  'flex size-11 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400',
                )}
              >
                <span className="material-symbols-outlined text-[24px] leading-none">payments</span>
              </span>
              <div className="min-w-0">
                <p className={'font-mono text-[12px] font-medium ' + strong}>{o.id.slice(0, 13)}…</p>
                <p className={'truncate text-[13px] ' + strong}>{o.email}</p>
                <p className={'text-[11px] ' + muted}>
                  {new Date(o.created_at).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={'text-lg font-semibold tabular-nums ' + ad(theme, 'text-tle-deep', 'text-tle-light')}>
                {formatNaira(Number(o.total_ngn) || 0)}
              </p>
              <p className={'text-[11px] ' + muted}>COD / manual settlement</p>
              <span
                className={[
                  'mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                  isCompletedStatus(o.status)
                    ? ad(theme, 'bg-emerald-500/15 text-emerald-800', 'bg-emerald-500/10 text-emerald-400')
                    : isPendingStatus(o.status)
                      ? ad(theme, 'bg-amber-500/15 text-amber-900', 'bg-amber-500/10 text-amber-400')
                      : ad(theme, 'bg-zinc-100 text-zinc-600', 'bg-zinc-800 text-zinc-400'),
                ].join(' ')}
              >
                {o.status}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? <p className={muted + ' mt-8 text-center text-sm'}>No transactions in this view.</p> : null}
    </div>
  )
}
