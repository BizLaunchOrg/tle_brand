import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { BookingPaymentProofFields } from '../../components/BookingPaymentProofFields.tsx'
import { BookingTransferDetailsCard } from '../../components/BookingTransferDetailsCard.tsx'
import { BOOKING_TRANSFER_DEMO } from '../../data/bookingTransferDetails.ts'
import {
  cartLineKey,
  displayableImageUrl,
  getDefaultImageUrls,
  parseProductPriceNgn,
} from '../../data/products.ts'
import { NIGERIAN_STATES } from '../../data/nigerianStates.ts'
import { useAuth } from '../../context/AuthContext'
import { useCartDrawer } from '../../context/CartDrawerContext.tsx'
import { computeCheckoutTotalWithFees } from '../../lib/checkoutPricing.ts'
import { uploadOrderPaymentProof } from '../../lib/orderPaymentProof.ts'
import { PRINT_LOGO_CSS, printLogoImgHtml, siteLogoPath } from '../../lib/printBrandAssets.ts'
import { formatReceiptDate, formatReceiptTime } from '../../lib/receiptDateTime.ts'
import { fetchShopFees, type ShopFees } from '../../lib/shopSettings.ts'
import { STORE_RECEIPT_NAME } from '../../lib/storeBrand.ts'
import { createOrder } from '../../lib/userShopSync.ts'
import { fetchUserAddresses, saveUserAddress, type UserAddress } from '../../lib/userAddresses.ts'
import { toast } from 'react-hot-toast'

const formatNaira = (value: number) => `₦${value.toLocaleString()}`

type CheckoutPhase = 'shipping' | 'payment'

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
  salesVatNgn: number
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
  const dateStr = escapeHtml(formatReceiptDate(receipt.placedAt))
  const timeStr = escapeHtml(formatReceiptTime(receipt.placedAt))
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
    ${PRINT_LOGO_CSS}
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
    ${printLogoImgHtml(escapeHtml)}
    <h1>Sales receipt</h1>
    <p class="store">${escapeHtml(STORE_RECEIPT_NAME)}</p>
    <div class="meta">
      <div><strong>Order ref</strong> · ${escapeHtml(receipt.id)}</div>
      <div><strong>Date</strong> · ${dateStr}</div>
      <div><strong>Time</strong> · ${timeStr}</div>
    </div>
    <hr class="rule"/>
    <table>
      <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead>
      <tbody>${linesRows}</tbody>
    </table>
    <div class="totals">
      <div><span>Subtotal</span><span>${formatNaira(receipt.subtotalNgn)}</span></div>
      <div><span>${escapeHtml(receipt.deliverySummaryLabel)}</span><span>${formatNaira(receipt.deliveryNgn)}</span></div>
      <div><span>Processing & tax</span><span>${formatNaira(receipt.processingNgn + receipt.salesVatNgn)}</span></div>
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
  a.download = `tobilicious-receipt-${receipt.id.slice(0, 8)}.html`
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
    const imgs = [...w.document.images]
    const done = () => {
      w.addEventListener('afterprint', () => w.close(), { once: true })
      w.print()
    }
    if (imgs.length === 0) {
      done()
      return
    }
    void Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve()
              return
            }
            img.addEventListener('load', () => resolve(), { once: true })
            img.addEventListener('error', () => resolve(), { once: true })
          }),
      ),
    ).then(done)
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

  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState('')
  /** Label for the permanent address row (Home, Office, …). Shown when picking a saved card or before saving new. */
  const [addressNickname, setAddressNickname] = useState('')
  const [saveAddressBusy, setSaveAddressBusy] = useState(false)
  const [addressUiMode, setAddressUiMode] = useState<'pick-saved' | 'edit-details'>('edit-details')

  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<CheckoutPhase>('shipping')
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [paymentProofVerified, setPaymentProofVerified] = useState(false)
  const [orderReceipt, setOrderReceipt] = useState<OrderReceipt | null>(null)
  const [shopFees, setShopFees] = useState<ShopFees | null>(null)
  const [deliveryZoneId, setDeliveryZoneId] = useState('')

  useEffect(() => {
    if (!user) return
    void (async () => {
      const addrs = await fetchUserAddresses()
      setSavedAddresses(addrs)
      if (addrs.length > 0) {
        setSelectedAddressId(addrs[0].id)
        applySavedAddress(addrs[0])
        setAddressUiMode('pick-saved')
      } else {
        setSelectedAddressId('')
        setAddressNickname('')
        setAddressUiMode('edit-details')
      }
    })()
  }, [user])

  const applySavedAddress = (addr: UserAddress) => {
    setAddressNickname(addr.name)
    setFullName(addr.full_name)
    setPhone(addr.phone)
    setStreet(addr.street)
    setLandmark(addr.landmark ?? '')
    setCity(addr.city)
    setStateNg(addr.state)
  }

  const onSelectSavedAddress = (id: string) => {
    setSelectedAddressId(id)
    const addr = savedAddresses.find((a) => a.id === id)
    if (addr) applySavedAddress(addr)
  }

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

  const { deliveryNgn, processingNgn, salesVatNgn, totalNgn } = useMemo(() => {
    const p = shopFees?.processingFeeNgn ?? 1_200
    const vatPercent = shopFees?.salesVatPercent ?? 0
    const d = selectedZone ? selectedZone.feeNgn : (shopFees?.deliveryFeeNgn ?? 4_000)
    return computeCheckoutTotalWithFees(cartSubtotal, d, p, {
      salesVatPercent: vatPercent,
    })
  }, [cartSubtotal, shopFees, selectedZone])

  useEffect(() => {
    if (!user) return
    setFullName((n) => (n.trim() ? n : user.name))
    setEmail((e) => (e.trim() ? e : user.email))
  }, [user])

  const hasValidShippingPick =
    Boolean(selectedAddressId.trim()) &&
    savedAddresses.length > 0 &&
    savedAddresses.some((a) => a.id === selectedAddressId)

  const shippingComplete = useMemo(() => {
    if (!shopFees) return false
    if (!hasValidShippingPick) return false
    if (deliveryZones.length > 0 && !deliveryZoneId.trim()) return false
    const phoneOk = phone.replace(/\D/g, '').length >= 7
    return Boolean(
      fullName.trim() &&
        email.trim() &&
        phoneOk &&
        street.trim() &&
        city.trim() &&
        stateNg.trim(),
    )
  }, [
    shopFees,
    hasValidShippingPick,
    deliveryZones.length,
    deliveryZoneId,
    fullName,
    email,
    phone,
    street,
    city,
    stateNg,
  ])

  useEffect(() => {
    if (!paymentProofFile) {
      setPaymentProofVerified(false)
    }
  }, [paymentProofFile])

  const canPlaceOrder = Boolean(paymentProofFile && paymentConfirmed && !busy)

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
    const placedDateLabel = formatReceiptDate(orderReceipt.placedAt)
    const placedTimeLabel = formatReceiptTime(orderReceipt.placedAt)
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
              <img src={siteLogoPath()} alt="TLE logo" className="mx-auto h-16 w-auto object-contain" />
              <p className="mt-4 font-sans text-xl font-bold tracking-tight text-tle-ink sm:text-2xl">{STORE_RECEIPT_NAME}</p>
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
                <span className="text-right font-medium text-tle-ink">{placedDateLabel}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Time</span>
                <span className="text-right font-medium text-tle-ink">{placedTimeLabel}</span>
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
              {orderReceipt.salesVatNgn > 0 ? (
                <div className="flex justify-between text-tle-muted">
                  <span>VAT on products</span>
                  <span className="tabular-nums font-medium text-tle-ink">{formatNaira(orderReceipt.salesVatNgn)}</span>
                </div>
              ) : null}
              <div className="flex justify-between gap-2 text-tle-muted">
                <span className="max-w-[70%] leading-snug">{orderReceipt.deliverySummaryLabel}</span>
                <span className="shrink-0 tabular-nums font-medium text-tle-ink">{formatNaira(orderReceipt.deliveryNgn)}</span>
              </div>
              <div className="flex justify-between text-tle-muted">
                <span>Processing & tax</span>
                <span className="tabular-nums font-medium text-tle-ink">{formatNaira(orderReceipt.processingNgn + orderReceipt.salesVatNgn)}</span>
              </div>
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

  const buildCheckoutPayload = () => {
    if (!shopFees || !user) return null
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
    const zone = zones.length > 0 ? zones.find((z) => z.id === deliveryZoneId) ?? zones[0] : null
    const d = zone ? zone.feeNgn : shopFees.deliveryFeeNgn
    const p = shopFees.processingFeeNgn
    const fees = computeCheckoutTotalWithFees(subtotal, d, p, {
      salesVatPercent: shopFees.salesVatPercent,
    })
    const shipping = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      line1: street.trim(),
      line2: landmark.trim() || undefined,
      city: city.trim(),
      state: stateNg.trim(),
      country: 'Nigeria',
      ...(zone ? { deliveryOptionId: zone.id, deliveryOptionLabel: zone.label } : {}),
    }
    return { lineItems, subtotal, zone, fees, shipping }
  }

  const onShippingSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!shippingComplete) {
      setError('Please fill in all required delivery fields before continuing.')
      return
    }

    setPaymentProofFile(null)
    setPaymentConfirmed(false)
    setPhase('payment')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const savePermanentAddress = async () => {
    const label = addressNickname.trim()
    const fn = fullName.trim()
    const ph = phone.trim()
    const st = street.trim()
    const lm = landmark.trim()
    const ct = city.trim()
    const stt = stateNg.trim()
    if (!label) {
      toast.error('Add an address nickname (e.g. Home or Office).')
      return
    }
    if (!fn) {
      toast.error('Enter the recipient full name.')
      return
    }
    if (ph.replace(/\D/g, '').length < 7) {
      toast.error('Enter a valid phone number.')
      return
    }
    if (!st || !ct || !stt) {
      toast.error('Fill street, city, and state.')
      return
    }
    setSaveAddressBusy(true)
    const res = await saveUserAddress({
      name: label,
      full_name: fn,
      phone: ph,
      street: st,
      landmark: lm || null,
      city: ct,
      state: stt,
    })
    setSaveAddressBusy(false)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    const addrs = await fetchUserAddresses()
    setSavedAddresses(addrs)
    const created = addrs.find((a) => a.id === res.id)
    if (created) {
      setSelectedAddressId(created.id)
      applySavedAddress(created)
    }
    toast.success('Permanent address saved.')
    setAddressUiMode('pick-saved')
  }

  const confirmPaidOrder = async () => {
    setError(null)
    if (!shippingComplete) {
      setError('Please complete delivery details first.')
      setPhase('shipping')
      return
    }
    if (!paymentProofFile || !paymentConfirmed) {
      setError('Upload your transfer screenshot and tick "I\'ve made payment" to place your order.')
      return
    }
    const payload = buildCheckoutPayload()
    if (!payload || !user) {
      setError('Still loading. Try again in a moment.')
      return
    }

    setBusy(true)
    try {
      const orderId = crypto.randomUUID()
      const up = await uploadOrderPaymentProof(orderId, paymentProofFile)
      if (up.ok === false) {
        setError(up.message)
        return
      }

      const { lineItems, subtotal, zone, fees, shipping } = payload
      setPaymentProofVerified(true)
      const result = await createOrder({
        id: orderId,
        userId: user.id,
        email: email.trim(),
        shipping,
        lineItems,
        subtotalNgn: subtotal,
        deliveryNgn: fees.deliveryNgn,
        processingNgn: fees.processingNgn,
        salesVatNgn: fees.salesVatNgn,
        totalNgn: fees.totalNgn,
        payment_proof_storage_path: up.path,
      })

      if (!result.ok) {
        setError(result.message)
        return
      }

      const shippingSnapshot: ReceiptShipping = {
        fullName: shipping.fullName,
        phone: shipping.phone,
        email: shipping.email,
        line1: shipping.line1,
        line2: shipping.line2,
        city: shipping.city,
        state: shipping.state,
        country: shipping.country,
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
        salesVatNgn: fees.salesVatNgn,
        totalNgn: fees.totalNgn,
        deliverySummaryLabel: zone ? zone.label : 'Delivery',
        lines: receiptLines,
        shipping: shippingSnapshot,
      })
      setPaymentProofFile(null)
      setPaymentConfirmed(false)
      setPhase('shipping')
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
        <h1 className="font-sans text-[clamp(1.75rem,4vw,2.25rem)] font-semibold text-tle-ink">
          {phase === 'shipping' ? 'Delivery in Nigeria' : 'Pay by transfer'}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-tle-muted">
          {phase === 'shipping'
            ? deliveryZones.length > 0
              ? `Complete every field below, then continue to payment. Processing & tax ${formatNaira(processingNgn + salesVatNgn)} applies once per order.`
              : `Complete every field below, then continue to payment. Delivery ${formatNaira(deliveryNgn)} plus processing & tax ${formatNaira(processingNgn + salesVatNgn)} per order.`
            : `Transfer exactly ${formatNaira(totalNgn)} to the account below within the timer. Upload your payment screenshot before placing the order.`}
        </p>

        <form
          onSubmit={phase === 'shipping' ? onShippingSubmit : (e) => e.preventDefault()}
          className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start"
        >
          <div className="rounded-[28px] border border-black/8 bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] sm:p-8">
            {error ? (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                {error}
              </p>
            ) : null}

            {phase === 'shipping' ? (
              <>
                <h2 className="font-sans text-xl font-semibold tracking-tight text-tle-ink">Delivery</h2>

                <div className="mt-8 rounded-[22px] border border-black/[0.07] bg-gradient-to-br from-white via-white to-tle-cream/40 p-5 sm:p-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-tle-gold">1 · Contact</p>
                  <h3 className="mt-2 font-sans text-[15px] font-semibold text-tle-ink">Email</h3>
                  <label className="mt-4 block">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-tle-muted">
                      Email address *
                    </span>
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-2 w-full cursor-text rounded-xl border border-black/12 bg-white px-4 py-3 text-[15px] leading-snug text-tle-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-black/35 focus:border-tle-pink focus:ring-[3px] focus:ring-tle-pink/12"
                      required
                    />
                  </label>
                </div>

                {deliveryZones.length > 0 ? (
                  <div className="mt-6 rounded-[22px] border border-black/[0.07] bg-gradient-to-br from-white via-white to-tle-cream/40 p-5 sm:p-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-tle-gold">2 · Delivery</p>
                    <h3 className="mt-2 font-sans text-[15px] font-semibold text-tle-ink">Option</h3>
                    <label className="mt-4 block">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-tle-muted">
                        Delivery or pickup *
                      </span>
                      <select
                        value={deliveryZoneId}
                        onChange={(e) => setDeliveryZoneId(e.target.value)}
                        className="mt-2 w-full cursor-pointer rounded-xl border border-black/12 bg-white px-4 py-3 text-[15px] leading-snug text-tle-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-[border-color,box-shadow] focus:border-tle-pink focus:ring-[3px] focus:ring-tle-pink/12"
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
                          className="mt-3 rounded-xl border border-emerald-200/90 bg-emerald-50 px-3.5 py-3 text-[13px] font-semibold leading-relaxed text-emerald-950"
                          role="note"
                        >
                          {selectedZone.description}
                        </p>
                      ) : null}
                    </label>
                  </div>
                ) : null}

                <div
                  id="checkout-delivery-address"
                  className="mt-6 rounded-[22px] border border-black/[0.07] bg-gradient-to-br from-white via-white to-tle-blush/30 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:p-7"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-tle-gold">
                    {deliveryZones.length > 0 ? '3 · Delivery address' : '2 · Delivery address'}
                  </p>
                  <div className="mt-3 flex flex-col gap-4 border-b border-black/[0.06] pb-6 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-sans text-[17px] font-semibold text-tle-ink">Delivery address</h3>
                    {savedAddresses.length > 0 ? (
                      <div
                        className="flex shrink-0 rounded-full border border-black/10 bg-white/90 p-1 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                        role="tablist"
                        aria-label="Address source"
                      >
                        <button
                          type="button"
                          role="tab"
                          aria-selected={addressUiMode === 'pick-saved'}
                          onClick={() => {
                            setAddressUiMode('pick-saved')
                            const ok = savedAddresses.some((a) => a.id === selectedAddressId)
                            if (!ok && savedAddresses[0]) onSelectSavedAddress(savedAddresses[0].id)
                          }}
                          className={
                            'cursor-pointer rounded-full px-4 py-2 text-[12px] font-semibold transition-colors sm:px-5 ' +
                            (addressUiMode === 'pick-saved'
                              ? 'bg-tle-charcoal text-white shadow-sm'
                              : 'text-tle-muted hover:text-tle-ink')
                          }
                        >
                          Saved addresses
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={addressUiMode === 'edit-details'}
                          onClick={() => setAddressUiMode('edit-details')}
                          className={
                            'cursor-pointer rounded-full px-4 py-2 text-[12px] font-semibold transition-colors sm:px-5 ' +
                            (addressUiMode === 'edit-details'
                              ? 'bg-tle-charcoal text-white shadow-sm'
                              : 'text-tle-muted hover:text-tle-ink')
                          }
                        >
                          Type address
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {savedAddresses.length > 0 && addressUiMode === 'pick-saved' ? (
                    <div className="mt-6 space-y-4">
                      <ul className="flex list-none flex-col gap-4 p-0">
                        {savedAddresses.map((addr) => {
                          const selected = selectedAddressId === addr.id
                          return (
                            <li key={addr.id}>
                              <div
                                className={
                                  'flex overflow-hidden rounded-2xl border bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-[box-shadow,border-color] ' +
                                  (selected
                                    ? 'border-tle-pink ring-2 ring-tle-pink/25'
                                    : 'border-black/[0.08] hover:border-tle-pink/30')
                                }
                              >
                                <button
                                  type="button"
                                  onClick={() => onSelectSavedAddress(addr.id)}
                                  className="min-w-0 flex-1 cursor-pointer px-4 py-4 text-left transition-colors hover:bg-tle-cream/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-tle-pink sm:px-5 sm:py-5"
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-sans text-[15px] font-bold capitalize tracking-tight text-tle-ink">
                                      {addr.name}
                                    </span>
                                    {selected ? (
                                      <span className="rounded-full bg-tle-blush px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-tle-pink">
                                        Delivering here
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="mt-3 text-[14px] font-semibold text-tle-ink">{addr.full_name}</p>
                                  <p className="mt-2 flex items-center gap-2 text-[13px] text-tle-muted">
                                    <span className="material-symbols-outlined text-[18px] leading-none text-tle-pink/80">
                                      call
                                    </span>
                                    <span className="tabular-nums">{addr.phone}</span>
                                  </p>
                                  <p className="mt-3 text-[13px] leading-relaxed text-tle-ink">
                                    {addr.street}
                                    {addr.landmark ? (
                                      <>
                                        <span className="text-tle-muted"> · </span>
                                        {addr.landmark}
                                      </>
                                    ) : null}
                                    <br />
                                    <span className="text-tle-muted">{addr.city}</span>, {addr.state}
                                  </p>
                                </button>
                                <div className="flex w-[76px] shrink-0 flex-col border-l border-black/[0.06] bg-gradient-to-b from-white to-tle-cream/40">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAddressUiMode('edit-details')
                                      onSelectSavedAddress(addr.id)
                                    }}
                                    className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 px-2 py-3 text-[10px] font-bold uppercase tracking-wide text-tle-pink transition-colors hover:bg-tle-pink/10"
                                  >
                                    <span className="material-symbols-outlined text-[22px] font-light">edit</span>
                                    Edit
                                  </button>
                                </div>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                      {savedAddresses.length < 3 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setAddressUiMode('edit-details')
                            setSelectedAddressId('')
                            setAddressNickname('')
                            setFullName(user?.name ?? '')
                            setPhone('')
                            setStreet('')
                            setLandmark('')
                            setCity('')
                            setStateNg('')
                          }}
                          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-tle-pink/35 bg-white/70 py-4 text-[13px] font-bold tracking-wide text-tle-pink transition-colors hover:border-tle-pink hover:bg-tle-pink/[0.06]"
                        >
                          <span className="material-symbols-outlined text-[22px]">add_circle</span>
                          Add new address
                        </button>
                      ) : (
                        <p className="text-center text-[12px] text-tle-muted">Maximum of 3 saved addresses reached.</p>
                      )}
                    </div>
                  ) : null}

                  {(savedAddresses.length === 0 || addressUiMode === 'edit-details') && (
                    <div id="checkout-address-details" className={savedAddresses.length > 0 ? 'mt-8 space-y-5 border-t border-black/[0.06] pt-8' : 'mt-6 space-y-5'}>
                      {savedAddresses.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setAddressUiMode('pick-saved')}
                          className="flex cursor-pointer items-center gap-1 text-[13px] font-semibold text-tle-pink underline-offset-4 hover:underline"
                        >
                          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                          Back to saved addresses
                        </button>
                      ) : null}

                      <label className="block">
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-tle-muted">
                          Address label *
                        </span>
                        <input
                          type="text"
                          autoComplete="off"
                          value={addressNickname}
                          onChange={(e) => setAddressNickname(e.target.value)}
                          className="mt-2 w-full cursor-text rounded-xl border border-black/12 bg-white px-4 py-3 text-[15px] leading-snug text-tle-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-black/35 focus:border-tle-pink focus:ring-[3px] focus:ring-tle-pink/12"
                          placeholder="Home"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-[11px] font-medium text-tle-ink">
                          Note to courier <span className="font-normal text-tle-muted">(optional)</span>
                        </span>
                        <input
                          type="text"
                          value={landmark}
                          onChange={(e) => setLandmark(e.target.value)}
                          className="mt-2 w-full cursor-text rounded-xl border border-black/12 bg-white px-4 py-3 text-[15px] leading-snug text-tle-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-black/35 focus:border-tle-pink focus:ring-[3px] focus:ring-tle-pink/12"
                          placeholder="Gate code, landmark, rider instructions…"
                        />
                      </label>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block sm:col-span-2 lg:col-span-1">
                          <span className="mb-1 block text-[11px] font-medium text-tle-ink">Recipient name *</span>
                          <input
                            type="text"
                            autoComplete="name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="mt-2 w-full cursor-text rounded-xl border border-black/12 bg-white px-4 py-3 text-[15px] leading-snug text-tle-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-black/35 focus:border-tle-pink focus:ring-[3px] focus:ring-tle-pink/12"
                            placeholder="Full name"
                            required
                          />
                        </label>
                        <label className="block sm:col-span-2 lg:col-span-1">
                          <span className="mb-1 block text-[11px] font-medium text-tle-ink">Phone *</span>
                          <input
                            type="tel"
                            autoComplete="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="mt-2 w-full cursor-text rounded-xl border border-black/12 bg-white px-4 py-3 text-[15px] leading-snug text-tle-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-black/35 focus:border-tle-pink focus:ring-[3px] focus:ring-tle-pink/12"
                            placeholder="+234 …"
                            required
                          />
                        </label>
                      </div>

                      <label className="block">
                        <span className="mb-1 block text-[11px] font-medium text-tle-ink">Street address *</span>
                        <input
                          type="text"
                          autoComplete="street-address"
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          className="mt-2 w-full cursor-text rounded-xl border border-black/12 bg-white px-4 py-3 text-[15px] leading-snug text-tle-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-black/35 focus:border-tle-pink focus:ring-[3px] focus:ring-tle-pink/12"
                          placeholder="House number, street, estate"
                          required
                        />
                      </label>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-medium text-tle-ink">City / town *</span>
                          <input
                            type="text"
                            autoComplete="address-level2"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="mt-2 w-full cursor-text rounded-xl border border-black/12 bg-white px-4 py-3 text-[15px] leading-snug text-tle-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-black/35 focus:border-tle-pink focus:ring-[3px] focus:ring-tle-pink/12"
                            placeholder="e.g. Ikeja"
                            required
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-medium text-tle-ink">State *</span>
                          <select
                            value={stateNg}
                            onChange={(e) => setStateNg(e.target.value)}
                            className="mt-2 w-full cursor-pointer rounded-xl border border-black/12 bg-white px-4 py-3 text-[15px] leading-snug text-tle-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-[border-color,box-shadow] focus:border-tle-pink focus:ring-[3px] focus:ring-tle-pink/12"
                            required
                          >
                            <option value="">Choose state</option>
                            {NIGERIAN_STATES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <p className="rounded-xl border border-black/[0.06] bg-white/80 px-3 py-2.5 text-[12px] text-tle-muted">
                        Country: <span className="font-semibold text-tle-ink">Nigeria</span>
                      </p>

                      {savedAddresses.length >= 3 ? (
                        <p className="text-[13px] text-tle-muted">Maximum of 3 addresses saved.</p>
                      ) : (
                        <button
                          type="button"
                          disabled={saveAddressBusy}
                          onClick={() => void savePermanentAddress()}
                          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-700 py-4 text-[13px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_8px_24px_rgba(4,120,87,0.28)] transition-[filter,transform] hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto sm:min-w-[240px] sm:rounded-full sm:px-10 sm:py-3.5"
                        >
                          <span className="material-symbols-outlined text-[22px]">save</span>
                          {saveAddressBusy ? 'Saving…' : 'Save permanent address'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!shippingComplete || !shopFees}
                  className="mt-10 w-full cursor-pointer rounded-full bg-tle-charcoal py-4 text-[12px] font-bold tracking-[0.12em] text-white uppercase shadow-[0_4px_14px_rgba(24,24,24,0.12)] transition-[background-color,transform] hover:bg-tle-pink active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55 lg:hidden"
                >
                  Continue to payment · {formatNaira(totalNgn)}
                </button>
              </>
            ) : (
              <div className="mt-2">
                <h2 className="font-sans text-lg font-semibold text-tle-ink">Transfer &amp; payment proof</h2>
                <p className="mt-1 text-xs text-tle-muted">
                  Complete your transfer, then upload a screenshot. Your order receipt is generated only after this step.
                </p>
                <div className="mt-6">
                  <BookingTransferDetailsCard details={BOOKING_TRANSFER_DEMO} className="mb-6" />
                  <BookingPaymentProofFields
                    context="checkout"
                    file={paymentProofFile}
                    onFileChange={setPaymentProofFile}
                    confirmed={paymentConfirmed}
                    onConfirmedChange={setPaymentConfirmed}
                  />
                  {paymentProofVerified ? (
                    <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                      Payment proof uploaded successfully. This order will be created as <strong>paid</strong>.
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    className="rounded-full border-[1.5px] border-black/10 px-8 py-3.5 text-[12px] font-semibold tracking-wide text-tle-muted uppercase hover:border-tle-ink hover:text-tle-ink"
                    onClick={() => {
                      setError(null)
                      setPhase('shipping')
                    }}
                  >
                    Back to delivery
                  </button>
                  <button
                    type="button"
                    disabled={!canPlaceOrder}
                    onClick={() => void confirmPaidOrder()}
                    className="rounded-full bg-tle-pink px-8 py-3.5 text-[12px] font-bold tracking-[0.12em] text-white uppercase transition-colors hover:bg-tle-deep disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? 'Placing order…' : `Place order · ${formatNaira(totalNgn)}`}
                  </button>
                </div>
              </div>
            )}
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
                <span>Processing & tax</span>
                <span className="font-medium text-tle-ink">{formatNaira(processingNgn + salesVatNgn)}</span>
              </div>
              <div className="flex justify-between border-t border-black/[0.08] pt-3 font-sans text-lg font-semibold text-tle-ink">
                <span>Total</span>
                <span>{formatNaira(totalNgn)}</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-tle-faint">
              {phase === 'shipping'
                ? 'Continue when ready.'
                : 'Upload your transfer screenshot, then place your order to get your receipt.'}
            </p>

            {phase === 'shipping' ? (
              <button
                type="submit"
                disabled={!shippingComplete || !shopFees}
                className="mt-6 hidden w-full cursor-pointer rounded-full bg-tle-charcoal py-[18px] text-xs font-bold tracking-wide text-white uppercase shadow-[0_4px_14px_rgba(24,24,24,0.12)] transition-colors hover:bg-tle-pink disabled:cursor-not-allowed disabled:opacity-55 lg:block"
              >
                Continue to payment · {formatNaira(totalNgn)}
              </button>
            ) : (
              <button
                type="button"
                disabled={!canPlaceOrder}
                onClick={() => void confirmPaidOrder()}
                className="mt-6 hidden w-full cursor-pointer rounded-full bg-tle-pink py-[18px] text-xs font-bold tracking-wide text-white uppercase transition-colors hover:bg-tle-deep disabled:cursor-not-allowed disabled:opacity-55 lg:block"
              >
                {busy ? 'Placing order…' : `Place order · ${formatNaira(totalNgn)}`}
              </button>
            )}
          </aside>
        </form>

      </div>
    </section>
  )
}
