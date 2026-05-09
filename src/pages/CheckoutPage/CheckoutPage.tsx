import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cartLineKey } from '../../data/products.ts'
import { useAuth } from '../../context/AuthContext'
import { useCartDrawer } from '../../context/CartDrawerContext.tsx'
import { createOrder } from '../../lib/userShopSync.ts'

const formatNaira = (value: number) => `₦${value.toLocaleString()}`

const parsePrice = (price: string) => Number(price.replace(/[^\d]/g, '')) || 0

export function CheckoutPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { cartItems, cartSubtotal, clearCart } = useCartDrawer()

  const [fullName, setFullName] = useState(() => user?.name ?? '')
  const [email, setEmail] = useState(() => user?.email ?? '')
  const [phone, setPhone] = useState('')
  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const [city, setCity] = useState('')
  const [stateRegion, setStateRegion] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('Nigeria')

  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [doneOrderId, setDoneOrderId] = useState<string | null>(null)

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

  if (doneOrderId) {
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
          <p className="mt-2 text-xs text-tle-faint">Reference: {doneOrderId}</p>
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
    if (!fullName.trim() || !email.trim() || !phone.trim() || !line1.trim() || !city.trim() || !stateRegion.trim()) {
      setError('Please fill in all required shipping fields.')
      return
    }

    setBusy(true)
    try {
      const lineItems = cartItems.map((item) => ({
        slug: item.slug,
        variantId: item.variantId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }))

      const result = await createOrder({
        userId: user.id,
        email: email.trim(),
        shipping: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          line1: line1.trim(),
          line2: line2.trim() || undefined,
          city: city.trim(),
          state: stateRegion.trim(),
          postalCode: postalCode.trim() || undefined,
          country: country.trim() || 'Nigeria',
        },
        lineItems,
        subtotalNgn: cartSubtotal,
      })

      if (!result.ok) {
        setError(result.message)
        return
      }

      clearCart()
      setDoneOrderId(result.id)
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
        <h1 className="font-sans text-[clamp(1.75rem,4vw,2.25rem)] font-semibold text-tle-ink">Shipping &amp; review</h1>
        <p className="mt-2 max-w-xl text-sm text-tle-muted">Enter where we should send your order. You can review items and total before placing it.</p>

        <form
          onSubmit={onSubmit}
          className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start"
        >
          <div className="rounded-[28px] border border-black/8 bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] sm:p-8">
            <h2 className="font-sans text-lg font-semibold text-tle-ink">Delivery details</h2>
            <p className="mt-1 text-xs text-tle-muted">Fields marked with * are required.</p>

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
                placeholder="Ada Lovelace"
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
                <span className="mb-2 block text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">Phone *</span>
                <input
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-2xl border-[1.5px] border-black/10 bg-white px-4 py-3 text-sm text-tle-ink outline-none transition-colors placeholder:text-tle-faint focus:border-tle-pink"
                  placeholder="+234 …"
                  required
                />
              </label>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">Address line 1 *</span>
              <input
                type="text"
                autoComplete="address-line1"
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                className="w-full rounded-2xl border-[1.5px] border-black/10 bg-white px-4 py-3 text-sm text-tle-ink outline-none transition-colors placeholder:text-tle-faint focus:border-tle-pink"
                placeholder="Street, building, suite"
                required
              />
            </label>

            <label className="mt-5 block">
              <span className="mb-2 block text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">Address line 2</span>
              <input
                type="text"
                autoComplete="address-line2"
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
                className="w-full rounded-2xl border-[1.5px] border-black/10 bg-white px-4 py-3 text-sm text-tle-ink outline-none transition-colors placeholder:text-tle-faint focus:border-tle-pink"
                placeholder="Apartment, landmark (optional)"
              />
            </label>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">City *</span>
                <input
                  type="text"
                  autoComplete="address-level2"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-2xl border-[1.5px] border-black/10 bg-white px-4 py-3 text-sm text-tle-ink outline-none transition-colors placeholder:text-tle-faint focus:border-tle-pink"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">State *</span>
                <input
                  type="text"
                  autoComplete="address-level1"
                  value={stateRegion}
                  onChange={(e) => setStateRegion(e.target.value)}
                  className="w-full rounded-2xl border-[1.5px] border-black/10 bg-white px-4 py-3 text-sm text-tle-ink outline-none transition-colors placeholder:text-tle-faint focus:border-tle-pink"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">Postal code</span>
                <input
                  type="text"
                  autoComplete="postal-code"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full rounded-2xl border-[1.5px] border-black/10 bg-white px-4 py-3 text-sm text-tle-ink outline-none transition-colors placeholder:text-tle-faint focus:border-tle-pink"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">Country</span>
                <input
                  type="text"
                  autoComplete="country-name"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-2xl border-[1.5px] border-black/10 bg-white px-4 py-3 text-sm text-tle-ink outline-none transition-colors placeholder:text-tle-faint focus:border-tle-pink"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="mt-8 w-full rounded-full bg-tle-charcoal py-3.5 text-[12px] font-bold tracking-[0.12em] text-white uppercase transition-colors hover:bg-tle-pink disabled:opacity-60 lg:hidden"
            >
              {busy ? 'Placing order…' : 'Place order'}
            </button>
          </div>

          <aside className="rounded-[28px] border border-black/8 bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] sm:p-8 lg:sticky lg:top-28">
            <h2 className="font-sans text-lg font-semibold text-tle-ink">Order summary</h2>
            <p className="mt-1 text-xs text-tle-muted">{cartItems.length} line{cartItems.length === 1 ? '' : 's'} · {formatNaira(cartSubtotal)}</p>

            <ul className="mt-6 max-h-[320px] space-y-4 overflow-y-auto border-t border-black/[0.06] pt-6">
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

            <div className="mt-6 flex items-center justify-between border-t border-black/[0.07] pt-6">
              <span className="text-[13px] text-tle-muted">Subtotal</span>
              <span className="font-sans text-2xl font-semibold text-tle-ink">{formatNaira(cartSubtotal)}</span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-tle-faint">Shipping and any taxes will be confirmed with you before payment is collected.</p>

            <button
              type="submit"
              disabled={busy}
              className="mt-6 hidden w-full rounded-full bg-tle-charcoal py-[18px] text-xs font-bold tracking-wide text-white uppercase transition-colors hover:bg-tle-pink disabled:opacity-60 lg:block"
            >
              {busy ? 'Placing order…' : 'Place order'}
            </button>
          </aside>
        </form>
      </div>
    </section>
  )
}
