import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ProductCard } from '../../components/ProductCard.tsx'
import { useCartDrawer } from '../../context/CartDrawerContext.tsx'
import { defaultVariantSelection, productMatchesGender, type ProductGender } from '../../data/products.ts'
import { useShopProducts } from '../../context/ShopProductsContext.tsx'

type TypeFilter = 'all' | ProductGender

const FILTER_TYPES: { label: string; value: TypeFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'For Her', value: 'her' },
  { label: 'For Him', value: 'him' },
  { label: 'Unisex', value: 'unisex' },
]

/** Twelve items = full rows for both 3-wide and 4-wide grids */
const SHOP_PAGE_SIZE = 12

export function ShopPage() {
  const products = useShopProducts()
  const [searchParams, setSearchParams] = useSearchParams()
  const { addToCart, toggleFavorite, isFavorite, hasProductInCart } = useCartDrawer()

  const [searchText, setSearchText] = useState(() => searchParams.get('q') || '')
  const q = searchText.trim().toLowerCase()
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [page, setPage] = useState(1)

  const categories = useMemo(() => {
    const all = new Set<string>()
    products.forEach((p) => all.add(p.cat))
    return ['all', ...Array.from(all)]
  }, [products])

  const visibleProducts = useMemo(() => {
    return products.filter((p) => {
      if (typeFilter !== 'all' && !productMatchesGender(p, typeFilter)) return false
      if (categoryFilter !== 'all' && p.cat !== categoryFilter) return false
      if (!q) return true
      const hay = `${p.name} ${p.cat} ${p.badge ?? ''} ${p.alt}`.toLowerCase()
      return hay.includes(q)
    })
  }, [categoryFilter, products, q, typeFilter])

  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / SHOP_PAGE_SIZE) || 1)
  const safePage = Math.min(page, totalPages)

  useEffect(() => {
    setPage(1)
  }, [q, typeFilter, categoryFilter])

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages))
  }, [totalPages])

  const pagedProducts = useMemo(
    () => visibleProducts.slice((safePage - 1) * SHOP_PAGE_SIZE, safePage * SHOP_PAGE_SIZE),
    [visibleProducts, safePage],
  )

  const pillCls = (on: boolean) =>
    `rounded-full border-[1.5px] px-4 py-2 font-sans text-[11px] font-semibold tracking-wide uppercase transition-all sm:px-5 ${
      on
        ? 'border-tle-charcoal bg-tle-charcoal text-white'
        : 'border-black/10 bg-white text-tle-muted hover:border-tle-charcoal hover:bg-tle-charcoal hover:text-white'
    }`

  return (
    <section className="min-h-0 flex-1 bg-tle-cream/60 px-4 pb-16 pt-28 sm:px-6 md:px-10 md:pt-32 lg:px-16">
      <div className="mx-auto w-full max-w-[1240px]">
        <div className="mb-8 rounded-[28px] border border-tle-pink/15 bg-white px-5 py-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] sm:px-8 sm:py-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="h-px w-[22px] bg-tle-gold" />
            <span className="text-[10px] font-semibold tracking-[0.22em] text-tle-gold uppercase">Shop</span>
          </div>
          <h1 className="font-sans text-[clamp(2rem,5vw,3rem)] leading-tight font-semibold text-tle-ink">
            All <em className="font-sans font-medium italic text-tle-pink">Products</em>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-tle-muted sm:text-[15px]">
            Explore the full collection by type and category. Clean, fast, and fully responsive.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-black/8 bg-white p-4 sm:p-5">
          <div className="mb-4">
            <p className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">Search</p>
            <div className="flex flex-wrap gap-2">
              <input
                type="search"
                placeholder="Search by name or category..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="min-w-[220px] flex-1 rounded-full border-[1.5px] border-black/10 bg-white px-4 py-2.5 text-sm text-tle-ink outline-none transition-colors placeholder:text-tle-faint focus:border-tle-pink"
              />
              <button
                type="button"
                className="rounded-full border border-tle-pink/30 bg-white px-4 py-2 text-[10px] font-semibold tracking-wide text-tle-pink uppercase transition-colors hover:bg-tle-pink hover:text-white"
                onClick={() => {
                  setSearchText('')
                  setSearchParams({}, { replace: true })
                }}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mb-4">
            <p className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">Type</p>
            <div className="flex flex-wrap gap-2">
              {FILTER_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={pillCls(typeFilter === type.value)}
                  onClick={() => setTypeFilter(type.value)}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">Category</p>
            <label className="relative block max-w-sm">
              <span className="sr-only">Select category</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full appearance-none rounded-xl border-[1.5px] border-black/10 bg-white px-4 py-3 pr-10 text-sm text-tle-ink outline-none transition-colors focus:border-tle-pink"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-tle-muted">
                <span className="material-symbols-outlined text-[20px] leading-none">expand_more</span>
              </span>
            </label>
          </div>

        </div>

        {visibleProducts.length === 0 ? (
          <div className="rounded-[20px] border border-black/8 bg-white px-6 py-14 text-center">
            <p className="font-sans text-lg font-medium text-tle-ink">No products match your filters.</p>
            {typeFilter === 'unisex' ? (
              <p className="mt-2 text-sm text-tle-muted">
                Nothing is listed under Unisex yet. You can still browse{' '}
                <strong className="font-semibold text-tle-ink">For Her</strong>,{' '}
                <strong className="font-semibold text-tle-ink">For Him</strong>, or all products together.
              </p>
            ) : (
              <p className="mt-2 text-sm text-tle-muted">Try another type/category or clear search.</p>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 md:gap-5 lg:grid-cols-4 lg:gap-6">
              {pagedProducts.map((product) => (
                <ProductCard
                  key={product.slug}
                  product={product}
                  onAddToCart={() => addToCart(product, defaultVariantSelection(product))}
                  inCart={hasProductInCart(product.slug)}
                  isFavorite={isFavorite(product.slug)}
                  onToggleFavorite={() => toggleFavorite(product)}
                />
              ))}
            </div>

            {visibleProducts.length > SHOP_PAGE_SIZE ? (
              <nav
                className="mt-10 flex flex-col items-center justify-center gap-4 border-t border-black/8 pt-8 sm:flex-row sm:gap-6"
                aria-label="Product pages"
              >
                <p className="text-center text-sm text-tle-muted">
                  Page <span className="font-semibold text-tle-ink">{safePage}</span> of{' '}
                  <span className="font-semibold text-tle-ink">{totalPages}</span>
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-full border border-black/10 bg-white px-5 py-2 text-[11px] font-semibold tracking-wide text-tle-ink uppercase transition-colors hover:border-tle-charcoal disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-full border border-tle-charcoal bg-tle-charcoal px-5 py-2 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-tle-pink disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </nav>
            ) : null}
          </>
        )}
      </div>
    </section>
  )
}
