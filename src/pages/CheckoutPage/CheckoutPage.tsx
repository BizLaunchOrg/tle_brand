import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cartLineKey } from '../../data/products.ts'
import { NIGERIAN_STATES } from '../../data/nigerianStates.ts'
import { useAuth } from '../../context/AuthContext'
import { useCartDrawer } from '../../context/CartDrawerContext.tsx'
import {
  CHECKOUT_DELIVERY_FEE_NGN,
  CHECKOUT_PROCESSING_PERCENT,
  computeCheckoutTotalNgn,
} from '../../lib/checkoutPricing.ts'
import { createOrder } from '../../lib/userShopSync.ts'

const formatNaira = (value: number) => `₦${value.toLocaleString()}`

const parsePrice = (price: string) => Number(price.replace(/[^\d]/g, '')) || 0

type OrderReceipt = {
  id: string
  subtotalNgn: number
  deliveryNgn: number
  processingNgn: number
  totalNgn: number
}

export function CheckoutPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
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

  const { deliveryNgn, processingNgn, totalNgn } = useMemo(
    () => computeCheckoutTotalNgn(cartSubtotal),
    [cartSubtotal],
  )

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
    return (
      <section className="min-h-0 flex-1 bg-tle-cream/60 px-4 pb-20 pt-28 sm:px-6 md:px-10 md:pt-32 lg:px-16">
        <div className="mx-auto w-full max-w-[520px] rounded-[28px] border border-black/8 bg-white p-8 text-center shadow-[0_10px_40px_rgba(0,0,0,0.04)] sm:p-10">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <span className="material-symbols-outlined text-[32px] leading-none">check_circle</span>
          </div>
          <h1 className="font-sans text-[clamp(1.5rem,4vw,2rem)] font-semibold text-tle-ink">Order received</h1>
          <p className="mt-3 text-sm leading-relaxed text-tle-muted">
            Thank you. We&apos;ll contact you at <span className="font-medium text-tle-ink">{email}</span> to confirm delivery.
          </p>

          <div className="mt-6 rounded-2xl border border-black/[0.08] bg-tle-cream/50 px-4 py-4 text-left text-sm">
            <div className="flex justify-between py-1 text-tle-muted">
              <span>Subtotal</span>
              <span className="font-medium text-tle-ink">{formatNaira(orderReceipt.subtotalNgn)}</span>
            </div>
            <div className="flex justify-between py-1 text-tle-muted">
              <span>Delivery (nationwide)</span>
              <span className="font-medium text-tle-ink">{formatNaira(orderReceipt.deliveryNgn)}</span>
            </div>
            <div className="flex justify-between py-1 text-tle-muted">
              <span>Processing ({CHECKOUT_PROCESSING_PERCENT}%)</span>
              <span className="font-medium text-tle-ink">{formatNaira(orderReceipt.processingNgn)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-black/[0.08] pt-3 font-sans text-base font-semibold text-tle-ink">
              <span>Total</span>
              <span>{formatNaira(orderReceipt.totalNgn)}</span>
            </div>
          </div>

          <p className="mt-4 text-xs text-tle-faint">Reference: {orderReceipt.id}</p>
          <button
            type="button"
            onClick={() => navigate('/shop', { replace: true })}
            className="mt-8 w-full rounded-full bg-tle-charcoal py-3.5 text-[12px] font-bold tracking-[0.12em] text-white uppercase transition-colors hover:bg-tle-pink"
          >
            Continue shopping
          </button>
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

    setBusy(true)
    try {
      const lineItems = cartItems.map((item) => ({
        slug: item.slug,
        variantId: item.variantId,
        variantLabel: item.variantLabel,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.img,
        category: item.cat,
        badge: item.badge,
      }))

      const subtotal = cartSubtotal
      const fees = computeCheckoutTotalNgn(subtotal)

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
        },
        lineItems,
        subtotalNgn: subtotal,
        deliveryNgn: fees.deliveryNgn,
        processingNgn: fees.processingNgn,
        totalNgn: fees.totalNgn,
      })

      if (!result.ok) {
        setError(result.message)
        return
      }

      setOrderReceipt({
        id: result.id,
        subtotalNgn: subtotal,
        deliveryNgn: fees.deliveryNgn,
        processingNgn: fees.processingNgn,
        totalNgn: fees.totalNgn,
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
          Flat delivery ₦{CHECKOUT_DELIVERY_FEE_NGN.toLocaleString()} nationwide plus {CHECKOUT_PROCESSING_PERCENT}% processing on your items. Total is calculated below.
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
              disabled={busy}
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
                const lineTotal = parsePrice(item.price) * item.quantity
                return (
                  <li key={lineKey} className="flex gap-3">
                    <img src={item.img} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
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
                <span>Delivery (flat)</span>
                <span className="font-medium text-tle-ink">{formatNaira(deliveryNgn)}</span>
              </div>
              <div className="flex justify-between text-tle-muted">
                <span>Processing ({CHECKOUT_PROCESSING_PERCENT}%)</span>
                <span className="font-medium text-tle-ink">{formatNaira(processingNgn)}</span>
              </div>
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
              disabled={busy}
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
