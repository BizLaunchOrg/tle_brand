import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchOrdersForAdmin } from '../../lib/adminOrders.ts'
import type { AdminOrderRow } from '../../lib/adminOrders.ts'

const formatNaira = (n: number) => `₦${Math.round(n).toLocaleString()}`

export function AdminDashboardPage() {
  const [orders, setOrders] = useState<AdminOrderRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let on = true
    ;(async () => {
      const rows = await fetchOrdersForAdmin(100)
      if (on) {
        setOrders(rows)
        setLoading(false)
      }
    })()
    return () => {
      on = false
    }
  }, [])

  const totalRevenue = orders.reduce((s, o) => s + (Number(o.total_ngn) || 0), 0)
  const pending = orders.filter((o) => o.status === 'pending').length
  const recent = orders.slice(0, 6)

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-serif text-3xl font-semibold text-white">Dashboard</h1>
      <p className="mt-2 max-w-lg text-sm text-zinc-400">
        Overview of orders and revenue. Access is tied to your normal sign-in and Supabase admin allowlist.
      </p>

      {loading ? (
        <div className="mt-10 flex items-center gap-3 text-zinc-500">
          <div className="size-6 animate-spin rounded-full border-2 border-tle-pink/30 border-t-tle-pink" />
          Loading data…
        </div>
      ) : (
        <>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
              <p className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">Orders</p>
              <p className="mt-2 font-sans text-3xl font-semibold text-white">{orders.length}</p>
              <p className="mt-1 text-xs text-zinc-500">Last 100 loaded</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
              <p className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">Pending</p>
              <p className="mt-2 font-sans text-3xl font-semibold text-tle-pink">{pending}</p>
              <p className="mt-1 text-xs text-zinc-500">Status = pending</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
              <p className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">Revenue (totals)</p>
              <p className="mt-2 font-sans text-2xl font-semibold text-white">{formatNaira(totalRevenue)}</p>
              <p className="mt-1 text-xs text-zinc-500">Sum of order totals in view</p>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-zinc-900/40">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="font-sans text-lg font-semibold text-white">Recent orders</h2>
              <Link to="/admin/orders" className="text-[12px] font-semibold text-tle-pink no-underline hover:underline">
                View all
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-zinc-500">No orders yet.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {recent.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-white">{o.email}</p>
                      <p className="text-[11px] text-zinc-500">
                        {new Date(o.created_at).toLocaleString()} · {o.status}
                      </p>
                    </div>
                    <p className="font-medium text-tle-pink">{formatNaira(Number(o.total_ngn) || 0)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
