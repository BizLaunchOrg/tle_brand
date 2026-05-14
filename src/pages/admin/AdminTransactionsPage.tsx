import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchOrdersForAdmin } from '../../lib/adminOrders.ts'
import type { AdminOrderRow } from '../../lib/adminOrders.ts'
import {
  countAndRevenue,
  effectiveDeliveryStatus,
  filterOrdersByRange,
  orderIsOpenPipeline,
  orderIsSettledComplete,
  type DateRangeFilter,
} from '../../lib/adminOrderAnalytics.ts'
import { firstLineItemDisplayableImage } from '../../lib/adminOrderLineSnapshots.ts'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { AdminRangeTabs, AdminStatusBucketTabs, adminDeliveryPillClass, type AdminOrderBucket } from './adminRangeTabs.tsx'
import { OrderRelativeTime } from './OrderRelativeTime.tsx'
import { ad, adminFont } from './adminUi.ts'
import { printOrdersStatement } from './statementPrint.ts'

const formatNaira = (n: number) => `₦${Math.round(n).toLocaleString()}`

function TxLineThumb({ lineItems, theme }: { lineItems: unknown; theme: 'light' | 'dark' }) {
  const [bad, setBad] = useState(false)
  const src = firstLineItemDisplayableImage(lineItems)
  if (!src || bad) {
    return (
      <div
        className={
          'flex size-12 shrink-0 items-center justify-center rounded-xl border ' +
          ad(theme, 'border-stone-200 bg-stone-100', 'border-neutral-700 bg-neutral-800')
        }
      >
        <span className="material-symbols-outlined text-[20px] opacity-50">inventory_2</span>
      </div>
    )
  }
  return (
    <img
      src={src}
      alt=""
      className="size-12 shrink-0 rounded-xl border border-black/10 object-cover"
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setBad(true)}
    />
  )
}

function overviewShell(tint: 'emerald' | 'sky' | 'amber', theme: 'light' | 'dark') {
  const map = {
    emerald: ['border-emerald-100/80 bg-emerald-50/90', 'border-emerald-900/30 bg-emerald-950/25'],
    sky: ['border-sky-100/80 bg-sky-50/90', 'border-sky-900/30 bg-sky-950/25'],
    amber: ['border-amber-100/80 bg-amber-50/90', 'border-amber-900/25 bg-amber-950/20'],
  } as const
  const [L, D] = map[tint]
  return ad(theme, L, D)
}

function rangeLabel(r: DateRangeFilter): string {
  if (r === 'today') return 'Today'
  if (r === '7d') return 'Last 7 days'
  if (r === '30d') return 'Last 30 days'
  return 'All time'
}

function bucketLabel(b: AdminOrderBucket): string {
  if (b === 'pending') return 'Pending pipeline'
  if (b === 'completed') return 'Completed only'
  return 'All statuses'
}

function detailBtn(theme: 'light' | 'dark') {
  return ad(
    theme,
    'inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-[12px] font-bold text-emerald-900 transition hover:bg-emerald-100',
    'inline-flex items-center gap-1.5 rounded-xl border border-emerald-800/50 bg-emerald-950/30 px-3 py-2 text-[12px] font-bold text-emerald-200 transition hover:bg-emerald-950/50',
  )
}

export function AdminTransactionsPage() {
  const navigate = useNavigate()
  const { theme } = useAdminTheme()
  const [orders, setOrders] = useState<AdminOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<DateRangeFilter>('today')
  const [bucket, setBucket] = useState<AdminOrderBucket>('all')
  const [actionMsg, setActionMsg] = useState<string | null>(null)
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

  const ranged = useMemo(() => filterOrdersByRange(orders, range), [orders, range])
  const filtered = useMemo(() => {
    if (bucket === 'pending') return ranged.filter((o) => orderIsOpenPipeline(o))
    if (bucket === 'completed') return ranged.filter((o) => orderIsSettledComplete(o))
    return ranged
  }, [ranged, bucket])

  const stats = useMemo(() => countAndRevenue(filtered), [filtered])
  const settled = useMemo(
    () => filtered.filter((o) => orderIsSettledComplete(o)).reduce((a, o) => a + (Number(o.total_ngn) || 0), 0),
    [filtered],
  )

  const pendingInRange = useMemo(() => ranged.filter((o) => orderIsOpenPipeline(o)).length, [ranged])
  const completedInRange = useMemo(() => ranged.filter((o) => orderIsSettledComplete(o)).length, [ranged])

  const muted = ad(theme, 'text-stone-500', 'text-neutral-500')
  const heading = ad(theme, 'text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl', 'text-2xl font-bold tracking-tight text-white sm:text-3xl')
  const cardWrap = ad(
    theme,
    'rounded-2xl border border-stone-200/90 bg-white shadow-sm',
    'rounded-2xl border border-neutral-700/90 bg-neutral-900/50 shadow-sm',
  )
  const filterCard =
    'rounded-2xl border p-4 sm:p-5 ' + ad(theme, 'border-stone-200/90 bg-white/90 shadow-sm', 'border-neutral-700/80 bg-neutral-900/35 shadow-sm')
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

  const statementSubtitle = `${rangeLabel(range)} · ${bucketLabel(bucket)} · ${filtered.length} row${filtered.length === 1 ? '' : 's'}`
  const statementNote = 'In the print dialog, choose "Save as PDF" to download a file.'

  const onPrintStatement = () => {
    setActionMsg(null)
    const ok = printOrdersStatement(filtered, { subtitle: statementSubtitle, note: statementNote })
    if (!ok) setActionMsg('Allow pop-ups for this site to print or save as PDF.')
    else setActionMsg(null)
  }

  if (loading) {
    return (
      <div className={adminFont() + ' flex min-h-[40vh] flex-col items-center justify-center gap-3 ' + muted}>
        <span className="material-symbols-outlined animate-pulse text-3xl font-light text-emerald-600">account_balance_wallet</span>
        <p className="text-[14px] font-medium">Loading transactions…</p>
      </div>
    )
  }

  return (
    <div className={adminFont() + ' mx-auto max-w-6xl pb-8'}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/25">
              <span className="material-symbols-outlined text-[22px] font-light">payments</span>
            </span>
            <h1 className={heading}>Transactions</h1>
          </div>
          <p className={muted + ' mt-2 max-w-xl text-[13px]'}>One row per order. View opens the order.</p>
        </div>
        <div className="flex w-full shrink-0 flex-col items-stretch gap-2 lg:w-auto lg:items-end">
          <button
            type="button"
            onClick={onPrintStatement}
            className={
              'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[14px] font-bold shadow-md shadow-emerald-600/20 transition hover:brightness-105 active:scale-[0.99] ' +
              ad(theme, 'bg-emerald-600 text-white', 'bg-emerald-600 text-white')
            }
          >
            <span className="material-symbols-outlined text-[22px] font-light">picture_as_pdf</span>
            Download statement
          </button>
          <p className={muted + ' max-w-[260px] text-center text-[11px] lg:text-right'}>Print dialog → Save as PDF.</p>
        </div>
      </div>

      {actionMsg ? (
        <p
          className={
            'mt-4 rounded-2xl border px-4 py-3 text-[13px] font-medium ' +
            ad(theme, 'border-amber-200 bg-amber-50 text-amber-950', 'border-amber-800/50 bg-amber-950/40 text-amber-100')
          }
        >
          {actionMsg}
        </p>
      ) : null}

      <div className={'mt-6 ' + filterCard}>
        <p className={ad(theme, 'text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500', 'text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500')}>
          Date range
        </p>
        <p className={muted + ' mt-1 text-[12px]'}>Filters this list and the statement.</p>
        <div className="mt-3">
          <AdminRangeTabs value={range} onChange={setRange} theme={theme} compact />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className={'rounded-2xl border p-4 shadow-sm ' + overviewShell('emerald', theme)}>
          <p className={ad(theme, 'text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-800/80', 'text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300/90')}>
            In this view
          </p>
          <p className={ad(theme, 'mt-2 text-2xl font-bold tabular-nums text-stone-900', 'mt-2 text-2xl font-bold tabular-nums text-white')}>{stats.count}</p>
          <p className={muted + ' mt-1 text-[11px]'}>Transactions listed</p>
        </div>
        <div className={'rounded-2xl border p-4 shadow-sm ' + overviewShell('sky', theme)}>
          <p className={ad(theme, 'text-[10px] font-bold uppercase tracking-[0.12em] text-sky-900/75', 'text-[10px] font-bold uppercase tracking-[0.12em] text-sky-200/90')}>
            Gross total
          </p>
          <p className={ad(theme, 'mt-2 text-xl font-bold tabular-nums text-stone-900 sm:text-2xl', 'mt-2 text-xl font-bold tabular-nums text-white sm:text-2xl')}>{formatNaira(stats.revenue)}</p>
          <p className={muted + ' mt-1 text-[11px]'}>All amounts in view</p>
        </div>
        <div className={'rounded-2xl border p-4 shadow-sm ' + overviewShell('emerald', theme)}>
          <p className={ad(theme, 'text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-900/80', 'text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300/90')}>
            Settled
          </p>
          <p className={ad(theme, 'mt-2 text-xl font-bold tabular-nums text-emerald-800 sm:text-2xl', 'mt-2 text-xl font-bold tabular-nums text-emerald-300 sm:text-2xl')}>{formatNaira(settled)}</p>
          <p className={muted + ' mt-1 text-[11px]'}>Completed / delivered</p>
        </div>
      </div>

      <div className={'mt-6 ' + filterCard}>
        <p className={ad(theme, 'text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500', 'text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500')}>
          Status
        </p>
        <div className="mt-3">
          <AdminStatusBucketTabs
            value={bucket}
            onChange={setBucket}
            theme={theme}
            counts={{
              all: ranged.length,
              pending: pendingInRange,
              completed: completedInRange,
            }}
          />
        </div>
        <p className={muted + ' mt-3 text-[12px]'}>
          Statement uses only rows shown here (up to 500 loaded).
        </p>
      </div>

      <div className="mt-6 space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <div className={'rounded-2xl border px-4 py-14 text-center text-[14px] ' + cardWrap + ' ' + muted}>Nothing in this view.</div>
        ) : (
          filtered.map((o) => (
            <div key={o.id} className={'rounded-2xl border p-4 ' + cardWrap}>
              <div className="flex items-start gap-3">
                <TxLineThumb lineItems={o.line_items} theme={theme} />
                <div className="min-w-0 flex-1">
                  <p className={'font-mono text-[11px] ' + muted}>{o.id.slice(0, 12)}…</p>
                  <p className={'truncate font-semibold ' + ad(theme, 'text-stone-900', 'text-white')}>{o.email}</p>
                  <div className={muted + ' mt-1 text-[12px]'}>
                    <OrderRelativeTime iso={o.created_at} theme={theme} />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className={ad(theme, 'text-lg font-bold tabular-nums text-emerald-700', 'text-lg font-bold tabular-nums text-emerald-300')}>{formatNaira(Number(o.total_ngn) || 0)}</p>
                  <span className={'mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ' + adminDeliveryPillClass(effectiveDeliveryStatus(o), theme)}>
                    {effectiveDeliveryStatus(o)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/admin/orders/${encodeURIComponent(o.id)}`, { state: { from: 'transactions' } })}
                className={'mt-4 w-full justify-center ' + detailBtn(theme)}
              >
                <span className="material-symbols-outlined text-[18px] font-light">visibility</span>
                View full details
              </button>
            </div>
          ))
        )}
      </div>

      <div className={'mt-6 hidden overflow-hidden md:block ' + cardWrap}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr>
                <th className={th + ' w-14'} aria-label="Preview" />
                <th className={th}>Time</th>
                <th className={th}>Reference</th>
                <th className={th}>Customer</th>
                <th className={th + ' text-right'}>Amount</th>
                <th className={th}>Status</th>
                <th className={th}>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className={td + ' py-16 text-center ' + muted}>
                    Nothing in this view.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className={ad(theme, 'transition-colors hover:bg-emerald-50/40', 'transition-colors hover:bg-emerald-950/15')}>
                    <td className={td + ' align-middle'}>
                      <TxLineThumb lineItems={o.line_items} theme={theme} />
                    </td>
                    <td className={td + ' max-w-[120px] whitespace-normal'}>
                      <OrderRelativeTime iso={o.created_at} theme={theme} />
                    </td>
                    <td className={td + ' font-mono text-[12px] ' + ad(theme, 'text-stone-700', 'text-neutral-300')}>{o.id.slice(0, 14)}…</td>
                    <td className={td + ' max-w-[200px] truncate font-medium ' + ad(theme, 'text-stone-900', 'text-neutral-100')}>{o.email}</td>
                    <td className={td + ' text-right text-[14px] font-bold tabular-nums ' + ad(theme, 'text-emerald-700', 'text-emerald-300')}>
                      {formatNaira(Number(o.total_ngn) || 0)}
                    </td>
                    <td className={td}>
                      <span className={'inline-block rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ' + adminDeliveryPillClass(effectiveDeliveryStatus(o), theme)}>
                        {effectiveDeliveryStatus(o)}
                      </span>
                    </td>
                    <td className={td}>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/orders/${encodeURIComponent(o.id)}`, { state: { from: 'transactions' } })}
                        className={detailBtn(theme)}
                      >
                        <span className="material-symbols-outlined text-[18px] font-light">visibility</span>
                        View
                      </button>
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
