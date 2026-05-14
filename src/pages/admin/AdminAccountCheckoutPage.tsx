import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  DEFAULT_DELIVERY_FEE_NGN,
  DEFAULT_PROCESSING_FEE_NGN,
  DEFAULT_SALES_VAT_FLAT_NGN,
  fetchShopFees,
  updateShopFees,
  type DeliveryZone,
} from '../../lib/shopSettings.ts'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { ad, adminFont } from './adminUi.ts'

const newEmptyZone = (): DeliveryZone => ({
  id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `z_${Date.now()}`,
  label: '',
  feeNgn: 0,
  description: '',
})

const formatNaira = (n: number) =>
  `₦${Math.round(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

function feeLabel(feeNgn: number): string {
  if (feeNgn === 0) return 'FREE'
  return formatNaira(feeNgn)
}

export function AdminAccountCheckoutPage() {
  const { theme } = useAdminTheme()
  const [deliveryFee, setDeliveryFee] = useState(String(DEFAULT_DELIVERY_FEE_NGN))
  const [processingFee, setProcessingFee] = useState(String(DEFAULT_PROCESSING_FEE_NGN))
  const [salesVatFlat, setSalesVatFlat] = useState(String(DEFAULT_SALES_VAT_FLAT_NGN))
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([])
  const [busyFees, setBusyFees] = useState(false)
  const [feesLoaded, setFeesLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    let on = true
    void (async () => {
      const s = await fetchShopFees()
      if (!on) return
      setDeliveryFee(String(s.deliveryFeeNgn))
      setProcessingFee(String(s.processingFeeNgn))
      setSalesVatFlat(String(s.salesVatFlatNgn))
      setDeliveryZones(
        s.deliveryZones.length > 0 ? s.deliveryZones.map((z) => ({ ...z })) : [],
      )
      setFeesLoaded(true)
    })()
    return () => {
      on = false
    }
  }, [])

  const shell = ad(theme, 'min-h-[calc(100vh-4rem)] bg-stone-100/90', 'min-h-[calc(100vh-4rem)] bg-neutral-950')
  const listCard = ad(
    theme,
    'overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm',
    'overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/80 shadow-sm',
  )
  const rowHover = ad(theme, 'transition-colors hover:bg-stone-50', 'transition-colors hover:bg-neutral-800/40')
  const rowTitle = ad(theme, 'text-[16px] font-semibold leading-snug text-stone-900', 'text-[16px] font-semibold leading-snug text-neutral-100')
  const rowSub = ad(theme, 'mt-0.5 line-clamp-2 text-[13px] leading-snug text-stone-500', 'mt-0.5 line-clamp-2 text-[13px] leading-snug text-neutral-400')
  const feeRight = ad(theme, 'text-right text-[16px] font-semibold tabular-nums text-stone-900', 'text-right text-[16px] font-semibold tabular-nums text-neutral-100')
  const chevron = (open: boolean) =>
    [
      'material-symbols-outlined shrink-0 text-[22px] transition-transform',
      open ? 'rotate-90' : '',
      ad(theme, 'text-stone-300', 'text-neutral-600'),
    ].join(' ')
  const label = ad(theme, 'mb-1.5 block text-[11px] font-semibold text-stone-500', 'mb-1.5 block text-[11px] font-semibold text-neutral-400')
  const input = ad(
    theme,
    'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30',
    'w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-[15px] text-neutral-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30',
  )
  const btn = ad(
    theme,
    'inline-flex min-h-[48px] min-w-[140px] items-center justify-center rounded-xl bg-emerald-600 px-6 text-[14px] font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50',
    'inline-flex min-h-[48px] min-w-[140px] items-center justify-center rounded-xl bg-emerald-600 px-6 text-[14px] font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50',
  )
  const btnDanger = ad(
    theme,
    'text-[13px] font-bold text-rose-600 underline-offset-2 hover:text-rose-700',
    'text-[13px] font-bold text-rose-400 underline-offset-2 hover:text-rose-300',
  )
  const muted = ad(theme, 'text-stone-500', 'text-neutral-400')
  const pageTitle = ad(theme, 'text-xl font-bold text-stone-900 sm:text-2xl', 'text-xl font-bold text-white sm:text-2xl')
  const divide = ad(theme, 'divide-y divide-stone-100', 'divide-y divide-neutral-800/80')
  const expandPanel = ad(theme, 'border-t border-stone-100 bg-stone-50/70 px-5 py-5', 'border-t border-neutral-800/80 bg-neutral-950/50 px-5 py-5')

  const onSaveFees = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    const d = Math.round(Number(deliveryFee.replace(/[^\d]/g, '')) || 0)
    const p = Math.round(Number(processingFee.replace(/[^\d]/g, '')) || 0)
    const salesVatN = Math.round(Number(salesVatFlat.replace(/[^\d]/g, '')) || 0)
    if (salesVatN < 0 || salesVatN > 50_000_000) {
      setError('Enter sensible whole-naira amounts (0–50,000,000).')
      return
    }
    if (d < 0 || p < 0 || d > 50_000_000 || p > 50_000_000) {
      setError('Enter sensible whole-naira amounts (0–50,000,000).')
      return
    }
    setBusyFees(true)
    const res = await updateShopFees(d, p, { deliveryZones, salesVatFlatNgn: salesVatN })
    setBusyFees(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setNotice('Saved.')
    setExpandedId(null)
  }

  const toggleRow = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const addZone = () => {
    const z = newEmptyZone()
    setDeliveryZones((rows) => [...rows, z])
    setExpandedId(z.id)
  }

  return (
    <div className={adminFont() + ' ' + shell}>
      <div className="mx-auto w-full max-w-lg px-4 py-6 sm:max-w-xl sm:px-6 lg:max-w-2xl lg:py-10">
        <Link
          to="/admin/account"
          className={
            'mb-6 inline-flex items-center gap-1.5 text-[14px] font-semibold no-underline ' +
            ad(theme, 'text-emerald-700 hover:text-emerald-800', 'text-emerald-400 hover:text-emerald-300')
          }
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Settings
        </Link>

        <h1 className={pageTitle}>Shop checkout</h1>
        <p className={muted + ' mt-2 text-[15px] leading-relaxed'}>
          Same style your customers see: clear rows, then tap a row to edit.
        </p>

        {error ? (
          <p
            className={
              'mt-6 rounded-xl border px-4 py-3 text-[13px] font-medium ' +
              ad(theme, 'border-rose-200 bg-rose-50 text-rose-900', 'border-rose-900/40 bg-rose-950/30 text-rose-200')
            }
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {notice ? (
          <p
            className={
              'mt-6 rounded-xl border px-4 py-3 text-[13px] font-medium ' +
              ad(theme, 'border-emerald-200 bg-emerald-50 text-emerald-900', 'border-emerald-800/50 bg-emerald-950/40 text-emerald-200')
            }
            role="status"
          >
            {notice}
          </p>
        ) : null}

        <form onSubmit={onSaveFees} className="mt-8 space-y-8">
          <section>
            <p className={ad(theme, 'mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-400', 'mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500')}>
              Order fees
            </p>
            <div className={listCard + ' ' + divide}>
              <div className={'flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 ' + rowHover}>
                <div className="min-w-0 flex-1">
                  <p className={rowTitle}>Default delivery</p>
                  <p className={rowSub}>Used only when you have no locations below.</p>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  disabled={!feesLoaded}
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  className={
                    input +
                    ' w-full shrink-0 text-right font-semibold tabular-nums sm:max-w-[160px] sm:min-w-[140px]'
                  }
                  autoComplete="off"
                />
              </div>
              <div className={'flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 ' + rowHover}>
                <div className="min-w-0 flex-1">
                  <p className={rowTitle}>Processing</p>
                  <p className={rowSub}>Added once per checkout.</p>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  disabled={!feesLoaded}
                  value={processingFee}
                  onChange={(e) => setProcessingFee(e.target.value)}
                  className={
                    input +
                    ' w-full shrink-0 text-right font-semibold tabular-nums sm:max-w-[160px] sm:min-w-[140px]'
                  }
                  autoComplete="off"
                />
              </div>
              <div className={'flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 ' + rowHover}>
                <div className="min-w-0 flex-1">
                  <p className={rowTitle}>VAT on products (₦)</p>
                  <p className={rowSub}>
                    Fixed whole-naira amount added once per checkout (goods subtotal only). Use 0 if prices already include VAT or you do not charge it.
                  </p>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  disabled={!feesLoaded}
                  value={salesVatFlat}
                  onChange={(e) => setSalesVatFlat(e.target.value)}
                  className={
                    input +
                    ' w-full shrink-0 text-right font-semibold tabular-nums sm:max-w-[160px] sm:min-w-[140px]'
                  }
                  autoComplete="off"
                  placeholder="0"
                />
              </div>
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-end justify-between gap-4 px-1">
              <p className={ad(theme, 'text-[11px] font-bold uppercase tracking-[0.2em] text-stone-400', 'text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500')}>
                Delivery &amp; pickup
              </p>
            </div>
            <div className={listCard}>
              <div className={divide}>
                {deliveryZones.map((z) => {
                  const open = expandedId === z.id
                  const desc = (z.description ?? '').trim()
                  const title = z.label.trim() || 'Untitled option'
                  return (
                    <div key={z.id}>
                      <button
                        type="button"
                        onClick={() => toggleRow(z.id)}
                        className={
                          'flex w-full min-h-[4.25rem] items-center gap-3 px-5 py-4 text-left ' + rowHover
                        }
                      >
                        <div className="min-w-0 flex-1">
                          <p className={rowTitle}>{title}</p>
                          {desc ? <p className={rowSub}>{desc}</p> : <p className={rowSub + ' italic opacity-70'}>No note yet</p>}
                        </div>
                        <span className={feeRight}>{feeLabel(z.feeNgn)}</span>
                        <span className={chevron(open)} aria-hidden>
                          chevron_right
                        </span>
                      </button>
                      {open ? (
                        <div className={expandPanel}>
                          <div className="space-y-4">
                            <label className="block">
                              <span className={label}>Title</span>
                              <input
                                type="text"
                                className={input}
                                value={z.label}
                                disabled={!feesLoaded}
                                onChange={(e) => {
                                  const v = e.target.value
                                  setDeliveryZones((rows) =>
                                    rows.map((r) => (r.id === z.id ? { ...r, label: v } : r)),
                                  )
                                }}
                                placeholder="e.g. Pick up at Lagos Island"
                                autoComplete="off"
                              />
                            </label>
                            <label className="block sm:max-w-xs">
                              <span className={label}>Fee (₦)</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                className={input + ' font-mono tabular-nums'}
                                value={String(z.feeNgn)}
                                disabled={!feesLoaded}
                                onChange={(e) => {
                                  const n = Math.round(Number(e.target.value.replace(/[^\d]/g, '')) || 0)
                                  setDeliveryZones((rows) =>
                                    rows.map((r) => (r.id === z.id ? { ...r, feeNgn: n } : r)),
                                  )
                                }}
                                autoComplete="off"
                              />
                            </label>
                            <label className="block">
                              <span className={label}>Customer note</span>
                              <textarea
                                className={input + ' min-h-[100px] resize-y leading-relaxed'}
                                value={z.description ?? ''}
                                disabled={!feesLoaded}
                                onChange={(e) => {
                                  const v = e.target.value
                                  setDeliveryZones((rows) =>
                                    rows.map((r) => (r.id === z.id ? { ...r, description: v } : r)),
                                  )
                                }}
                                placeholder="Address or pickup instructions shown at checkout"
                                autoComplete="off"
                              />
                            </label>
                            <div className="flex flex-wrap items-center gap-4 pt-1">
                              <button
                                type="button"
                                className={btnDanger}
                                onClick={() => {
                                  setDeliveryZones((rows) => rows.filter((r) => r.id !== z.id))
                                  setExpandedId((id) => (id === z.id ? null : id))
                                }}
                              >
                                Remove this option
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
              <button
                type="button"
                disabled={!feesLoaded}
                onClick={addZone}
                className={
                  'flex w-full min-h-[3.75rem] items-center gap-3 border-t px-5 py-4 text-left ' +
                  ad(
                    theme,
                    'border-dashed border-stone-200 text-stone-600 hover:bg-stone-50',
                    'border-dashed border-neutral-700 text-neutral-300 hover:bg-neutral-800/30',
                  )
                }
              >
                <span className={'material-symbols-outlined text-[22px] ' + ad(theme, 'text-emerald-600', 'text-emerald-400')}>
                  add
                </span>
                <span className={'text-[15px] font-semibold ' + ad(theme, 'text-stone-800', 'text-neutral-200')}>
                  Add location or zone
                </span>
              </button>
            </div>
          </section>

          <div className="mt-10 flex justify-end">
            <button type="submit" disabled={busyFees || !feesLoaded} className={btn}>
              {busyFees ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
