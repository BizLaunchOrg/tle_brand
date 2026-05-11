import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { fetchOrderById } from '../../lib/adminOrders.ts'
import type { AdminOrderRow } from '../../lib/adminOrders.ts'
import { AdminOrderDetailView } from './AdminOrderDetailView.tsx'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { ad, adminFont } from './adminUi.ts'

type FromState = { from?: 'orders' | 'transactions' }

export function AdminOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { theme } = useAdminTheme()
  const from = (location.state as FromState | null)?.from === 'transactions' ? 'transactions' : 'orders'

  const [order, setOrder] = useState<AdminOrderRow | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!orderId?.trim()) {
      setOrder(null)
      return
    }
    const row = await fetchOrderById(orderId.trim())
    setOrder(row)
  }, [orderId])

  useEffect(() => {
    let on = true
    void (async () => {
      setLoading(true)
      await refresh()
      if (on) setLoading(false)
    })()
    return () => {
      on = false
    }
  }, [refresh])

  const backHref = from === 'transactions' ? '/admin/transactions' : '/admin/orders'
  const backLabel = from === 'transactions' ? 'Transactions' : 'Orders'
  const contextTitle = from === 'transactions' ? 'Opened from Transactions' : 'Opened from Orders'

  const muted = ad(theme, 'text-stone-500', 'text-neutral-500')
  const strong = ad(theme, 'text-stone-900', 'text-neutral-50')

  if (loading) {
    return (
      <div className={adminFont() + ' flex min-h-[40vh] flex-col items-center justify-center gap-3 ' + muted}>
        <span className="material-symbols-outlined animate-pulse text-3xl font-light text-emerald-600">receipt_long</span>
        <p className="text-[14px] font-medium">Loading order…</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className={adminFont() + ' mx-auto max-w-lg py-16 text-center'}>
        <p className={'text-lg font-bold ' + strong}>Order not found</p>
        <p className={muted + ' mt-2 text-[14px]'}>This reference is missing or you do not have access.</p>
        <button
          type="button"
          onClick={() => navigate(backHref)}
          className={
            'mt-6 rounded-2xl px-5 py-3 text-[14px] font-bold ' +
            ad(theme, 'bg-emerald-600 text-white hover:bg-emerald-700', 'bg-emerald-600 text-white hover:bg-emerald-500')
          }
        >
          Back to {backLabel}
        </button>
      </div>
    )
  }

  return <AdminOrderDetailView order={order} backHref={backHref} backLabel={backLabel} contextTitle={contextTitle} onRefresh={refresh} />
}
