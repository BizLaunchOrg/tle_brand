import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  cartLineKey,
  displayableImageUrl,
  getDefaultImageUrls,
  parseProductPriceNgn,
} from '../../data/products.ts'
import { NIGERIAN_STATES } from '../../data/nigerianStates.ts'
import { useAuth } from '../../context/AuthContext'
import { useCartDrawer } from '../../context/CartDrawerContext.tsx'
import { computeCheckoutTotalWithFlatFees } from '../../lib/checkoutPricing.ts'
import { fetchShopFees, type ShopFees } from '../../lib/shopSettings.ts'
import { createOrder } from '../../lib/userShopSync.ts'

const formatNaira = (value: number) => `₦${value.toLocaleString()}`

const STORE_RECEIPT_NAME = 'TLE-BRAND'

type ReceiptLineItem = {
  name: string
  variantLabel?: string
  quantity: number
  lineTotalNgn: number
}

type ReceiptShipping = {
  fullName: string
  phone: string
  email: string
  line1: string
  line2?: string
  city: string
  state: string
  country: string
  deliveryOptionLabel?: string
}

type OrderReceipt = {
  id: string
  placedAt: string
  subtotalNgn: number
  deliveryNgn: number
  processingNgn: number
  processingVatNgn: number
  totalNgn: number
  deliverySummaryLabel: string
  lines: ReceiptLineItem[]
  shipping: ReceiptShipping
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildReceiptDocumentHtml(receipt: OrderReceipt): string {
  const placed = new Date(receipt.placedAt)
  const placedStr = escapeHtml(
    placed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
  )
  const linesRows = receipt.lines
    .map(
      (line) => `
    <tr>
      <td>${escapeHtml(line.name)}${line.variantLabel ? `<br/><span class="muted">${escapeHtml(line.variantLabel)}</span>` : ''}</td>
      <td class="num">${line.quantity}</td>
      <td class="num">${formatNaira(line.lineTotalNgn)}</td>
    </tr>`,
    )
    .join('')
  const sh = receipt.shipping
  const addrBits = [
    escapeHtml(sh.line1),
    sh.line2 ? escapeHtml(sh.line2) : '',
    `${escapeHtml(sh.city)}, ${escapeHtml(sh.state)}`,
    escapeHtml(sh.country),
  ]
    .filter(Boolean)
    .join('<br/>')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Receipt — ${escapeHtml(receipt.id)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; margin: 0; padding: 24px; background: #f5f2ed; color: #181818; }
    .paper { max-width: 420px; margin: 0 auto; background: #fff; border: 1px solid #18181818; padding: 28px 24px 32px; box-shadow: 0 12px 40px rgba(0,0,0,0.06); }
    h1 { font-size: 11px; letter-spacing: 0.28em; text-transform: uppercase; margin: 0 0 4px; color: #bf8f48; }
    .store { font-size: 22px; font-weight: 700; margin: 0 0 16px; }
    .meta { font-size: 12px; color: #6b5f58; margin-bottom: 20px; line-height: 1.5; }
    .rule { border: none; border-top: 1px dashed #c4b8b2; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #8a7e78; padding: 8px 0; border-bottom: 1px solid #18181814; }
    th.num { text-align: right; }
    td { padding: 10px 0; vertical-align: top; border-bottom: 1px dashed #e8e2dc; }
    td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; font-weight: 600; }
    .muted { font-size: 11px; color: #8a7e78; }
    .totals { margin-top: 8px; font-size: 13px; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; color: #6b5f58; }
    .totals .grand { margin-top: 10px; padding-top: 12px; border-top: 2px solid #181818; font-size: 16px; font-weight: 700; color: #181818; }
    .ship { font-size: 12px; line-height: 1.55; color: #181818; }
    .foot { margin-top: 20px; font-size: 11px; color: #8a7e78; text-align: center; }
    @media print { body { background: #fff; padding: 0; } .paper { box-shadow: none; border: none; max-width: none; } }
  </style>
</head>
<body>
  <div class="paper">
    <h1>Sales receipt</h1>
    <p class="store">${escapeHtml(STORE_RECEIPT_NAME)}</p>
    <div class="meta">
      <div><strong>Order ref</strong> · ${escapeHtml(receipt.id)}</div>
      <div><strong>Date</strong> · ${placedStr}</div>
    </div>
    <hr class="rule"/>
    <table>
      <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead>
      <tbody>${linesRows}</tbody>
    </table>
    <div class="totals">
      <div><span>Subtotal</span><span>${formatNaira(receipt.subtotalNgn)}</span></div>
      <div><span>${escapeHtml(receipt.deliverySummaryLabel)}</span><span>${formatNaira(receipt.deliveryNgn)}</span></div>
      <div><span>Processing</span><span>${formatNaira(receipt.processingNgn)}</span></div>${
        receipt.processingVatNgn > 0
          ? `<div><span>VAT on processing</span><span>${formatNaira(receipt.processingVatNgn)}</span></div>`
          : ''
      }
      <div class="grand"><span>Total</span><span>${formatNaira(receipt.totalNgn)}</span></div>
    </div>
    <hr class="rule"/>
    <p style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#8a7e78;margin:0 0 8px;">Ship to / contact</p>
    <div class="ship">
      <strong>${escapeHtml(sh.fullName)}</strong><br/>
      ${escapeHtml(sh.email)}<br/>
      ${escapeHtml(sh.phone)}<br/><br/>
      ${addrBits}
      ${sh.deliveryOptionLabel ? `<br/><br/><span class="muted">Option:</span> ${escapeHtml(sh.deliveryOptionLabel)}` : ''}
    </div>
    <p class="foot">Thank you for your order. Keep this receipt for your records.</p>
  </div>
</body>
</html>`
}

function downloadReceiptFile(receipt: OrderReceipt) {
  const html = buildReceiptDocumentHtml(receipt)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tle-receipt-${receipt.id.slice(0, 8)}.html`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function printReceiptInNewWindow(receipt: OrderReceipt) {
  const html = buildReceiptDocumentHtml(receipt)
  const w = window.open('', '_blank', 'noopener,noreferrer')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  const runPrint = () => {
    w.addEventListener('afterprint', () => {
      w.close()
    })
    w.print()
  }
  if (w.document.readyState === 'complete') runPrint()
  else w.onload = runPrint
}

export function CheckoutPage() {
  const { user } = useAuth()
  const { cartItems, cartSubtotal, clearCart } = useCartDrawer()

  const [fullName, setFullName] = useState(() => user?.name ?? '')
  const [email, setEmail] = useState(() => user?.email ?? '')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [landmark, setLandmark] = useState('')
  const [city, setCity] = useState('')
  const [stateNg, setStateNg] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [orderReceipt, setOrderReceipt] = useState<OrderReceipt | null>(null)
  const [shopFees, setShopFees] = useState<ShopFees | null>(null)
  const [deliveryZoneId, setDeliveryZoneId] = useState('')

  useEffect(() => {
    let on = true
    void (async () => {
      const fees = await fetchShopFees()
      if (!on) return
      setShopFees(fees)
      if (fees.deliveryZones.length > 0) {
        setDeliveryZoneId((prev) =>
          prev && fees.deliveryZones.some((z) => z.id === prev) ? prev : fees.deliveryZones[0].id,
        )
      } else {
        setDeliveryZoneId('')
      }
    })()
    return () => {
      on = false
    }
  }, [])

  const deliveryZones = shopFees?.deliveryZones ?? []
  const selectedZone = useMemo(() => {
    if (deliveryZones.length === 0) return null
    return deliveryZones.find((z) => z.id === deliveryZoneId) ?? deliveryZones[0]
  }, [deliveryZones, deliveryZoneId])

  const { deliveryNgn, processingNgn, processingVatNgn, totalNgn } = useMemo(() => {
    const p = shopFees?.processingFeeNgn ?? 1_200
    const vatPct = shopFees?.processingVatPercent ?? 0
    const d = selectedZone ? selectedZone.feeNgn : (shopFees?.deliveryFeeNgn ?? 4_000)
    return computeCheckoutTotalWithFlatFees(cartSubtotal, d, p, vatPct)
  }, [cartSubtotal, shopFees, selectedZone])

  const processingWithVatNgn = processingNgn + processingVatNgn

  useEffect(() => {
    if (!user) return
    setFullName((n) => (n.trim() ? n : user.name))
    setEmail((e) => (e.trim() ? e : user.email))
  }, [user])

  if (!user) {
    return (
      <section className="min-h-0 flex-1 bg-tle-cream/60 px-4 pb-20 pt-28 sm:px-6 md:px-10 md:pt-32 lg:px-16">
        <div className="mx-auto w-full max-w-[440px] rounded-[28px] border border-black/8 bg-white p-8 text-center shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
          <h1 className="font-sans text-xl font-semibold text-tle-ink">Sign in to checkout</h1>
          <p className="mt-2 text-sm text-tle-muted">We need your account to save your cart across devices and confirm orders.</p>
          <Link
            to="/login"
            state={{ from: '/checkout' }}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-tle-charcoal py-3.5 text-[12px] font-bold tracking-[0.12em] text-white no-underline uppercase transition-colors hover:bg-tle-pink"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            state={{ from: '/checkout' }}
            className="mt-3 inline-block text-sm font-semibold text-tle-pink no-underline hover:text-tle-deep"
          >
            Create an account
          </Link>
        </div>
      </section>
    )
  }

  if (orderReceipt) {
    const placedLabel = new Date(orderReceipt.placedAt).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
    const sh = orderReceipt.shipping

    return (
      <section className="min-h-0 flex-1 bg-tle-cream/60 px-4 pb-24 pt-28 sm:px-6 md:px-10 md:pt-32 lg:px-16">
        <div className="mx-auto flex w-full max-w-lg flex-col items-stretch gap-8">
          <article
            id="checkout-receipt"
            className="relative overflow-hidden rounded-sm border border-black/15 bg-white shadow-[0_2px_0_0_rgba(24,24,24,0.06),0_16px_48px_rgba(0,0,0,0.08)]"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[repeating-linear-gradient(90deg,transparent,transparent_6px,#18181812_6px,#18181812_8px)]" />

            <div className="px-6 pb-2 pt-8 text-center sm:px-8 sm:pt-10">
              <p className="text-[10px] font-semibold tracking-[0.28em] text-tle-gold uppercase">Sales receipt</p>
              <p className="mt-1 font-sans text-xl font-bold tracking-tight text-tle-ink sm:text-2xl">{STORE_RECEIPT_NAME}</p>
              <div className="mx-auto mt-4 flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <span className="material-symbols-outlined text-[26px] leading-none">check_circle</span>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-tle-muted">
                Thank you. We&apos;ll contact you at{' '}
                <span className="font-semibold text-tle-ink">{sh.email}</span> about your order.
              </p>
            </div>

            <div className="mx-6 border-t border-dashed border-black/15 sm:mx-8" />

            <div className="space-y-1 px-6 py-4 text-left text-[12px] text-tle-muted sm:px-8">
              <div className="flex justify-between gap-3">
                <span>Order ref</span>
                <span className="max-w-[58%] truncate font-mono text-[11px] font-medium text-tle-ink" title={orderReceipt.id}>
                  {orderReceipt.id}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Date</span>
                <span className="text-right font-medium text-tle-ink">{placedLabel}</span>
              </div>
            </div>

            <div className="mx-6 border-t border-dashed border-black/15 sm:mx-8" />

            <div className="px-6 py-4 sm:px-8">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">Items</p>
              <ul className="mt-3 space-y-3">
                {orderReceipt.lines.map((line, i) => (
                  <li
                    key={`${line.name}-${line.variantLabel ?? ''}-${i}`}
                    className="flex gap-3 border-b border-dashed border-black/[0.08] pb-3 text-[13px] last:border-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug text-tle-ink">{line.name}</p>
                      {line.variantLabel ? (
                        <p className="mt-0.5 text-[11px] text-tle-muted">{line.variantLabel}</p>
                      ) : null}
                      <p className="mt-0.5 text-[11px] tabular-nums text-tle-muted">Qty {line.quantity}</p>
                    </div>
                    <p className="shrink-0 tabular-nums font-semibold text-tle-ink">{formatNaira(line.lineTotalNgn)}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mx-6 border-t border-dashed border-black/15 sm:mx-8" />

            <div className="space-y-2 px-6 py-4 text-[13px] sm:px-8">
              <div className="flex justify-between text-tle-muted">
                <span>Subtotal</span>
                <span className="tabular-nums font-medium text-tle-ink">{formatNaira(orderReceipt.subtotalNgn)}</span>
              </div>
              <div className="flex justify-between gap-2 text-tle-muted">
                <span className="max-w-[70%] leading-snug">{orderReceipt.deliverySummaryLabel}</span>
                <span className="shrink-0 tabular-nums font-medium text-tle-ink">{formatNaira(orderReceipt.deliveryNgn)}</span>
              </div>
              <div className="flex justify-between text-tle-muted">
                <span>Processing</span>
                <span className="tabular-nums font-medium text-tle-ink">{formatNaira(orderReceipt.processingNgn)}</span>
              </div>
              {orderReceipt.processingVatNgn > 0 ? (
                <div className="flex justify-between text-tle-muted">
                  <span>VAT on processing</span>
                  <span className="tabular-nums font-medium text-tle-ink">{formatNaira(orderReceipt.processingVatNgn)}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t-2 border-tle-ink/90 pt-3 font-sans text-base font-bold text-tle-ink">
                <span>Total</span>
                <span className="tabular-nums">{formatNaira(orderReceipt.totalNgn)}</span>
              </div>
            </div>

            <div className="mx-6 border-t border-dashed border-black/15 sm:mx-8" />

            <div className="px-6 py-5 text-left text-[13px] leading-relaxed sm:px-8">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">Ship to / contact</p>
              <p className="mt-2 font-semibold text-tle-ink">{sh.fullName}</p>
              <p className="text-tle-muted">{sh.email}</p>
              <p className="text-tle-muted">{sh.phone}</p>
              <p className="mt-2 text-tle-ink">
                {sh.line1}
                {sh.line2 ? (
                  <>
                    <br />
                    {sh.line2}
                  </>
                ) : null}
                <br />
                {sh.city}, {sh.state}
                <br />
                {sh.country}
              </p>
              {sh.deliveryOptionLabel ? (
                <p className="mt-2 text-[12px] text-tle-muted">
                  <span className="font-semibold text-tle-ink">Option:</span> {sh.deliveryOptionLabel}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 border-t border-black/[0.06] bg-tle-cream/40 px-6 py-5 sm:flex-row sm:px-8">
              <button
                type="button"
                onClick={() => downloadReceiptFile(orderReceipt)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-tle-ink/15 bg-white py-3 text-[11px] font-bold tracking-[0.14em] text-tle-ink uppercase transition hover:border-tle-pink hover:text-tle-pink"
              >
                <span className="material-symbols-outlined text-[20px] leading-none">download</span>
                Download receipt
              </button>
              <button
                type="button"
                onClick={() => printReceiptInNewWindow(orderReceipt)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-tle-charcoal py-3 text-[11px] font-bold tracking-[0.14em] text-white uppercase transition hover:bg-tle-pink"
              >
                <span className="material-symbols-outlined text-[20px] leading-none">print</span>
                Print / PDF
              </button>
            </div>
          </article>

          <div className="flex justify-center sm:justify-start">
            <Link
              to="/shop"
              replace
              className="inline-flex items-center justify-center rounded-full border-2 border-transparent bg-transparent py-3 text-[12px] font-bold tracking-[0.12em] text-tle-pink uppercase underline-offset-4 transition hover:text-tle-deep hover:underline"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </section>
    )
  }

  if (cartItems.length === 0) {
    return (
      <section className="min-h-0 flex-1 bg-tle-cream/60 px-4 pb-20 pt-28 sm:px-6 md:px-10 md:pt-32 lg:px-16">
        <div className="mx-auto w-full max-w-[440px] rounded-[28px] border border-black/8 bg-white p-8 text-center shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
          <h1 className="font-sans text-xl font-semibold text-tle-ink">Your cart is empty</h1>
          <p className="mt-2 text-sm text-tle-muted">Add something beautiful before checking out.</p>
          <Link
            to="/shop"
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-tle-charcoal py-3.5 text-[12px] font-bold tracking-[0.12em] text-white no-underline uppercase transition-colors hover:bg-tle-pink"
          >
            Browse shop
          </Link>
        </div>
      </section>
    )
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!fullName.trim() || !email.trim() || !phone.trim() || !street.trim() || !city.trim() || !stateNg.trim()) {
      setError('Please fill in all required fields, including state.')
      return
    }

    if (!shopFees) {
      setError('Still loading. Try again in a moment.')
      return
    }

    setBusy(true)
    try {
      const lineItems = cartItems.map((item) => {
        const fromCart =
          (typeof item.img === 'string' && item.img.trim() ? item.img.trim() : undefined) ??
          getDefaultImageUrls(item).find((x) => typeof x === 'string' && x.trim())
        const raw = fromCart?.trim()
        const image = raw ? displayableImageUrl(raw) || undefined : undefined
        return {
          slug: item.slug,
          variantId: item.variantId,
          variantLabel: item.variantLabel,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image,
          category: item.cat,
          badge: typeof item.badge === 'string' && item.badge.trim() ? item.badge.trim() : undefined,
        }
      })

      const subtotal = cartSubtotal
      const zones = shopFees.deliveryZones
      const zone =
        zones.length > 0
          ? zones.find((z) => z.id === deliveryZoneId) ?? zones[0]
          : null
      const d = zone ? zone.feeNgn : shopFees.deliveryFeeNgn
      const p = shopFees.processingFeeNgn
      const fees = computeCheckoutTotalWithFlatFees(subtotal, d, p, shopFees.processingVatPercent)

      const result = await createOrder({
        userId: user.id,
        email: email.trim(),
        shipping: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          line1: street.trim(),
          line2: landmark.trim() || undefined,
          city: city.trim(),
          state: stateNg.trim(),
          country: 'Nigeria',
          ...(zone
            ? { deliveryOptionId: zone.id, deliveryOptionLabel: zone.label }
            : {}),
        },
        lineItems,
        subtotalNgn: subtotal,
        deliveryNgn: fees.deliveryNgn,
        processingNgn: fees.processingNgn,
        processingVatNgn: fees.processingVatNgn,
        totalNgn: fees.totalNgn,
      })

      if (!result.ok) {
        setError(result.message)
        return
      }

      const shippingSnapshot: ReceiptShipping = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        line1: street.trim(),
        line2: landmark.trim() || undefined,
        city: city.trim(),
        state: stateNg.trim(),
        country: 'Nigeria',
        ...(zone ? { deliveryOptionLabel: zone.label } : {}),
      }
      const receiptLines: ReceiptLineItem[] = cartItems.map((item) => ({
        name: item.name,
        variantLabel: item.variantLabel?.trim() || undefined,
        quantity: item.quantity,
        lineTotalNgn: parseProductPriceNgn(item.price) * item.quantity,
      }))

      setOrderReceipt({
        id: result.id,
        placedAt: new Date().toISOString(),
        subtotalNgn: subtotal,
        deliveryNgn: fees.deliveryNgn,
        processingNgn: fees.processingNgn,
        processingVatNgn: fees.processingVatNgn,
        totalNgn: fees.totalNgn,
        deliverySummaryLabel: zone ? zone.label : 'Delivery',
        lines: receiptLines,
        shipping: shippingSnapshot,
      })
      clearCart()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="min-h-0 flex-1 bg-tle-cream/60 px-4 pb-20 pt-28 sm:px-6 md:px-10 md:pt-32 lg:px-16">
      <div className="mx-auto w-full max-w-[1100px]">
        <div className="mb-3 flex items-center gap-3">
          <div className="h-px w-[22px] bg-tle-gold" />
          <span className="text-[10px] font-semibold tracking-[0.22em] text-tle-gold uppercase">Checkout</span>
        </div>
        <h1 className="font-sans text-[clamp(1.75rem,4vw,2.25rem)] font-semibold text-tle-ink">Delivery in Nigeria</h1>
        <p className="mt-2 max-w-xl text-sm text-tle-muted">
          {deliveryZones.length > 0
            ? `Pick your delivery or pickup option. Processing ${formatNaira(processingWithVatNgn)}${processingVatNgn > 0 ? ' (incl. VAT)' : ''} applies once per order.`
            : `Delivery ${formatNaira(deliveryNgn)} plus processing ${formatNaira(processingWithVatNgn)}${processingVatNgn > 0 ? ' (incl. VAT)' : ''} per order.`}
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start"
        >
          <div className="rounded-[28px] border border-black/8 bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] sm:p-8">
            <h2 className="font-sans text-lg font-semibold text-tle-ink">Where should we deliver?</h2>
            <p className="mt-1 text-xs text-tle-muted">All deliveries are within Nigeria. * Required.</p>

            {error ? (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                {error}
              </p>
            ) : null}

            {deliveryZones.length > 0 ? (
              <label className="mt-6 block">
                <span className="mb-2 block text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">
                  Delivery or pickup *
                </span>
                <select
                  value={deliveryZoneId}
                  onChange={(e) => setDeliveryZoneId(e.target.value)}
                  className="w-full cursor-pointer rounded-2xl border-[1.5px] border-black/10 bg-white px-4 py-3 text-sm text-tle-ink outline-none transition-colors focus:border-tle-pink"
                  required
                >
                  {deliveryZones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.label} — {z.feeNgn === 0 ? 'FREE' : formatNaira(z.feeNgn)}
                    </option>
                  ))}
                </select>
                {selectedZone?.description ? (
                  <p
                    className={
                      'mt-3 rounded-2xl border border-emerald-200/90 bg-emerald-50 px-3.5 py-3 text-[13px] font-semibold leading-relaxed text-emerald-950'
                    }
                    role="note"
                  >
                    {selectedZone.description}
                  </p>
                ) : null}
              </label>
            ) : null}

            <label className="mt-6 block">
              <span className="mb-2 block text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">Full name *</span>
              <input
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-2xl border-[1.5px] border-black/10 bg-white px-4 py-3 text-sm text-tle-ink outline-none transition-colors placeholder:text-tle-faint focus:border-tle-pink"
                placeholder="Your full name"
                required
              />
            </label>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">Email *</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border-[1.5px] border-black/10 bg-white px-4 py-3 text-sm text-tle-ink outline-none transition-colors placeholder:text-tle-faint focus:border-tle-pink"
                  required
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">Phone (WhatsApp ok) *</span>
                <input
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-2xl border-[1.5px] border-black/10 bg-white px-4 py-3 text-sm text-tle-ink outline-none transition-colors placeholder:text-tle-faint focus:border-tle-pink"
                  placeholder="0803 … or +234 …"
                  required
                />
              </label>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">Street address *</span>
              <input
                type="text"
                autoComplete="street-address"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="w-full rounded-2xl border-[1.5px] border-black/10 bg-white px-4 py-3 text-sm text-tle-ink outline-none transition-colors placeholder:text-tle-faint focus:border-tle-pink"
                placeholder="House number, street name, estate"
                required
              />
            </label>

            <label className="mt-5 block">
              <span className="mb-2 block text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">Landmark (optional)</span>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="w-full rounded-2xl border-[1.5px] border-black/10 bg-white px-4 py-3 text-sm text-tle-ink outline-none transition-colors placeholder:text-tle-faint focus:border-tle-pink"
                placeholder="e.g. Near Shoprite, bus stop…"
              />
            </label>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">City / Town *</span>
                <input
                  type="text"
                  autoComplete="address-level2"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-2xl border-[1.5px] border-black/10 bg-white px-4 py-3 text-sm text-tle-ink outline-none transition-colors placeholder:text-tle-faint focus:border-tle-pink"
                  placeholder="e.g. Ikeja"
                  required
                />
              </label>
              <label className="block sm:col-span-2 sm:max-w-none">
                <span className="mb-2 block text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">State *</span>
                <select
                  value={stateNg}
                  onChange={(e) => setStateNg(e.target.value)}
                  className="w-full rounded-2xl border-[1.5px] border-black/10 bg-white px-4 py-3 text-sm text-tle-ink outline-none transition-colors focus:border-tle-pink"
                  required
                >
                  <option value="">Choose your state</option>
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="mt-4 rounded-xl border border-black/[0.06] bg-tle-cream/60 px-3 py-2 text-[11px] leading-relaxed text-tle-muted">
              Country: <span className="font-medium text-tle-ink">Nigeria</span> — no extra fields needed.
            </p>

            <button
              type="submit"
              disabled={busy || !shopFees}
              className="mt-8 w-full rounded-full bg-tle-charcoal py-3.5 text-[12px] font-bold tracking-[0.12em] text-white uppercase transition-colors hover:bg-tle-pink disabled:opacity-60 lg:hidden"
            >
              {busy ? 'Placing order…' : `Place order · ${formatNaira(totalNgn)}`}
            </button>
          </div>

          <aside className="rounded-[28px] border border-black/8 bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] sm:p-8 lg:sticky lg:top-28">
            <h2 className="font-sans text-lg font-semibold text-tle-ink">Order summary</h2>
            <p className="mt-1 text-xs text-tle-muted">
              {cartItems.length} line{cartItems.length === 1 ? '' : 's'}
            </p>

            <ul className="mt-6 max-h-[260px] space-y-4 overflow-y-auto border-t border-black/[0.06] pt-6">
              {cartItems.map((item) => {
                const lineKey = cartLineKey(item.slug, item.variantId)
                const lineTotal = parseProductPriceNgn(item.price) * item.quantity
                return (
                  <li key={lineKey} className="flex gap-3">
                    <img src={displayableImageUrl(item.img)} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-tle-ink">{item.name}</p>
                      <p className="text-[10px] tracking-wide text-tle-muted uppercase">
                        {item.variantLabel ? `${item.variantLabel} · ` : ''}Qty {item.quantity}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-tle-gold">{formatNaira(lineTotal)}</p>
                  </li>
                )
              })}
            </ul>

            <div className="mt-6 space-y-2 border-t border-black/[0.07] pt-6 text-[13px]">
              <div className="flex justify-between text-tle-muted">
                <span>Subtotal</span>
                <span className="font-medium text-tle-ink">{formatNaira(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between text-tle-muted">
                <span>{deliveryZones.length > 0 ? 'Delivery / pickup' : 'Delivery'}</span>
                <span className="font-medium text-tle-ink">{formatNaira(deliveryNgn)}</span>
              </div>
              <div className="flex justify-between text-tle-muted">
                <span>Processing</span>
                <span className="font-medium text-tle-ink">{formatNaira(processingNgn)}</span>
              </div>
              {processingVatNgn > 0 ? (
                <div className="flex justify-between text-tle-muted">
                  <span>VAT on processing</span>
                  <span className="font-medium text-tle-ink">{formatNaira(processingVatNgn)}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-black/[0.08] pt-3 font-sans text-lg font-semibold text-tle-ink">
                <span>Total</span>
                <span>{formatNaira(totalNgn)}</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-tle-faint">
              Payment details will be confirmed with you before dispatch.
            </p>

            <button
              type="submit"
              disabled={busy || !shopFees}
              className="mt-6 hidden w-full rounded-full bg-tle-charcoal py-[18px] text-xs font-bold tracking-wide text-white uppercase transition-colors hover:bg-tle-pink disabled:opacity-60 lg:block"
            >
              {busy ? 'Placing order…' : `Place order · ${formatNaira(totalNgn)}`}
            </button>
          </aside>
        </form>
      </div>
    </section>
  )
}
