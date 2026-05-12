import { Link } from 'react-router-dom'
import { defaultVariantSelection, displayableImageUrl } from '../data/products.ts'
import { useCartDrawer } from '../context/CartDrawerContext.tsx'

export function FavoritesDrawer() {
  const { favoritesOpen, closeFavorites, favoriteItems, toggleFavorite, addToCart } = useCartDrawer()

  return (
    <>
      <div
        className={`fixed inset-0 z-[2000] bg-black/45 transition-opacity duration-300 ${favoritesOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={closeFavorites}
        role="presentation"
      />
      <aside
        className={`fixed top-0 right-0 z-[2001] flex h-full w-full max-w-[420px] flex-col bg-white p-8 shadow-2xl transition-transform duration-300 ease-out ${favoritesOpen ? 'translate-x-0' : 'translate-x-full'}`}
        aria-hidden={!favoritesOpen}
      >
        <div className="mb-8 flex items-center justify-between">
          <span className="font-sans text-[28px] font-semibold text-tle-ink">Your Favorites</span>
          <button
            type="button"
            className="flex size-[38px] items-center justify-center rounded-full border border-black/10 text-tle-muted transition-colors hover:bg-tle-blush hover:text-tle-pink"
            onClick={closeFavorites}
            aria-label="Close favorites"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {favoriteItems.length === 0 ? (
            <div className="rounded-2xl border border-black/8 bg-tle-cream/80 px-4 py-10 text-center">
              <p className="font-sans text-lg font-medium text-tle-ink">No favorites yet.</p>
              <p className="mt-2 text-sm text-tle-muted">Tap the heart icon on a product to save it here.</p>
            </div>
          ) : (
            favoriteItems.map((item) => (
              <div key={item.slug} className="flex gap-4 border-b border-black/[0.06] py-4">
                <Link to={`/product/${item.slug}`} onClick={closeFavorites} className="shrink-0">
                  <img src={displayableImageUrl(item.img)} alt={item.alt} className="size-[70px] h-[90px] rounded-xl object-cover" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/product/${item.slug}`}
                    onClick={closeFavorites}
                    className="font-sans text-lg font-medium text-tle-ink no-underline transition-colors hover:text-tle-pink"
                  >
                    {item.name}
                  </Link>
                  <div className="mb-2 text-[10.5px] tracking-wide text-tle-muted uppercase">
                    {item.cat}
                    {item.badge?.trim() ? ` · ${item.badge.trim()}` : ''}
                  </div>
                  <div className="font-sans text-base font-semibold text-tle-gold">{item.price}</div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full bg-tle-charcoal px-4 py-2 text-[10px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-tle-pink"
                      onClick={() => addToCart(item, defaultVariantSelection(item))}
                    >
                      Add to cart
                    </button>
                    <button
                      type="button"
                      className="text-[10px] font-semibold tracking-wide text-tle-muted uppercase transition-colors hover:text-tle-pink"
                      onClick={() => toggleFavorite(item)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  )
}
