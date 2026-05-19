import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCartDrawer } from '../../context/CartDrawerContext.tsx'
import {
  cartLineKey,
  getDisplayPrice,
  getGalleryUrls,
  getProductPurchasableMaxUnits,
  isProductOutOfStock,
  parseProductPriceNgn,
  productDescriptionPlainText,
  productSalePill,
} from '../../data/products.ts'
import { useShopProducts } from '../../context/ShopProductsContext.tsx'

const NAVY = '#1A233A'
const ORANGE = '#FF7A20'

export function ProductDetailPage() {
  const products = useShopProducts()
  const { slug } = useParams<{ slug: string }>()
  const product = useMemo(() => products.find((p) => p.slug === slug), [products, slug])
  const { addToCart, toggleFavorite, isFavorite, isLineInCart, lineQuantityInCart } = useCartDrawer()

  const [pickedColorId, setPickedColorId] = useState<string | null>(null)
  const [activeImageIdx, setActiveImageIdx] = useState(0)

  useEffect(() => {
    setPickedColorId(null)
    setActiveImageIdx(0)
  }, [product?.slug])

  const colorId = useMemo(() => {
    if (!product?.colorOptions?.length) return undefined
    return pickedColorId ?? product.colorOptions[0].id
  }, [product, pickedColorId])

  const images = useMemo(() => (product ? getGalleryUrls(product, colorId) : []), [product, colorId])
  const displayPrice = product ? getDisplayPrice(product, colorId) : ''
  const activeSrc = images[activeImageIdx] ?? product?.img ?? ''
  const activeAlt =
    product && colorId
      ? `${product.alt} — ${product.colorOptions?.find((c) => c.id === colorId)?.label ?? ''}`
      : (product?.alt ?? '')

  useEffect(() => {
    setActiveImageIdx(0)
  }, [colorId])

  useEffect(() => {
    if (activeImageIdx >= images.length) setActiveImageIdx(0)
  }, [activeImageIdx, images.length])

  const related = useMemo(() => {
    if (!product) return []
    return products.filter((p) => p.slug !== product.slug && p.cat === product.cat).slice(0, 4)
  }, [product, products])

  const descriptionPlain = useMemo(
    () => (product ? productDescriptionPlainText(product.description) : ''),
    [product],
  )

  const saleLabel = product ? productSalePill(product) : ''
  const displayN = useMemo(() => parseProductPriceNgn(displayPrice), [displayPrice])
  const compareN = product ? parseProductPriceNgn(product.compareAt) : 0
  const showCompareAt = Boolean(saleLabel && product?.compareAt?.trim() && compareN > displayN && displayN > 0)

  const selectedVariant =
    product && colorId ? product.colorOptions?.find((c) => c.id === colorId) : undefined
  const lineKey = product ? cartLineKey(product.slug, colorId) : ''
  const inCart = product ? isLineInCart(lineKey) : false
  const favorite = product ? isFavorite(product.slug) : false

  const goPrevImage = () => {
    if (images.length < 2) return
    setActiveImageIdx((i) => (i <= 0 ? images.length - 1 : i - 1))
  }

  const goNextImage = () => {
    if (images.length < 2) return
    setActiveImageIdx((i) => (i >= images.length - 1 ? 0 : i + 1))
  }

  if (!product) {
    return (
      <section className="min-h-0 flex-1 bg-tle-cream/60 px-4 pb-24 pt-28 sm:px-6 md:px-10 md:pt-32 lg:px-16">
        <div className="mx-auto max-w-xl rounded-[28px] border border-black/8 bg-white px-8 py-16 text-center shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
          <h1 className="font-sans text-2xl font-semibold text-tle-ink">Product not found</h1>
          <p className="mt-3 text-sm text-tle-muted">This item may have moved. Browse the shop to keep exploring.</p>
          <Link
            to="/shop"
            className="mt-8 inline-flex items-center gap-2 rounded-full border border-tle-charcoal bg-tle-charcoal px-8 py-3 text-[11px] font-semibold tracking-wide text-white uppercase no-underline transition-colors hover:border-tle-pink hover:bg-tle-pink"
          >
            Go to shop
            <span className="material-symbols-outlined text-[18px] leading-none">arrow_forward</span>
          </Link>
        </div>
      </section>
    )
  }

  const addVariant =
    product.colorOptions?.length && colorId && selectedVariant
      ? { id: colorId, label: selectedVariant.label }
      : undefined

  const outOfStock = isProductOutOfStock(product)
  const maxUnits = getProductPurchasableMaxUnits(product)
  const lineQty = lineQuantityInCart(lineKey)
  const atCartMax = maxUnits < 999 && lineQty >= maxUnits
  const addDisabled = outOfStock || atCartMax
  const addButtonLabel = outOfStock ? 'Sold out' : atCartMax ? 'Maximum in cart' : inCart ? 'Added — add another' : 'Add to cart'

  return (
    <section className="min-h-0 flex-1 bg-tle-cream/60 px-4 pb-20 pt-28 sm:px-6 md:px-10 md:pt-32 lg:px-16">
      <div className="mx-auto w-full max-w-[1240px]">
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-[12px] text-tle-muted" aria-label="Breadcrumb">
          <Link to="/" className="transition-colors hover:text-tle-pink">
            Home
          </Link>
          <span className="text-tle-faint" aria-hidden>
            /
          </span>
          <Link to="/shop" className="transition-colors hover:text-tle-pink">
            Shop
          </Link>
          <span className="text-tle-faint" aria-hidden>
            /
          </span>
          <span className="font-medium text-tle-ink">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
          <div className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
            <div
              className="relative flex aspect-[4/5] max-h-[560px] items-center justify-center overflow-hidden rounded-[28px] sm:aspect-square"
              style={{ backgroundColor: NAVY }}
            >
              <img
                src={activeSrc}
                alt={activeAlt}
                className="max-h-[88%] max-w-[88%] object-contain object-center drop-shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
                loading="eager"
                decoding="async"
              />
              {images.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={goPrevImage}
                    className="absolute top-1/2 left-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/50 sm:left-4"
                    aria-label="Previous image"
                  >
                    <span className="material-symbols-outlined text-[22px] leading-none">chevron_left</span>
                  </button>
                  <button
                    type="button"
                    onClick={goNextImage}
                    className="absolute top-1/2 right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/50 sm:right-4"
                    aria-label="Next image"
                  >
                    <span className="material-symbols-outlined text-[22px] leading-none">chevron_right</span>
                  </button>
                  <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/40 px-3 py-2 backdrop-blur-sm">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`Show image ${i + 1}`}
                        aria-current={i === activeImageIdx}
                        onClick={() => setActiveImageIdx(i)}
                        className={`size-2 rounded-full transition-all ${i === activeImageIdx ? 'scale-110 bg-white' : 'bg-white/45 hover:bg-white/70'}`}
                      />
                    ))}
                  </div>
                </>
              ) : null}
              {saleLabel ? (
                <span
                  className="pointer-events-none absolute top-4 left-4 rounded-lg px-3 py-1 text-[10px] font-bold tracking-wide text-white uppercase sm:top-5 sm:left-5 sm:text-[11px]"
                  style={{ backgroundColor: ORANGE }}
                >
                  {saleLabel}
                </span>
              ) : null}
              {outOfStock ? (
                <span className="pointer-events-none absolute bottom-4 left-4 rounded-lg border border-white/25 bg-black/55 px-3 py-1 text-[10px] font-bold tracking-wide text-white uppercase backdrop-blur-sm sm:text-[11px]">
                  Sold out
                </span>
              ) : null}
              {product.badge?.trim() ? (
                <span className="pointer-events-none absolute top-4 right-4 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold tracking-wide text-white uppercase backdrop-blur-sm sm:text-[11px]">
                  {product.badge.trim()}
                </span>
              ) : null}
            </div>

            {images.length > 1 ? (
              <div
                className="flex gap-2 overflow-x-auto pb-1 lg:max-w-full [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-tle-pink/40"
                role="tablist"
                aria-label="Product gallery thumbnails"
              >
                {images.map((url, i) => (
                  <button
                    key={`${url}-${i}`}
                    type="button"
                    role="tab"
                    aria-selected={i === activeImageIdx}
                    onClick={() => setActiveImageIdx(i)}
                    className={`relative shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                      i === activeImageIdx ? 'border-tle-pink ring-2 ring-tle-pink/25' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: NAVY }}
                  >
                    <img src={url} alt="" className="size-[72px] object-contain object-center p-2 sm:size-20" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="h-px w-[22px] bg-tle-gold" />
              <span className="text-[10px] font-semibold tracking-[0.22em] text-tle-gold uppercase">
                {product.cat.replace(/\s+/g, ' ')}
              </span>
            </div>

            <h1 className="font-sans text-[clamp(1.85rem,4.5vw,2.75rem)] font-semibold leading-tight text-tle-ink">
              {product.name}
            </h1>

            <p className="mt-4 flex flex-col gap-1">
              {showCompareAt ? (
                <span className="font-sans text-lg font-semibold tabular-nums text-tle-muted line-through decoration-tle-muted/80">
                  {product.compareAt}
                </span>
              ) : null}
              <span className="font-sans text-[clamp(1.5rem,3vw,2rem)] font-bold tabular-nums text-emerald-700">{displayPrice}</span>
            </p>

            {product.tags && product.tags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {product.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-black/10 bg-white px-3 py-1 text-[10px] font-semibold tracking-wide text-tle-muted uppercase"
                  >
                    {t.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            ) : null}

            {product.colorOptions && product.colorOptions.length > 0 ? (
              <div className="mt-8">
                <p className="mb-3 text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">Options</p>
                <div className="flex flex-wrap gap-3">
                  {product.colorOptions.map((opt) => {
                    const selected = colorId === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPickedColorId(opt.id)}
                        aria-pressed={selected}
                        className={`flex items-center gap-2.5 rounded-full border px-3 py-2 text-left text-sm font-medium transition-all ${
                          selected
                            ? 'border-tle-charcoal bg-tle-blush text-tle-ink shadow-sm'
                            : 'border-black/10 bg-white text-tle-ink hover:border-tle-pink/40'
                        }`}
                      >
                        <span
                          className="size-7 shrink-0 rounded-full border border-black/10 shadow-inner"
                          style={{ backgroundColor: opt.swatch }}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">{opt.label}</span>
                        {opt.price ? (
                          <span className="shrink-0 font-bold tabular-nums text-emerald-700">{opt.price}</span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {descriptionPlain ? (
              <div className="mt-8 max-w-xl space-y-3">
                <p className="text-[10px] font-semibold tracking-[0.18em] text-neutral-900 uppercase">
                  Product description
                </p>
                <p className="whitespace-pre-line text-[15px] leading-[1.75] text-neutral-900">{descriptionPlain}</p>
              </div>
            ) : null}

            <div className="mt-10 flex flex-col gap-3">
              {outOfStock ? (
                <p className="text-[13px] font-medium text-tle-muted">Sold out</p>
              ) : null}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <button
                type="button"
                disabled={addDisabled}
                aria-disabled={addDisabled}
                className={`flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-[14px] px-6 text-[12px] font-bold tracking-[0.12em] uppercase transition-colors sm:max-w-[280px] ${
                  addDisabled
                    ? 'cursor-not-allowed border border-black/10 bg-zinc-100 text-zinc-500'
                    : inCart
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'text-white hover:opacity-95'
                }`}
                style={addDisabled || inCart ? undefined : { backgroundColor: NAVY }}
                onClick={() => {
                  if (addDisabled) return
                  addToCart(product, addVariant)
                }}
              >
                <span className="material-symbols-outlined text-[22px] leading-none">
                  {outOfStock ? 'block' : 'shopping_bag'}
                </span>
                {addButtonLabel}
              </button>
              <button
                type="button"
                className={`flex min-h-[52px] items-center justify-center gap-2 rounded-[14px] border-[1.5px] px-6 text-[12px] font-bold tracking-[0.12em] uppercase transition-colors ${
                  favorite
                    ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                    : 'border-black/10 bg-white text-tle-ink hover:border-tle-pink hover:text-tle-pink'
                }`}
                aria-pressed={favorite}
                onClick={() => toggleFavorite(product)}
              >
                <span
                  className={`material-symbols-outlined text-[22px] leading-none ${favorite ? 'material-symbols-filled' : ''}`}
                  style={{ color: favorite ? '#DC2626' : ORANGE }}
                >
                  favorite
                </span>
                {favorite ? 'Saved' : 'Wishlist'}
              </button>
              </div>
            </div>

            <Link
              to="/shop"
              className="mt-10 inline-flex items-center gap-2 text-[13px] font-semibold text-tle-pink no-underline transition-colors hover:text-tle-deep"
            >
              <span className="material-symbols-outlined text-[20px] leading-none">arrow_back</span>
              Back to all products
            </Link>
          </div>
        </div>

        {related.length > 0 ? (
          <div className="mt-20 border-t border-black/8 pt-14">
            <h2 className="font-sans text-xl font-semibold text-tle-ink sm:text-2xl">More in {product.cat}</h2>
            <p className="mt-2 text-sm text-tle-muted">Customers who viewed this also browsed these.</p>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  to={`/product/${p.slug}`}
                  className="group overflow-hidden rounded-2xl border border-black/8 bg-white no-underline shadow-sm transition-all hover:-translate-y-0.5 hover:border-tle-pink/25 hover:shadow-md"
                >
                  <div className="aspect-square overflow-hidden" style={{ backgroundColor: NAVY }}>
                    <img
                      src={p.img}
                      alt={p.alt}
                      className="size-full object-contain object-center p-4 transition-transform duration-300 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4">
                    <p className="line-clamp-2 font-sans text-sm font-semibold text-tle-ink group-hover:text-tle-pink">
                      {p.name}
                    </p>
                    <p className="mt-1 font-sans text-sm font-bold tabular-nums text-emerald-700">{p.price}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
