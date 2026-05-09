import { useEffect, useState } from 'react'
import { fetchOrdersForAdmin } from '../../lib/adminOrders.ts'
import type { AdminOrderRow } from '../../lib/adminOrders.ts'

const formatNaira = (n: number) => `₦${Math.round(n).toLocaleString()}`

function formatShipping(shipping: Record<string, unknown>): string {
  const city = typeof shipping.city === 'string' ? shipping.city : ''
  const state = typeof shipping.state === 'string' ? shipping.state : ''
  const line1 = typeof shipping.line1 === 'string' ? shipping.line1 : ''
  const parts = [line1, city, state].filter(Boolean)
  return parts.join(' · ') || '—'
}

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let on = true
    ;(async () => {
      const rows = await fetchOrdersForAdmin(200)
      if (on) {
        setOrders(rows)
        setLoading(false)
      }
    })()
    return () => {
      on = false
    }
  }, [])

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-serif text-3xl font-semibold text-white">Orders</h1>
      <p className="mt-2 text-sm text-zinc-400">All customer orders (RLS: admin read policy).</p>

      {loading ? (
        <div className="mt-10 flex items-center gap-3 text-zinc-500">
          <div className="size-6 animate-spin rounded-full border-2 border-tle-pink/30 border-t-tle-pink" />
          Loading…
        </div>
      ) : orders.length === 0 ? (
        <p className="mt-10 text-sm text-zinc-500">No orders found.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10 bg-zinc-900/40">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Ship to</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.map((o) => (
                <tr key={o.id} className="text-zinc-300">
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                    {new Date(o.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{o.email}</p>
                    <p className="text-[11px] text-zinc-500">{o.id.slice(0, 8)}…</p>
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-xs">{formatShipping(o.shipping)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-400">
                    {formatNaira(Number(o.subtotal_ngn) || 0)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-tle-pink">
                    {formatNaira(Number(o.total_ngn) || 0)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-zinc-200 uppercase">
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
