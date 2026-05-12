import { Link } from 'react-router-dom'
import { cartLineKey, displayableImageUrl } from '../data/products.ts'
import { useCartDrawer } from '../context/CartDrawerContext.tsx'

const formatNaira = (value: number) => `₦${value.toLocaleString()}`

export function CartDrawer() {
  const { cartOpen, closeCart, cartItems, cartSubtotal, decrementCartItem, incrementCartItem, removeCartItem } =
    useCartDrawer()

  return (
    <>
      <div
        className={`fixed inset-0 z-[2000] bg-black/45 transition-opacity duration-300 ${cartOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={closeCart}
        role="presentation"
      />
      <aside
        className={`fixed top-0 right-0 z-[2001] flex h-full w-full max-w-[420px] flex-col bg-white p-8 shadow-2xl transition-transform duration-300 ease-out ${cartOpen ? 'translate-x-0' : 'translate-x-full'}`}
        aria-hidden={!cartOpen}
      >
        <div className="mb-8 flex items-center justify-between">
          <span className="font-sans text-[28px] font-semibold text-tle-ink">Your Cart</span>
          <button
            type="button"
            className="flex size-[38px] items-center justify-center rounded-full border border-black/10 text-tle-muted transition-colors hover:bg-tle-blush hover:text-tle-pink"
            onClick={closeCart}
            aria-label="Close cart"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {cartItems.length === 0 ? (
            <div className="rounded-2xl border border-black/8 bg-tle-cream/80 px-4 py-10 text-center">
              <p className="font-sans text-lg font-medium text-tle-ink">Your cart is empty.</p>
              <p className="mt-2 text-sm text-tle-muted">Add products from the shop to see them here.</p>
            </div>
          ) : (
            cartItems.map((item) => {
              const lineKey = cartLineKey(item.slug, item.variantId)
              return (
                <div key={lineKey} className="flex gap-4 border-b border-black/[0.06] py-4">
                  <Link to={`/product/${item.slug}`} onClick={closeCart} className="shrink-0">
                    <img src={displayableImageUrl(item.img)} alt={item.alt} className="size-[70px] h-[90px] rounded-xl object-cover" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/product/${item.slug}`}
                      onClick={closeCart}
                      className="font-sans text-lg font-medium text-tle-ink no-underline transition-colors hover:text-tle-pink"
                    >
                      {item.name}
                    </Link>
                    <div className="mb-1 text-[10.5px] tracking-wide text-tle-muted uppercase">
                      {item.cat}
                      {item.badge?.trim() ? ` · ${item.badge.trim()}` : ''}
                      {item.variantLabel ? ` · ${item.variantLabel}` : ''}
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        className="flex size-7 items-center justify-center rounded-full border border-black/10 text-sm transition-colors hover:border-tle-pink hover:text-tle-pink"
                        onClick={() => decrementCartItem(lineKey)}
                      >
                        −
                      </button>
                      <span className="min-w-4 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        type="button"
                        className="flex size-7 items-center justify-center rounded-full border border-black/10 text-sm transition-colors hover:border-tle-pink hover:text-tle-pink"
                        onClick={() => incrementCartItem(lineKey)}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="ml-1 text-[11px] font-semibold tracking-wide text-tle-muted uppercase transition-colors hover:text-tle-pink"
                        onClick={() => removeCartItem(lineKey)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="shrink-0 self-center font-sans text-xl font-semibold text-tle-gold">{item.price}</div>
                </div>
              )
            })
          )}
        </div>
        <div className="border-t border-black/[0.07] pt-6">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-[13px] text-tle-muted">Subtotal</span>
            <span className="font-sans text-[26px] font-semibold text-tle-ink">{formatNaira(cartSubtotal)}</span>
          </div>
          <Link
            to="/checkout"
            onClick={closeCart}
            className="mb-3 flex w-full items-center justify-center rounded-full bg-tle-charcoal py-[18px] font-sans text-xs font-bold tracking-wide text-white uppercase no-underline transition-colors hover:bg-tle-pink"
          >
            Proceed to Checkout
          </Link>
          <button
            type="button"
            className="w-full rounded-full border-[1.5px] border-black/10 py-[15px] font-sans text-xs font-semibold tracking-wide text-tle-muted uppercase transition-colors hover:border-tle-ink hover:text-tle-ink"
            onClick={closeCart}
          >
            Continue Shopping
          </button>
        </div>
      </aside>
    </>
  )
}
