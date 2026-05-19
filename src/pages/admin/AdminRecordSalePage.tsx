import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { fetchCatalogProducts, type CatalogProductRow } from '../../lib/adminCatalog'
import { insertOfflineOrder, type AdminOrderRow } from '../../lib/adminOrders'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { AdminOfflineProductForm } from './AdminOfflineProductForm.tsx'
import { ad, adminFont } from './adminUi'
import { parseProductPriceNgn } from '../../data/products'
import { useAuth } from '../../context/AuthContext'

const SOURCES = [
  { id: 'physical', label: 'Physical sales', icon: 'material:storefront' },
  { id: 'instagram', label: 'Instagram', icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg' },
  { id: 'facebook', label: 'Facebook', icon: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg' },
  { id: 'tiktok', label: 'TikTok', icon: 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg' },
]

interface SelectedProduct {
  id: string
  variantId: string
  quantity: number
  price: number
}

type SaleView = 'form' | 'products' | 'add_product'

export function AdminRecordSalePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { theme } = useAdminTheme()
  const [view, setView] = useState<SaleView>('form')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [catalog, setCatalog] = useState<CatalogProductRow[]>([])
  const [search, setSearch] = useState('')
  const [justAddedCatalogId, setJustAddedCatalogId] = useState<string | null>(null)

  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])
  const [source, setSource] = useState('physical')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [address, setAddress] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'paid' | 'partially_paid'>('paid')
  const [deliveryStatus, setDeliveryStatus] = useState<'pending' | 'processing' | 'delivered'>('pending')
  const [selectedItems, setSelectedItems] = useState<SelectedProduct[]>([])
  const [notes, setNotes] = useState('')

  useEffect(() => {
    void (async () => {
      const p = await fetchCatalogProducts()
      setCatalog(p)
      setLoading(false)
    })()
  }, [])

  const filteredCatalog = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return catalog
    return catalog.filter(
      (c) => c.payload.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
    )
  }, [catalog, search])

  const totalAmount = useMemo(() => {
    return selectedItems.reduce((acc, item) => acc + item.price * item.quantity, 0)
  }, [selectedItems])

  const addCatalogRowToSale = useCallback((row: CatalogProductRow) => {
    const price = parseProductPriceNgn(row.payload.price)
    setSelectedItems((prev) => {
      const existing = prev.find((item) => item.id === row.id)
      if (existing) return prev
      return [
        ...prev,
        {
          id: row.id,
          variantId: row.payload.colorOptions?.[0]?.id || '',
          quantity: 1,
          price,
        },
      ]
    })
  }, [])

  const handleNewProductSaved = (row: CatalogProductRow) => {
    setCatalog((prev) => [row, ...prev.filter((r) => r.id !== row.id)])
    setJustAddedCatalogId(row.id)
    addCatalogRowToSale(row)
    setView('form')
    toast.success(`${row.payload.name} added to this sale`)
  }

  const toggleProduct = (prod: CatalogProductRow) => {
    const existing = selectedItems.find((item) => item.id === prod.id)
    if (existing) {
      setSelectedItems((prev) => prev.filter((item) => item.id !== prod.id))
    } else {
      addCatalogRowToSale(prod)
    }
  }

  const updateItem = (id: string, updates: Partial<SelectedProduct>) => {
    setSelectedItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }

  const handleSubmit = async () => {
    if (!customerName) {
      toast.error('Enter customer name')
      return
    }
    if (selectedItems.length === 0) {
      toast.error('Select or add at least one product')
      return
    }

    setSubmitting(true)

    const lineItems = selectedItems
      .map((item) => {
        const p = catalog.find((c) => c.id === item.id)?.payload
        if (!p) return null
        const variant = p.colorOptions?.find((v) => v.id === item.variantId)
        return {
          id: p.slug,
          slug: p.slug,
          name: p.name,
          quantity: item.quantity,
          price: item.price,
          variantId: item.variantId,
          variantLabel: variant?.label || '',
        }
      })
      .filter(Boolean)

    const order: Partial<AdminOrderRow> = {
      user_id: user?.id || '',
      created_at: new Date(orderDate).toISOString(),
      email: customerPhone ? `${customerPhone}@offline.sale` : `offline-${Date.now()}@tobilicious.com`,
      shipping: {
        fullName: customerName,
        phone: customerPhone,
        address: address,
        source: source,
        isOffline: true,
        notes: notes,
      },
      line_items: lineItems,
      subtotal_ngn: totalAmount,
      delivery_ngn: 0,
      processing_ngn: 0,
      total_ngn: totalAmount,
      status: paymentStatus === 'paid' ? 'paid' : 'pending',
      payment_status: paymentStatus === 'paid' ? 'paid' : 'unpaid',
      delivery_status: deliveryStatus,
    }

    const res = await insertOfflineOrder(order)
    if (res.ok) {
      toast.success('Offline order recorded successfully')
      navigate('/admin/orders')
    } else {
      toast.error(res.message)
      setSubmitting(false)
    }
  }

  const muted = ad(theme, 'text-stone-500', 'text-neutral-500')
  const border = ad(theme, 'border-stone-200', 'border-neutral-800')
  const panel = ad(theme, 'bg-white', 'bg-neutral-950')
  const inputCls = ad(
    theme,
    'w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-emerald-500',
    'w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-[15px] outline-none focus:border-emerald-500 text-white',
  )
  const labelCls = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider ' + muted

  if (loading) {
    return (
      <div className={adminFont() + ' flex min-h-[60vh] flex-col items-center justify-center gap-3 ' + muted}>
        <span className="material-symbols-outlined animate-spin text-3xl text-emerald-600">sync</span>
        <p>Loading products...</p>
      </div>
    )
  }

  if (view === 'add_product') {
    return (
      <AdminOfflineProductForm
        theme={theme}
        onCancel={() => setView(justAddedCatalogId ? 'form' : 'products')}
        onSaved={handleNewProductSaved}
      />
    )
  }

  if (view === 'products') {
    return (
      <div className={adminFont() + ' min-h-screen ' + panel}>
        <div className={'sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3 ' + panel + ' ' + border}>
          <button type="button" onClick={() => setView('form')} className="flex items-center gap-1 font-bold text-emerald-600">
            <span className="material-symbols-outlined">chevron_left</span>
            Back
          </button>
          <h2 className="text-lg font-bold">Select products</h2>
          <button type="button" onClick={() => setView('form')} className="font-bold text-emerald-600">
            Done
          </button>
        </div>

        <div className="p-4 pb-32">
          <button
            type="button"
            onClick={() => setView('add_product')}
            className={
              'mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 py-3.5 text-[14px] font-bold transition-all ' +
              (justAddedCatalogId
                ? ad(theme, 'border-emerald-400 bg-emerald-50 text-emerald-800', 'border-emerald-700 bg-emerald-950/40 text-emerald-100')
                : ad(theme, 'border-dashed border-emerald-400 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100', 'border-dashed border-emerald-600 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-950/50'))
            }
          >
            <span className="material-symbols-outlined text-[22px]">
              {justAddedCatalogId ? 'check_circle' : 'add_box'}
            </span>
            {justAddedCatalogId ? 'Product added — add another?' : 'Add new product'}
          </button>

          <div className="relative mb-6">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">search</span>
            <input
              type="text"
              placeholder="Search products..."
              className={inputCls + ' pl-10'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="space-y-0 divide-y">
            {filteredCatalog.map((prod) => {
              const selected = selectedItems.find((item) => item.id === prod.id)
              const p = prod.payload
              const justAdded = prod.id === justAddedCatalogId
              return (
                <div
                  key={prod.id}
                  onClick={() => toggleProduct(prod)}
                  className={
                    'flex cursor-pointer items-center gap-4 py-4 transition-all active:bg-stone-100 ' +
                    (selected ? 'bg-emerald-50/30' : '') +
                    (justAdded ? ' ring-2 ring-inset ring-emerald-400' : '')
                  }
                >
                  <div
                    className={
                      'flex size-6 shrink-0 items-center justify-center rounded border-2 transition-colors ' +
                      (selected ? 'border-emerald-600 bg-emerald-600' : 'border-stone-300')
                    }
                  >
                    {selected && <span className="material-symbols-outlined text-[18px] font-bold text-white">check</span>}
                  </div>

                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border bg-stone-100">
                    <img src={p.img} alt="" className="size-full object-cover" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[15px] font-bold">{p.name}</h3>
                    <p className={muted + ' mt-0.5 text-[12px]'}>
                      {justAdded ? 'Just added Â· ' : ''}
                      {p.colorOptions?.length || 0} variations â€¢{' '}
                      {p.stockUnlimited ? 'In stock' : `${p.stock ?? 0} in stock`}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-[15px] font-bold">â‚¦{parseProductPriceNgn(p.price).toLocaleString()}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className={'fixed bottom-0 left-0 right-0 z-20 border-t p-4 ' + panel + ' ' + border}>
          <div className="mx-auto max-w-2xl">
            <button
              type="button"
              onClick={() => setView('form')}
              className="w-full rounded-2xl bg-emerald-700 py-4 text-lg font-bold text-white shadow-lg transition-all active:scale-[0.98]"
            >
              Done ({selectedItems.length} selected)
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={adminFont() + ' min-h-screen pb-32 ' + ad(theme, 'bg-stone-50', 'bg-black')}>
      <div className={'sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3 ' + panel + ' ' + border}>
        <button type="button" onClick={() => navigate('/admin/orders')} className="flex items-center gap-1 font-bold text-emerald-600">
          <span className="material-symbols-outlined">chevron_left</span>
          Back
        </button>
        <h2 className="text-lg font-bold">Record a sale</h2>
        <button type="button" onClick={handleSubmit} disabled={submitting} className="font-bold text-emerald-600 disabled:opacity-50">
          {submitting ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="mx-auto max-w-2xl space-y-6 p-4">
        <div className={'space-y-6 rounded-3xl border p-6 ' + panel + ' ' + border}>
          <div>
            <label className={labelCls}>Order Date</label>
            <input type="date" className={inputCls} value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex-1">
              <label className={labelCls}>Customer Name *</label>
              <input
                type="text"
                className={inputCls}
                placeholder="Full Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className={labelCls}>Phone Number (Optional)</label>
              <input
                type="tel"
                className={inputCls}
                placeholder="080..."
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Select Sales Channel</label>
            <div className="grid grid-cols-3 gap-3">
              {SOURCES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSource(s.id)}
                  className={
                    'flex flex-col items-center gap-2 rounded-2xl border p-3 transition-all ' +
                    (source === s.id
                      ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                      : ad(
                          theme,
                          'border-stone-100 bg-stone-50 hover:bg-stone-100',
                          'border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800',
                        ))
                  }
                >
                  {s.icon.startsWith('material:') ? (
                    <span className={'material-symbols-outlined text-[24px] ' + (source === s.id ? 'text-emerald-600' : muted)}>
                      {s.icon.split(':')[1]}
                    </span>
                  ) : (
                    <img src={s.icon} alt={s.label} className="size-6 object-contain" />
                  )}
                  <span className={'text-[11px] font-bold ' + (source === s.id ? 'text-emerald-800' : muted)}>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label className={labelCls + ' mb-0'}>Products</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setView('add_product')}
                  className="flex items-center gap-1 text-[13px] font-bold text-emerald-600"
                >
                  <span className="material-symbols-outlined text-[18px]">add_box</span>
                  {justAddedCatalogId ? 'Product added ✓' : 'Add new product'}
                </button>
                <button
                  type="button"
                  onClick={() => setView('products')}
                  className="flex items-center gap-1 text-[13px] font-bold text-emerald-600"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  Select products
                </button>
              </div>
            </div>

            {selectedItems.length > 0 ? (
              <div className="space-y-3">
                {selectedItems.map((item) => {
                  const prod = catalog.find((c) => c.id === item.id)?.payload
                  if (!prod) return null
                  return (
                    <div
                      key={item.id}
                      className={'rounded-2xl border p-4 ' + border + ' ' + ad(theme, 'bg-stone-50/50', 'bg-neutral-900/30')}
                    >
                      <div className="mb-4 flex gap-3">
                        <img src={prod.img} alt="" className="size-12 rounded-lg object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold">{prod.name}</p>
                          <p className={muted + ' text-[12px]'}>â‚¦{item.price.toLocaleString()}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedItems((prev) => prev.filter((i) => i.id !== item.id))}
                          className="text-rose-500"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {prod.colorOptions && prod.colorOptions.length > 0 && (
                          <div className="col-span-2 sm:col-span-1">
                            <label className="mb-1 block text-[10px] font-bold uppercase text-stone-400">Variant</label>
                            <select
                              className={inputCls + ' py-1.5 text-[13px]'}
                              value={item.variantId}
                              onChange={(e) => updateItem(item.id, { variantId: e.target.value })}
                            >
                              {prod.colorOptions.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="col-span-1">
                          <label className="mb-1 block text-[10px] font-bold uppercase text-stone-400">Qty</label>
                          <input
                            type="number"
                            min="1"
                            className={inputCls + ' py-1.5 text-[13px]'}
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="mb-1 block text-[10px] font-bold uppercase text-stone-400">Price</label>
                          <input
                            type="number"
                            className={inputCls + ' py-1.5 text-[13px]'}
                            value={item.price}
                            onChange={(e) => updateItem(item.id, { price: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div className="flex items-center justify-between rounded-2xl bg-emerald-600 p-4 font-bold text-white">
                  <span>Total Amount</span>
                  <span>â‚¦{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className={'flex flex-col items-center justify-center rounded-2xl border border-dashed py-8 ' + border + ' ' + muted}>
                <span className="material-symbols-outlined mb-2 text-4xl">shopping_cart</span>
                <p className="text-center text-[13px]">No products yet â€” add a new product or select from your catalog</p>
              </div>
            )}
          </div>

          <div>
            <label className={labelCls}>Payment Status</label>
            <div className="flex gap-2">
              {[
                { id: 'unpaid', label: 'UNPAID' },
                { id: 'paid', label: 'PAID' },
                { id: 'partially_paid', label: 'PARTIALLY PAID' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setPaymentStatus(st.id as 'unpaid' | 'paid' | 'partially_paid')}
                  className={
                    'flex-1 rounded-xl py-3 text-[11px] font-bold transition-all ' +
                    (paymentStatus === st.id
                      ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-500'
                      : ad(theme, 'bg-stone-100 text-stone-500', 'bg-neutral-800 text-neutral-400'))
                  }
                >
                  {paymentStatus === st.id && 'âœ“ '} {st.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Delivery Status</label>
            <select className={inputCls} value={deliveryStatus} onChange={(e) => setDeliveryStatus(e.target.value as typeof deliveryStatus)}>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Delivery Address (Optional)</label>
            <textarea
              className={inputCls + ' h-20 resize-none'}
              placeholder="Street, City, State..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div>
            <label className={labelCls}>Notes (Optional)</label>
            <textarea
              className={inputCls + ' h-24 resize-none'}
              placeholder="Any extra details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className={'fixed bottom-0 left-0 right-0 z-20 border-t p-4 ' + panel + ' ' + border}>
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || selectedItems.length === 0}
            className="w-full rounded-2xl bg-emerald-700 py-4 text-lg font-bold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? 'Recording sale...' : 'Record sale'}
          </button>
        </div>
      </div>
    </div>
  )
}
