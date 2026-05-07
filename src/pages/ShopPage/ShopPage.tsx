import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ProductCard } from '../../components/ProductCard.tsx'
import { useCartDrawer } from '../../context/CartDrawerContext.tsx'
import { PRODUCTS, type ProductGender } from '../../data/products.ts'

type TypeFilter = 'all' | ProductGender

const FILTER_TYPES: { label: string; value: TypeFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'For Her', value: 'her' },
  { label: 'For Him', value: 'him' },
]

export function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { addToCart, toggleFavorite, isFavorite, isInCart } = useCartDrawer()

  const q = (searchParams.get('q') || '').trim().toLowerCase()
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const categories = useMemo(() => {
    const all = new Set<string>()
    PRODUCTS.forEach((p) => all.add(p.cat))
    return ['all', ...Array.from(all)]
  }, [])

  const visibleProducts = useMemo(() => {
    return PRODUCTS.filter((p) => {
      if (typeFilter !== 'all' && p.gender !== typeFilter) return false
      if (categoryFilter !== 'all' && p.cat !== categoryFilter) return false
      if (!q) return true
      const hay = `${p.name} ${p.cat} ${p.badge} ${p.alt}`.toLowerCase()
      return hay.includes(q)
    })
  }, [categoryFilter, q, typeFilter])

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
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={pillCls(categoryFilter === cat)}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat === 'all' ? 'All Categories' : cat}
                </button>
              ))}
            </div>
          </div>

          {q ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-tle-pink/15 bg-tle-blush/40 px-3 py-2.5 text-[12px] text-tle-ink">
              <span>
                Search: <strong className="text-tle-pink">&ldquo;{searchParams.get('q')}&rdquo;</strong>
              </span>
              <button
                type="button"
                className="rounded-full border border-tle-pink/30 bg-white px-3 py-1 text-[10px] font-semibold tracking-wide text-tle-pink uppercase transition-colors hover:bg-tle-pink hover:text-white"
                onClick={() => setSearchParams({}, { replace: true })}
              >
                Clear search
              </button>
            </div>
          ) : null}
        </div>

        {visibleProducts.length === 0 ? (
          <div className="rounded-[20px] border border-black/8 bg-white px-6 py-14 text-center">
            <p className="font-sans text-lg font-medium text-tle-ink">No products match your filters.</p>
            <p className="mt-2 text-sm text-tle-muted">Try another type/category or clear search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.name}
                product={product}
                onAddToCart={() => addToCart(product)}
                inCart={isInCart(product.name)}
                isFavorite={isFavorite(product.name)}
                onToggleFavorite={() => toggleFavorite(product)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
