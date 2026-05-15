import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { fetchCatalogProducts, type CatalogProductRow } from '../../lib/adminCatalog'
import { insertOfflineOrder, type AdminOrderRow } from '../../lib/adminOrders'
import { useAdminTheme } from './AdminThemeContext'
import { ad, adminFont } from './adminUi'
import { parseProductPriceNgn } from '../../data/products'
import { useAuth } from '../../context/AuthContext'

interface OfflineOrderModalProps {
  onClose: () => void
  onSuccess: () => void
}

const SOURCES = [
  { id: 'whatsapp', label: 'WhatsApp', icon: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg' },
  { id: 'instagram', label: 'Instagram', icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg' },
  { id: 'facebook', label: 'Facebook', icon: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg' },
  { id: 'tiktok', label: 'TikTok', icon: 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg' },
  { id: 'other', label: 'Other', icon: 'material:share' },
]

export function OfflineOrderModal({ onClose, onSuccess }: OfflineOrderModalProps) {
  const { user } = useAuth()
  const { theme } = useAdminTheme()
  const [step, setStep] = useState<1 | 2>(1)
  const [source, setSource] = useState<string>('')
  const [products, setProducts] = useState<CatalogProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    productId: '',
    variantId: '',
    quantity: 1,
    price: 0,
    address: '',
    deliveryStatus: 'pending' as 'pending' | 'processing' | 'delivered',
  })

  useEffect(() => {
    void (async () => {
      const p = await fetchCatalogProducts()
      setProducts(p)
      setLoading(false)
    })()
  }, [])

  const selectedProduct = products.find(p => p.id === formData.productId)?.payload

  const handleProductChange = (id: string) => {
    const p = products.find(prod => prod.id === id)?.payload
    if (p) {
      setFormData(prev => ({
        ...prev,
        productId: id,
        price: parseProductPriceNgn(p.price),
        variantId: p.colorOptions?.[0]?.id || '',
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!source || !formData.productId || !formData.customerName) return

    setSubmitting(true)

    const p = products.find(prod => prod.id === formData.productId)?.payload
    if (!p) {
      toast.error('Product not found')
      setSubmitting(false)
      return
    }

    const variant = p.colorOptions?.find(v => v.id === formData.variantId)

    const order: Partial<AdminOrderRow> = {
      user_id: user?.id || '',
      email: formData.customerPhone ? `${formData.customerPhone}@offline.sale` : `offline-${Date.now()}@tlebrand.com`,
      shipping: {
        fullName: formData.customerName,
        phone: formData.customerPhone,
        address: formData.address,
        source: source,
        isOffline: true,
      },
      line_items: [{
        id: p.slug,
        slug: p.slug,
        name: p.name,
        quantity: formData.quantity,
        price: formData.price,
        variantId: formData.variantId,
        variantLabel: variant?.label || '',
      }],
      subtotal_ngn: formData.price * formData.quantity,
      delivery_ngn: 0,
      processing_ngn: 0,
      total_ngn: formData.price * formData.quantity,
      status: 'paid',
      payment_status: 'paid',
      delivery_status: formData.deliveryStatus,
    }

    const res = await insertOfflineOrder(order)
    if (res.ok) {
      toast.success('Offline order saved successfully')
      onSuccess()
      onClose()
    } else {
      toast.error(res.message)
      setSubmitting(false)
    }
  }

  const muted = ad(theme, 'text-stone-500', 'text-neutral-500')
  const inputCls = ad(
    theme,
    'w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-[14px] outline-none focus:border-emerald-500',
    'w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-[14px] outline-none focus:border-emerald-500 text-white'
  )
  const labelCls = 'mb-1 block text-[11px] font-bold uppercase tracking-wider ' + muted

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className={adminFont() + ' flex flex-col items-center gap-3 p-10 rounded-3xl ' + ad(theme, 'bg-white', 'bg-neutral-950')}>
          <span className="material-symbols-outlined animate-spin text-3xl text-emerald-600">sync</span>
          <p className={muted}>Loading products...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className={adminFont() + ' w-full max-w-lg overflow-hidden rounded-3xl border ' + ad(theme, 'border-stone-200 bg-white', 'border-neutral-800 bg-neutral-950 shadow-2xl')}>
        <div className="flex items-center justify-between border-b p-4 sm:px-6">
          <h2 className={'text-lg font-bold ' + ad(theme, 'text-stone-900', 'text-white')}>
            {step === 1 ? 'Upload Offline Sale' : 'Order Details'}
          </h2>
          <button onClick={onClose} className={muted + ' hover:text-rose-500'}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
          {step === 1 ? (
            <div>
              <p className={muted + ' mb-6 text-[14px]'}>Where did you get this order from?</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {SOURCES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSource(s.id)
                      setStep(2)
                    }}
                    className={
                      'flex flex-col items-center gap-3 rounded-2xl border p-4 transition-all hover:scale-[1.02] ' +
                      ad(theme, 'border-stone-100 bg-stone-50 hover:border-emerald-200 hover:bg-emerald-50', 'border-neutral-800 bg-neutral-900/50 hover:border-emerald-800 hover:bg-emerald-950/30')
                    }
                  >
                    {s.icon.startsWith('material:') ? (
                      <span className="material-symbols-outlined text-[32px] text-emerald-600">
                        {s.icon.split(':')[1]}
                      </span>
                    ) : (
                      <img src={s.icon} alt={s.label} className="size-8" />
                    )}
                    <span className={'text-[13px] font-bold ' + ad(theme, 'text-stone-900', 'text-white')}>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                {SOURCES.find(s => s.id === source)?.icon.startsWith('material:') ? (
                  <span className="material-symbols-outlined text-emerald-600">
                    {SOURCES.find(s => s.id === source)?.icon.split(':')[1]}
                  </span>
                ) : (
                  <img src={SOURCES.find(s => s.id === source)?.icon} className="size-5" />
                )}
                <span className="text-[13px] font-bold text-emerald-800">Source: {SOURCES.find(s => s.id === source)?.label}</span>
                <button type="button" onClick={() => setStep(1)} className="ml-auto text-[11px] font-bold text-emerald-600 hover:underline">Change</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className={labelCls}>Customer Name *</label>
                  <input
                    required
                    type="text"
                    className={inputCls}
                    value={formData.customerName}
                    onChange={e => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                    placeholder="e.g. Jane Doe"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className={labelCls}>Phone Number</label>
                  <input
                    type="tel"
                    className={inputCls}
                    value={formData.customerPhone}
                    onChange={e => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                    placeholder="080..."
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Product *</label>
                <select
                  required
                  className={inputCls}
                  value={formData.productId}
                  onChange={e => handleProductChange(e.target.value)}
                >
                  <option value="">Select a product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.payload.name}</option>
                  ))}
                </select>
              </div>

              {selectedProduct?.colorOptions && selectedProduct.colorOptions.length > 0 && (
                <div>
                  <label className={labelCls}>Color/Variant</label>
                  <select
                    className={inputCls}
                    value={formData.variantId}
                    onChange={e => setFormData(prev => ({ ...prev, variantId: e.target.value }))}
                  >
                    {selectedProduct.colorOptions.map(v => (
                      <option key={v.id} value={v.id}>{v.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    className={inputCls}
                    value={formData.quantity}
                    onChange={e => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Delivery Status</label>
                  <select
                    className={inputCls}
                    value={formData.deliveryStatus}
                    onChange={e => setFormData(prev => ({ ...prev, deliveryStatus: e.target.value as 'pending' | 'processing' | 'delivered' }))}
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Price (₦)</label>
                <input
                  type="number"
                  className={inputCls}
                  value={formData.price}
                  onChange={e => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                />
              </div>

              <div>
                <label className={labelCls}>Delivery Address (Optional)</label>
                <textarea
                  className={inputCls + ' h-20 resize-none'}
                  value={formData.address}
                  onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Street, City, State..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className={'flex-1 rounded-xl py-3 text-[14px] font-bold ' + ad(theme, 'bg-stone-100 text-stone-600 hover:bg-stone-200', 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700')}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.productId || !formData.customerName}
                  className="flex-1 rounded-xl bg-emerald-600 py-3 text-[14px] font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Order'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
