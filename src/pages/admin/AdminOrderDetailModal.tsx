import { useEffect, useMemo, useState } from 'react'
import type { AdminOrderRow } from '../../lib/adminOrders.ts'
import { fetchCatalogPayloadsBySlugs } from '../../lib/adminCatalog.ts'
import { getActiveColorOption, getGalleryUrls, type Product } from '../../data/products.ts'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { adminStatusPillClass } from './adminRangeTabs.tsx'
import { ad, adminFont } from './adminUi.ts'

const formatNaira = (n: number) => `₦${Math.round(n).toLocaleString()}`

const SHIPPING_KEY_ORDER = ['fullName', 'phone', 'email', 'line1', 'line2', 'city', 'state', 'postalCode', 'country'] as const
const SHIPPING_ORDER_SET = new Set<string>(SHIPPING_KEY_ORDER as unknown as string[])

const SHIPPING_LABELS: Record<string, string> = {
  fullName: 'Full name',
  phone: 'Phone',
  email: 'Email (delivery)',
  line1: 'Street address',
  line2: 'Landmark / notes',
  city: 'City',
  state: 'State',
  postalCode: 'Postal code',
  country: 'Country',
}

const LINE_KNOWN = new Set([
  'slug',
  'variantId',
  'variantLabel',
  'name',
  'price',
  'quantity',
  'image',
  'img',
  'category',
  'cat',
  'badge',
  'size',
])

function humanizeKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim()
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return ''
}

function shippingRows(shipping: Record<string, unknown>): { label: string; value: string }[] {
  const keys = new Set(Object.keys(shipping))
  const ordered = [
    ...SHIPPING_KEY_ORDER.filter((k) => keys.has(k)),
    ...[...keys].filter((k) => !SHIPPING_ORDER_SET.has(k)).sort(),
  ]
  const out: { label: string; value: string }[] = []
  for (const k of ordered) {
    const value = formatCell(shipping[k])
    if (!value) continue
    out.push({ label: SHIPPING_LABELS[k] ?? humanizeKey(k), value })
  }
  return out
}

function parsePriceNgn(s: string): number {
  return Number(String(s).replace(/[^\d]/g, '')) || 0
}

type LineDisplayExt = {
  key: string
  slug: string
  name: string
  quantity: number
  unitPriceLabel: string
  lineTotalNgn: number
  variantId?: string
  image?: string
  variantLabel?: string
  category?: string
  size?: string
  badge?: string
  extras: { k: string; v: string }[]
}

function buildLineDisplaysExt(raw: unknown): LineDisplayExt[] {
  if (!Array.isArray(raw)) return []
  const out: LineDisplayExt[] = []
  let i = 0
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const slug = typeof o.slug === 'string' ? o.slug : ''
    const name = typeof o.name === 'string' ? o.name : slug || 'Item'
    const qty = Math.min(999, Math.max(1, Math.floor(Number(o.quantity)) || 1))
    const priceStr = typeof o.price === 'string' ? o.price : typeof o.price === 'number' ? formatNaira(o.price) : '₦0'
    const unit = parsePriceNgn(priceStr)
    const variantId = typeof o.variantId === 'string' && o.variantId.trim() ? o.variantId.trim() : undefined
    const variantLabel =
      typeof o.variantLabel === 'string' && o.variantLabel.trim()
        ? o.variantLabel.trim()
        : typeof o.color === 'string' && o.color.trim()
          ? o.color.trim()
          : undefined
    const size = typeof o.size === 'string' && o.size.trim() ? o.size.trim() : undefined
    const category =
      typeof o.category === 'string' && o.category.trim()
        ? o.category.trim()
        : typeof o.cat === 'string' && o.cat.trim()
          ? o.cat.trim()
          : undefined
    const badge = typeof o.badge === 'string' && o.badge.trim() ? o.badge.trim() : undefined
    const image =
      typeof o.image === 'string' && o.image.trim()
        ? o.image.trim()
        : typeof o.img === 'string' && o.img.trim()
          ? o.img.trim()
          : undefined

    const extras: { k: string; v: string }[] = []
    for (const [k, v] of Object.entries(o)) {
      if (LINE_KNOWN.has(k)) continue
      const s = formatCell(v)
      if (!s) continue
      if (v !== null && typeof v === 'object') {
        try {
          extras.push({ k: humanizeKey(k), v: JSON.stringify(v) })
        } catch {
          extras.push({ k: humanizeKey(k), v: s })
        }
      } else extras.push({ k: humanizeKey(k), v: s })
    }
    extras.sort((a, b) => a.k.localeCompare(b.k))

    out.push({
      key: `${slug}-${i++}`,
      slug,
      name,
      quantity: qty,
      unitPriceLabel: priceStr,
      lineTotalNgn: unit * qty,
      image,
      variantId,
      variantLabel,
      category,
      size,
      badge,
      extras,
    })
  }
  return out
}

function applyCatalogEnrichment(lines: LineDisplayExt[], catalog: Map<string, Product>): LineDisplayExt[] {
  return lines.map((line) => {
    const p = catalog.get(line.slug)
    if (!p) return line
    const img = line.image || getGalleryUrls(p, line.variantId)[0] || p.img
    const vLabel = line.variantLabel || getActiveColorOption(p, line.variantId)?.label
    const cat = line.category || p.cat
    return { ...line, image: img, variantLabel: vLabel, category: cat }
  })
}

type Props = {
  order: AdminOrderRow | null
  onClose: () => void
  headline: string
}

export function AdminOrderDetailModal({ order, onClose, headline }: Props) {
  const { theme } = useAdminTheme()
  const [catalog, setCatalog] = useState<Map<string, Product>>(() => new Map())

  useEffect(() => {
    if (!order) return
    setCatalog(new Map())
    const raw = order.line_items
    const slugs = buildLineDisplaysExt(raw)
      .map((l) => l.slug)
      .filter(Boolean)
    let cancelled = false
    void fetchCatalogPayloadsBySlugs(slugs).then((m) => {
      if (!cancelled) setCatalog(m)
    })
    return () => {
      cancelled = true
    }
  }, [order])

  useEffect(() => {
    if (!order) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [order, onClose])

  const lineRows = useMemo(() => {
    if (!order) return []
    return applyCatalogEnrichment(buildLineDisplaysExt(order.line_items), catalog)
  }, [order, catalog])

  if (!order) return null

  const ship = order.shipping && typeof order.shipping === 'object' ? (order.shipping as Record<string, unknown>) : {}
  const contactRows = shippingRows(ship)
  const panel = ad(theme, 'bg-white', 'bg-neutral-950')
  const border = ad(theme, 'border-stone-200', 'border-neutral-800')
  const muted = ad(theme, 'text-stone-500', 'text-neutral-500')
  const strong = ad(theme, 'text-stone-900', 'text-neutral-50')
  const subpanel = ad(theme, 'rounded-xl border border-stone-100 bg-stone-50/80', 'rounded-xl border border-neutral-800 bg-neutral-900/60')

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" aria-hidden />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="admin-order-detail-title"
        className={
          adminFont() +
          ' relative z-[1] flex max-h-[min(92vh,900px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:max-h-[90vh] sm:rounded-3xl ' +
          panel
        }
      >
        <div className={'flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4 ' + border}>
          <div className="min-w-0">
            <p className={'text-[10px] font-bold uppercase tracking-[0.14em] ' + muted}>Reference</p>
            <p id="admin-order-detail-title" className={'mt-0.5 break-all font-mono text-[13px] font-semibold ' + strong}>
              {order.id}
            </p>
            <h2 className={'mt-2 text-lg font-bold tracking-tight ' + strong}>{headline}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={
              'flex size-10 shrink-0 items-center justify-center rounded-xl border text-[13px] font-semibold transition ' +
              ad(theme, 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50', 'border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800')
            }
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[22px] font-light">close</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={'rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ' + adminStatusPillClass(order.status, theme)}>{order.status}</span>
            <span className={muted + ' text-[12px]'}>
              {new Date(order.created_at).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
            </span>
          </div>

          <div className={'mt-4 grid grid-cols-2 gap-3 rounded-2xl border p-4 ' + subpanel + ' ' + border}>
            <div>
              <p className={'text-[10px] font-bold uppercase tracking-wider ' + muted}>Account email</p>
              <p className={'mt-1 text-[13px] font-medium break-all ' + strong}>{order.email || '—'}</p>
            </div>
            <div className="text-right">
              <p className={'text-[10px] font-bold uppercase tracking-wider ' + muted}>Total</p>
              <p className={'mt-1 text-lg font-bold tabular-nums ' + ad(theme, 'text-emerald-700', 'text-emerald-300')}>
                {formatNaira(Number(order.total_ngn) || 0)}
              </p>
            </div>
            <div>
              <p className={'text-[10px] font-bold uppercase tracking-wider ' + muted}>Subtotal</p>
              <p className={'mt-1 text-[13px] font-semibold tabular-nums ' + strong}>{formatNaira(Number(order.subtotal_ngn) || 0)}</p>
            </div>
            <div className="text-right">
              <p className={'text-[10px] font-bold uppercase tracking-wider ' + muted}>Delivery + processing</p>
              <p className={'mt-1 text-[13px] font-semibold tabular-nums ' + strong}>
                {formatNaira(Number(order.delivery_ngn) || 0)} + {formatNaira(Number(order.processing_ngn) || 0)}
              </p>
            </div>
          </div>

          <h3 className={'mt-6 text-[11px] font-bold uppercase tracking-[0.12em] ' + muted}>Delivery &amp; contact</h3>
          <dl className={'mt-2 space-y-2 rounded-2xl border p-4 ' + subpanel + ' ' + border}>
            {contactRows.length === 0 ? (
              <p className={muted + ' text-[13px]'}>No delivery fields stored on this order.</p>
            ) : (
              contactRows.map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
                  <dt className={'shrink-0 text-[11px] font-bold uppercase tracking-wide ' + muted}>{label}</dt>
                  <dd className={'text-[14px] font-medium break-words sm:text-right ' + strong}>{value}</dd>
                </div>
              ))
            )}
          </dl>

          <h3 className={'mt-6 text-[11px] font-bold uppercase tracking-[0.12em] ' + muted}>Items in this order</h3>
          {lineRows.length === 0 ? (
            <p className={'mt-2 rounded-2xl border p-4 text-[13px] ' + subpanel + ' ' + border + ' ' + muted}>No line items stored.</p>
          ) : (
            <ul className="mt-2 space-y-3">
              {lineRows.map((row) => (
                <li key={row.key} className={'overflow-hidden rounded-2xl border ' + border}>
                  <div className={'flex gap-3 p-3 sm:gap-4 sm:p-4 ' + ad(theme, 'bg-white', 'bg-neutral-900/40')}>
                    <div className="relative size-[72px] shrink-0 overflow-hidden rounded-xl border border-black/10 bg-stone-100 sm:size-[88px]">
                      {row.image ? (
                        <img src={row.image} alt="" className="size-full object-cover" loading="lazy" />
                      ) : (
                        <div className={'flex size-full items-center justify-center text-[10px] font-medium ' + muted}>No image</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={'text-[15px] font-bold leading-snug ' + strong}>{row.name}</p>
                      {row.badge ? (
                        <span
                          className={
                            'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ' +
                            ad(theme, 'bg-amber-100 text-amber-900', 'bg-amber-950/50 text-amber-200')
                          }
                        >
                          {row.badge}
                        </span>
                      ) : null}
                      <p className={'mt-1 font-mono text-[11px] ' + muted}>{row.slug}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
                        {row.category ? (
                          <span className={muted}>
                            <span className={'font-bold ' + ad(theme, 'text-stone-600', 'text-neutral-400')}>Category: </span>
                            <span className={strong}>{row.category}</span>
                          </span>
                        ) : null}
                        {row.variantLabel ? (
                          <span className={muted}>
                            <span className={'font-bold ' + ad(theme, 'text-stone-600', 'text-neutral-400')}>Finish / color: </span>
                            <span className={strong}>{row.variantLabel}</span>
                          </span>
                        ) : null}
                        {row.size ? (
                          <span className={muted}>
                            <span className={'font-bold ' + ad(theme, 'text-stone-600', 'text-neutral-400')}>Size: </span>
                            <span className={strong}>{row.size}</span>
                          </span>
                        ) : null}
                        {row.variantId ? (
                          <span className={muted}>
                            <span className={'font-bold ' + ad(theme, 'text-stone-600', 'text-neutral-400')}>Variant id: </span>
                            <span className={'font-mono ' + strong}>{row.variantId}</span>
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 border-t border-black/5 pt-2 sm:pt-3">
                        <p className={muted + ' text-[12px]'}>
                          Qty <span className={'font-bold tabular-nums ' + strong}>{row.quantity}</span>
                          <span className="mx-1.5">·</span>
                          Unit <span className={'font-semibold ' + strong}>{row.unitPriceLabel}</span>
                        </p>
                        <p className={'text-[15px] font-bold tabular-nums ' + ad(theme, 'text-emerald-700', 'text-emerald-300')}>{formatNaira(row.lineTotalNgn)}</p>
                      </div>
                      {row.extras.length > 0 ? (
                        <details className="mt-2">
                          <summary className={'cursor-pointer text-[11px] font-semibold ' + ad(theme, 'text-emerald-800', 'text-emerald-300')}>
                            More fields ({row.extras.length})
                          </summary>
                          <dl className="mt-2 space-y-1 rounded-lg bg-black/[0.03] p-2 dark:bg-white/[0.06]">
                            {row.extras.map((ex) => (
                              <div key={ex.k} className="flex justify-between gap-2 text-[11px]">
                                <dt className={muted}>{ex.k}</dt>
                                <dd className={'max-w-[65%] break-words text-right font-mono ' + strong}>{ex.v}</dd>
                              </div>
                            ))}
                          </dl>
                        </details>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className={'mt-6 rounded-xl border px-3 py-2 text-[11px] ' + border + ' ' + muted}>
            User ID: <span className={'font-mono ' + strong}>{order.user_id}</span>
          </p>
        </div>

        <div className={'shrink-0 border-t px-5 py-4 ' + border}>
          <button
            type="button"
            onClick={onClose}
            className={
              'w-full rounded-2xl py-3 text-[14px] font-bold transition ' +
              ad(theme, 'bg-emerald-600 text-white hover:bg-emerald-700', 'bg-emerald-600 text-white hover:bg-emerald-500')
            }
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
