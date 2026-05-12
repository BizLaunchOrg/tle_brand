import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AdminTheme } from './AdminThemeContext.tsx'
import type { AdminOrderRow } from '../../lib/adminOrders.ts'
import { updateOrderStatus } from '../../lib/adminOrders.ts'
import { fetchCatalogPayloadsBySlugs } from '../../lib/adminCatalog.ts'
import {
  displayableImageUrl,
  getActiveColorOption,
  getDefaultImageUrls,
  getGalleryUrls,
  type Product,
} from '../../data/products.ts'
import { OrderRelativeTime } from './OrderRelativeTime.tsx'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { adminStatusPillClass } from './adminRangeTabs.tsx'
import { ad, adminFont } from './adminUi.ts'
import { isCompletedStatus } from '../../lib/adminOrderAnalytics.ts'
import { normalizeOrderLineItems, pickLineImageFromItem } from '../../lib/adminOrderLineSnapshots.ts'

const formatNaira = (n: number) => `₦${Math.round(n).toLocaleString()}`

const STATUS_OPTIONS = ['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'] as const

const QUICK_STATUSES = ['processing', 'shipped', 'delivered', 'completed'] as const

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
  'photo',
  'picture',
  'thumbnail',
  'imageUrl',
  'thumbnailUrl',
  'src',
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
  const arr = normalizeOrderLineItems(raw)
  const out: LineDisplayExt[] = []
  let i = 0
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const slug = typeof o.slug === 'string' ? o.slug.trim() : ''
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
    const image = pickLineImageFromItem(o)

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

function firstNonEmptyImageUrl(...candidates: (string | undefined)[]): string | undefined {
  for (const c of candidates) {
    const t = typeof c === 'string' ? c.trim() : ''
    if (t) return t
  }
  return undefined
}

function applyCatalogEnrichment(lines: LineDisplayExt[], catalog: Map<string, Product>): LineDisplayExt[] {
  return lines.map((line) => {
    const key = line.slug.trim()
    const p = catalog.get(key) ?? catalog.get(key.toLowerCase())
    if (!p) return line
    const img = firstNonEmptyImageUrl(
      line.image,
      getGalleryUrls(p, line.variantId)[0],
      ...getDefaultImageUrls(p),
      p.img,
    )
    const vLabel = line.variantLabel || getActiveColorOption(p, line.variantId)?.label
    const cat = line.category || p.cat
    return { ...line, image: img, variantLabel: vLabel, category: cat }
  })
}

function OrderLineThumb({ url, theme }: { url: string | undefined; theme: AdminTheme }) {
  const src = displayableImageUrl(url)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
  }, [src])
  const muted = ad(theme, 'text-stone-400', 'text-neutral-500')
  if (!src || failed) {
    return (
      <div className={'flex size-full flex-col items-center justify-center gap-0.5 px-1 text-center ' + muted}>
        <span className="material-symbols-outlined text-[28px] font-light opacity-70">image_not_supported</span>
        <span className="text-[9px] font-semibold leading-tight">No image</span>
      </div>
    )
  }
  return (
    <img
      src={src}
      alt=""
      className="size-full object-cover"
      loading="lazy"
      referrerPolicy="no-referrer"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}

function customerDisplayName(o: AdminOrderRow): string {
  const ship = o.shipping && typeof o.shipping === 'object' ? (o.shipping as Record<string, unknown>) : {}
  const full = typeof ship.fullName === 'string' ? ship.fullName.trim() : ''
  if (full) return full
  const em = o.email?.trim() || ''
  const at = em.indexOf('@')
  return at > 0 ? em.slice(0, at) : em || 'Customer'
}

function orderRefShort(id: string): string {
  const compact = id.replace(/-/g, '')
  return compact.slice(0, 6).toUpperCase()
}

function isPaidOrderStatus(status: string): boolean {
  const s = status.toLowerCase()
  return isCompletedStatus(status) || s === 'paid'
}

function paymentPill(status: string, theme: 'light' | 'dark'): { label: string; cls: string } {
  const s = status.toLowerCase()
  if (s === 'cancelled')
    return {
      label: 'N/A',
      cls: ad(theme, 'bg-stone-100 text-stone-600', 'bg-neutral-800 text-neutral-400'),
    }
  if (isPaidOrderStatus(status))
    return {
      label: 'Paid',
      cls: ad(theme, 'bg-emerald-100 text-emerald-900', 'bg-emerald-950/50 text-emerald-300'),
    }
  return {
    label: 'Unpaid',
    cls: ad(theme, 'bg-rose-100 text-rose-900', 'bg-rose-950/40 text-rose-200'),
  }
}

function shippingPill(status: string, theme: 'light' | 'dark'): { label: string; cls: string } {
  const s = status.toLowerCase()
  if (s === 'cancelled')
    return {
      label: 'Cancelled',
      cls: ad(theme, 'bg-stone-100 text-stone-600', 'bg-neutral-800 text-neutral-400'),
    }
  if (s === 'delivered' || s === 'completed' || s === 'fulfilled')
    return {
      label: 'Delivered',
      cls: ad(theme, 'bg-emerald-100 text-emerald-900', 'bg-emerald-950/50 text-emerald-300'),
    }
  if (s === 'processing' || s === 'shipped')
    return {
      label: 'Shipped',
      cls: ad(theme, 'bg-sky-100 text-sky-900', 'bg-sky-950/50 text-sky-200'),
    }
  return {
    label: 'Unfulfilled',
    cls: ad(theme, 'bg-amber-100 text-amber-950', 'bg-amber-950/40 text-amber-200'),
  }
}

function deliverBlock(ship: Record<string, unknown>): string {
  const lines: string[] = []
  const name = typeof ship.fullName === 'string' ? ship.fullName.trim() : ''
  if (name) lines.push(name)
  for (const k of ['line1', 'line2', 'city', 'state', 'postalCode', 'country'] as const) {
    const v = formatCell(ship[k])
    if (v) lines.push(v)
  }
  return lines.join('\n')
}

type Props = {
  order: AdminOrderRow
  backHref: string
  backLabel: string
  contextTitle: string
  onRefresh: () => void | Promise<void>
}

export function AdminOrderDetailView({ order, backHref, backLabel, contextTitle, onRefresh }: Props) {
  const { theme } = useAdminTheme()
  const [catalog, setCatalog] = useState<Map<string, Product>>(() => new Map())
  const [saving, setSaving] = useState(false)
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    setCatalog(new Map())
    const raw = order.line_items
    const slugs = buildLineDisplaysExt(raw)
      .map((l) => l.slug.trim())
      .filter(Boolean)
    let cancelled = false
    void fetchCatalogPayloadsBySlugs(slugs).then((m) => {
      if (!cancelled) setCatalog(m)
    })
    return () => {
      cancelled = true
    }
  }, [order])

  const lineRows = useMemo(() => applyCatalogEnrichment(buildLineDisplaysExt(order.line_items), catalog), [order, catalog])

  const ship = order.shipping && typeof order.shipping === 'object' ? (order.shipping as Record<string, unknown>) : {}
  const contactRows = shippingRows(ship)
  const deliverText = deliverBlock(ship)
  const pay = paymentPill(order.status, theme)
  const shipPill = shippingPill(order.status, theme)

  const border = ad(theme, 'border-stone-200', 'border-neutral-800')
  const muted = ad(theme, 'text-stone-500', 'text-neutral-500')
  const strong = ad(theme, 'text-stone-900', 'text-neutral-50')
  const subpanel = ad(theme, 'rounded-xl border border-stone-100 bg-stone-50/80', 'rounded-xl border border-neutral-800 bg-neutral-900/60')
  const panel = ad(theme, 'bg-white', 'bg-neutral-950')
  const selectCls = ad(
    theme,
    'w-full max-w-md cursor-pointer rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-stone-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50',
    'w-full max-w-md cursor-pointer rounded-xl border border-neutral-600 bg-neutral-950 px-3 py-2.5 text-[13px] font-semibold text-neutral-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 disabled:opacity-50',
  )
  const ghostBtn = ad(
    theme,
    'inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-bold text-stone-800 transition hover:bg-stone-50',
    'inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-600 bg-neutral-900 px-3 py-2 text-[12px] font-bold text-neutral-100 transition hover:bg-neutral-800',
  )
  const quickBtn = ad(
    theme,
    'rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-[12px] font-bold text-emerald-900 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40',
    'rounded-xl border border-emerald-800/40 bg-emerald-950/35 px-3 py-2 text-[12px] font-bold text-emerald-200 transition hover:bg-emerald-950/55 disabled:cursor-not-allowed disabled:opacity-40',
  )

  const shareUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/admin/orders/${encodeURIComponent(order.id)}` : ''

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setBanner({ type: 'ok', text: `${label} copied.` })
      window.setTimeout(() => setBanner(null), 2200)
    } catch {
      setBanner({ type: 'err', text: 'Copy blocked — select and copy manually.' })
    }
  }

  const applyStatus = async (next: string) => {
    if (next === order.status) return
    setSaving(true)
    setBanner(null)
    const res = await updateOrderStatus(order.id, next)
    setSaving(false)
    if (res.ok) {
      setBanner({ type: 'ok', text: 'Order status updated.' })
      await onRefresh()
      window.setTimeout(() => setBanner(null), 2800)
    } else {
      setBanner({ type: 'err', text: res.message })
    }
  }

  const statusLower = order.status.toLowerCase()
  const cancelled = statusLower === 'cancelled'

  return (
    <div className={adminFont() + ' mx-auto w-full min-w-0 max-w-[88rem] pb-12'}>
      <div className={'mb-6 flex flex-col gap-4 border-b pb-6 ' + border}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Link
              to={backHref}
              className={
                'inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-[13px] font-bold no-underline ' +
                ad(theme, 'border-stone-200 text-stone-800 hover:bg-stone-50', 'border-neutral-600 text-neutral-100 hover:bg-neutral-800/80')
              }
            >
              <span className="material-symbols-outlined text-[20px] font-light">arrow_back</span>
              {backLabel}
            </Link>
            <h1 className={'text-xl font-bold tracking-tight sm:text-2xl ' + strong}>Order details</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void copyText('Link', shareUrl)} className={ghostBtn}>
              <span className="material-symbols-outlined text-[18px] font-light">link</span>
              Copy link
            </button>
            <button type="button" onClick={() => void copyText('Reference', order.id)} className={ghostBtn}>
              <span className="material-symbols-outlined text-[18px] font-light">content_copy</span>
              Copy ID
            </button>
          </div>
        </div>
        <p className={muted + ' text-[12px]'}>
          {contextTitle} · Transaction reference <span className={'font-mono font-semibold ' + strong}>{order.id}</span>
        </p>
        {banner ? (
          <div
            role="status"
            className={
              'rounded-2xl border px-4 py-3 text-[13px] font-medium ' +
              (banner.type === 'ok'
                ? ad(theme, 'border-emerald-200 bg-emerald-50 text-emerald-900', 'border-emerald-800/50 bg-emerald-950/40 text-emerald-200')
                : ad(theme, 'border-rose-200 bg-rose-50 text-rose-900', 'border-rose-900/40 bg-rose-950/30 text-rose-200'))
            }
          >
            {banner.text}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <span className={'rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ' + adminStatusPillClass(order.status, theme)}>Order: {order.status}</span>
          <span className={'rounded-full px-2.5 py-1 text-[11px] font-bold ' + pay.cls}>Payment: {pay.label}</span>
          <span className={'rounded-full px-2.5 py-1 text-[11px] font-bold ' + shipPill.cls}>Shipping: {shipPill.label}</span>
          <span className={muted + ' inline-flex items-center text-[12px]'}>
            <OrderRelativeTime iso={order.created_at} theme={theme} />
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <section className={'rounded-2xl border p-4 sm:p-5 ' + border + ' ' + panel}>
            <p className={'text-[10px] font-bold uppercase tracking-[0.12em] ' + muted}>Order #{orderRefShort(order.id)}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className={'text-[10px] font-bold uppercase tracking-wider ' + muted}>Customer</p>
                <p className={'mt-1 text-[15px] font-bold ' + strong}>{customerDisplayName(order)}</p>
                <p className={'mt-1 break-all text-[13px] ' + strong}>{order.email || '—'}</p>
                {formatCell(ship.phone) ? <p className={'mt-1 text-[13px] ' + strong}>{formatCell(ship.phone)}</p> : null}
              </div>
              <div>
                <p className={'text-[10px] font-bold uppercase tracking-wider ' + muted}>Channel</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[22px] font-light text-emerald-600">language</span>
                  <span className={'text-[14px] font-semibold ' + strong}>Website checkout</span>
                </div>
                <p className={'mt-3 text-[10px] font-bold uppercase tracking-wider ' + muted}>Account user id</p>
                <p className={'mt-1 font-mono text-[12px] break-all ' + strong}>{order.user_id}</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className={'text-[11px] font-bold uppercase tracking-[0.12em] ' + muted}>Delivery and contact</h2>
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
          </section>

          <section>
            <h2 className={'text-[11px] font-bold uppercase tracking-[0.12em] ' + muted}>Line items</h2>
            {lineRows.length === 0 ? (
              <p className={'mt-2 rounded-2xl border p-4 text-[13px] ' + subpanel + ' ' + border + ' ' + muted}>No line items stored.</p>
            ) : (
              <ul className="mt-2 space-y-3">
                {lineRows.map((row) => (
                  <li key={row.key} className={'overflow-hidden rounded-2xl border ' + border}>
                    <div className={'flex gap-3 p-3 sm:gap-4 sm:p-4 ' + ad(theme, 'bg-white', 'bg-neutral-900/40')}>
                      <div className="relative size-[72px] shrink-0 overflow-hidden rounded-xl border border-black/10 bg-stone-100 sm:size-[88px]">
                        <OrderLineThumb url={row.image} theme={theme} />
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
          </section>

          <section className={'rounded-2xl border p-4 sm:p-5 ' + border + ' ' + panel}>
            <h2 className={'text-[11px] font-bold uppercase tracking-[0.12em] ' + muted}>Update order status</h2>
            <p className={muted + ' mt-1 text-[12px] leading-relaxed'}>
              Pick a status below or use a shortcut. Payment and shipping labels on the list follow this field until you add separate payment tables.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <label className="block min-w-0 flex-1">
                <span className={'sr-only'}>Order status</span>
                <select
                  className={selectCls}
                  value={order.status}
                  disabled={saving || cancelled}
                  onChange={(e) => void applyStatus(e.target.value)}
                >
                  {[...new Set([...STATUS_OPTIONS, order.status])].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_STATUSES.map((st) => {
                const active = order.status.toLowerCase() === st
                return (
                  <button
                    key={st}
                    type="button"
                    disabled={saving || cancelled || active}
                    onClick={() => void applyStatus(st)}
                    className={quickBtn}
                  >
                    {st.charAt(0).toUpperCase() + st.slice(1)}
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-4">
          <div className={'rounded-2xl border p-4 ' + border + ' ' + panel}>
            <h2 className={'text-[11px] font-bold uppercase tracking-[0.12em] ' + muted}>Payment summary</h2>
            <dl className="mt-3 space-y-2 text-[13px]">
              <div className="flex justify-between gap-2 border-b pb-2">
                <dt className={muted}>Placed</dt>
                <dd className="text-right">
                  <OrderRelativeTime iso={order.created_at} theme={theme} className="inline-block max-w-[min(100%,12rem)] text-right" />
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className={muted}>Subtotal</dt>
                <dd className={'font-semibold tabular-nums ' + strong}>{formatNaira(Number(order.subtotal_ngn) || 0)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className={muted}>Delivery</dt>
                <dd className={'font-semibold tabular-nums ' + strong}>{formatNaira(Number(order.delivery_ngn) || 0)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className={muted}>Processing</dt>
                <dd className={'font-semibold tabular-nums ' + strong}>{formatNaira(Number(order.processing_ngn) || 0)}</dd>
              </div>
              <div className={'mt-2 flex justify-between gap-2 border-t pt-2 ' + border}>
                <dt className={'text-[12px] font-bold ' + strong}>Total</dt>
                <dd className={'text-lg font-bold tabular-nums ' + ad(theme, 'text-emerald-700', 'text-emerald-300')}>{formatNaira(Number(order.total_ngn) || 0)}</dd>
              </div>
            </dl>
          </div>

          <div className={'rounded-2xl border p-4 ' + border + ' ' + subpanel}>
            <div className="flex items-center justify-between gap-2">
              <p className={'text-[11px] font-bold uppercase tracking-[0.12em] ' + muted}>Payment status</p>
              <span className={'rounded-full px-2.5 py-1 text-[11px] font-bold ' + pay.cls}>{pay.label}</span>
            </div>
          </div>

          <div className={'rounded-2xl border p-4 ' + border + ' ' + panel}>
            <div className="flex items-start justify-between gap-2">
              <h2 className={'text-[11px] font-bold uppercase tracking-[0.12em] ' + muted}>Deliver to</h2>
              <button
                type="button"
                disabled={!deliverText}
                onClick={() => void copyText('Address', deliverText)}
                className={ghostBtn + ' shrink-0 py-1.5 text-[11px]'}
              >
                <span className="material-symbols-outlined text-[16px] font-light">content_copy</span>
                Copy
              </button>
            </div>
            <p className={'mt-3 whitespace-pre-line break-words text-[13px] leading-relaxed ' + strong}>{deliverText || '—'}</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
