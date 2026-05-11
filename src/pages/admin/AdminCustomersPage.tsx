import { useEffect, useMemo, useState } from 'react'
import { fetchOrdersForAdmin } from '../../lib/adminOrders.ts'
import type { AdminOrderRow } from '../../lib/adminOrders.ts'
import { buyerRollupFromOrders, uniqueBuyerCount } from '../../lib/adminOrderAnalytics.ts'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { ad, adminFont } from './adminUi.ts'

const formatNaira = (n: number) => `₦${Math.round(n).toLocaleString()}`

export function AdminCustomersPage() {
  const { theme } = useAdminTheme()
  const [orders, setOrders] = useState<AdminOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

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

  const totalCustomers = useMemo(() => uniqueBuyerCount(orders), [orders])
  const rows = useMemo(() => buyerRollupFromOrders(orders), [orders])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((r) => r.emailNorm.includes(s) || r.emailDisplay.toLowerCase().includes(s))
  }, [rows, q])

  const muted = ad(theme, 'text-stone-500', 'text-neutral-500')
  const heading = ad(theme, 'text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl', 'text-2xl font-bold tracking-tight text-white sm:text-3xl')
  const surface = ad(
    theme,
    'rounded-2xl border border-stone-200/90 bg-white shadow-sm',
    'rounded-2xl border border-neutral-700/90 bg-neutral-900/50 shadow-sm',
  )
  const th = ad(
    theme,
    'border-b border-stone-100 bg-stone-50/95 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500 sm:px-4',
    'border-b border-neutral-800 bg-neutral-900/70 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-500 sm:px-4',
  )
  const td = ad(
    theme,
    'border-b border-stone-100/90 px-3 py-3 text-[13px] last:border-b-0 sm:px-4',
    'border-b border-neutral-800/70 px-3 py-3 text-[13px] last:border-b-0 sm:px-4',
  )

  if (loading) {
    return (
      <div className={adminFont() + ' flex min-h-[40vh] flex-col items-center justify-center gap-3 ' + muted}>
        <p className="text-[13px]">Loading customers…</p>
      </div>
    )
  }

  return (
    <div className={['mx-auto max-w-6xl space-y-6', adminFont()].join(' ')}>
      <div>
        <h1 className={heading}>Customers</h1>
        <p className={muted + ' mt-2 max-w-2xl text-[14px] leading-relaxed'}>
          Unique buyers are counted by checkout email. This list is built from the same recent orders feed as the rest of admin (newest first, up to 500 orders).
        </p>
      </div>

      <div className={surface + ' p-5 sm:p-6'}>
        <p className={ad(theme, 'text-[11px] font-semibold uppercase tracking-wide text-stone-500', 'text-[11px] font-semibold uppercase tracking-wide text-neutral-500')}>
          Total customers
        </p>
        <p className={ad(theme, 'mt-2 text-4xl font-bold tabular-nums tracking-tight text-stone-900', 'mt-2 text-4xl font-bold tabular-nums tracking-tight text-white')}>
          {totalCustomers.toLocaleString()}
        </p>
        <p className={muted + ' mt-2 text-[13px]'}>{orders.length} orders loaded · {rows.length} distinct emails</p>
      </div>

      <div className={surface + ' overflow-hidden'}>
        <div className={'flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 ' + ad(theme, 'border-stone-100', 'border-neutral-800')}>
          <p className={ad(theme, 'text-[13px] font-bold text-stone-900', 'text-[13px] font-bold text-neutral-100')}>Directory</p>
          <label className={'flex w-full flex-col gap-1 sm:max-w-sm ' + muted}>
            <span className="text-[11px] font-semibold uppercase tracking-wide">Search</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by email"
              className={ad(
                theme,
                'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[14px] text-stone-900 outline-none placeholder:text-stone-400 focus:border-emerald-500',
                'w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-[14px] text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-emerald-500',
              )}
              type="search"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr>
                <th className={th}>Email</th>
                <th className={th + ' text-right'}>Orders</th>
                <th className={th}>Last order</th>
                <th className={th + ' text-right'}>Lifetime spend</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className={td + ' py-12 text-center ' + muted}>
                    {rows.length === 0 ? 'No customers yet.' : 'No matches for that search.'}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.emailNorm} className={ad(theme, 'transition-colors hover:bg-stone-50/80', 'transition-colors hover:bg-neutral-900/40')}>
                    <td className={td + ' max-w-[240px] truncate font-medium ' + ad(theme, 'text-stone-900', 'text-neutral-100')} title={r.emailDisplay}>
                      {r.emailDisplay}
                    </td>
                    <td className={td + ' text-right tabular-nums ' + muted}>{r.orderCount}</td>
                    <td className={td + ' whitespace-nowrap tabular-nums ' + muted}>
                      {new Date(r.lastOrderAt).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className={td + ' text-right font-semibold tabular-nums ' + ad(theme, 'text-emerald-800', 'text-emerald-300')}>
                      {formatNaira(r.lifetimeSpendNgn)}
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
