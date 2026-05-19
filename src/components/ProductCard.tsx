import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  displayableImageUrl,
  formatProductPriceLabel,
  getDefaultImageUrls,
  isProductOutOfStock,
  productSalePill,
  type Product,
} from '../data/products.ts'

/** Screenshot-matched palette */
const NAVY = '#1A233A'
const ORANGE = '#FF7A20'

export type ProductCardProps = {
  product: Product
  onAddToCart?: () => void
  inCart?: boolean
  isFavorite?: boolean
  onToggleFavorite?: () => void
  className?: string
}

export function ProductCard({
  product,
  onAddToCart,
  inCart = false,
  isFavorite = false,
  onToggleFavorite,
  className = '',
}: ProductCardProps) {
  const { slug, alt, name, cat, price } = product
  const saleLabel = productSalePill(product)
  const outOfStock = isProductOutOfStock(product)
  const previews = getDefaultImageUrls(product).map(displayableImageUrl)
  const [activeThumb, setActiveThumb] = useState(0)
  const displayImg = previews[activeThumb] ?? displayableImageUrl(product.img)
  const showThumbRow = previews.length > 1
  const thumbSlots = previews.slice(0, 4)
  const moreCount = Math.max(0, previews.length - thumbSlots.length)

  return (
    <article
      className={`flex h-full flex-col rounded-[16px] border border-zinc-200 bg-white p-3 shadow-sm sm:rounded-[20px] sm:p-5 ${className}`.trim()}
    >
      {/* Navy image well */}
      <Link
        to={`/product/${slug}`}
        className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl sm:aspect-[1/1] sm:rounded-2xl"
        style={{ backgroundColor: NAVY }}
      >
        {displayImg ? (
          <img
            src={displayImg}
            alt={alt}
            className="max-h-[84%] max-w-[84%] object-contain object-center drop-shadow-[0_10px_24px_rgba(0,0,0,0.3)] sm:max-h-[88%] sm:max-w-[88%] sm:drop-shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="px-3 text-center text-[11px] font-semibold text-white/70">No photo</span>
        )}
        {saleLabel ? (
          <span
            className="absolute top-2.5 left-2.5 rounded-md px-2 py-0.5 text-[8px] font-bold tracking-wide text-white uppercase sm:top-3.5 sm:left-3.5 sm:px-2.5 sm:py-1 sm:text-[10px]"
            style={{ backgroundColor: ORANGE }}
          >
            {saleLabel}
          </span>
        ) : null}
        {outOfStock ? (
          <span className="absolute right-2.5 bottom-2.5 rounded-md border border-white/25 bg-black/55 px-2 py-0.5 text-[8px] font-bold tracking-wide text-white uppercase backdrop-blur-sm sm:right-3.5 sm:bottom-3.5 sm:px-2.5 sm:py-1 sm:text-[10px]">
            Sold out
          </span>
        ) : null}
      </Link>

      {showThumbRow ? (
        <div className="mt-2.5 flex items-center gap-1.5 sm:mt-3.5 sm:gap-2.5">
          {thumbSlots.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActiveThumb(i)}
              className="relative shrink-0 overflow-hidden rounded-lg border-2 bg-zinc-100 transition-colors"
              style={{
                borderColor: activeThumb === i ? ORANGE : 'transparent',
              }}
              aria-label={`Preview ${i + 1}`}
            >
              <img src={url} alt="" className="size-8 object-cover sm:size-10" />
            </button>
          ))}
          {moreCount > 0 ? (
            <span className="shrink-0 pl-0.5 text-[11px] font-semibold sm:text-[13px]" style={{ color: ORANGE }}>
              +{moreCount}
            </span>
          ) : null}
        </div>
      ) : null}

      <Link to={`/product/${slug}`} className="group mt-2.5 block text-left no-underline sm:mt-3.5">
        <p className="text-[9px] font-medium tracking-[0.12em] text-zinc-400 uppercase sm:text-[11px]">
          {cat.replace(/\s+/g, ' ').toUpperCase()}
        </p>

        <h3 className="mt-1 line-clamp-2 min-h-[2.4em] font-sans text-[13px] font-bold leading-snug text-zinc-900 group-hover:text-zinc-700 sm:min-h-0 sm:text-base">
          {name}
        </h3>

        <p className="mt-1 font-sans text-base font-bold tabular-nums text-emerald-700 sm:text-xl">{formatProductPriceLabel(price)}</p>
      </Link>

      <div className="mt-3.5 flex items-stretch gap-2 sm:mt-5">
        {outOfStock ? (
          <button
            type="button"
            disabled
            aria-disabled
            className="flex min-h-[40px] flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-[10px] border border-zinc-200 bg-zinc-100 px-2 text-[9px] font-bold tracking-[0.1em] text-zinc-500 uppercase sm:min-h-[48px] sm:gap-2 sm:px-3 sm:text-[11px]"
          >
            <span className="material-symbols-outlined text-[16px] leading-none opacity-60 sm:text-[20px]">block</span>
            Sold out
          </button>
        ) : (
          <button
            type="button"
            className={`flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-[10px] px-2 text-[9px] font-bold tracking-[0.1em] text-white uppercase transition-colors sm:min-h-[48px] sm:gap-2 sm:px-3 sm:text-[11px] ${
              inCart ? 'bg-emerald-600 hover:bg-emerald-700' : 'hover:opacity-95'
            }`}
            style={inCart ? undefined : { backgroundColor: NAVY }}
            onClick={(e) => {
              e.preventDefault()
              onAddToCart?.()
            }}
          >
            <span className="material-symbols-outlined text-[16px] leading-none sm:text-[20px]">shopping_bag</span>
            {inCart ? 'IN CART' : 'ADD TO CART'}
          </button>
        )}
        <button
          type="button"
          className={`flex size-10 shrink-0 items-center justify-center rounded-[10px] border transition-colors sm:size-12 ${
            isFavorite ? 'border-red-200 bg-red-50' : 'border-zinc-200 bg-white hover:border-zinc-300'
          }`}
          aria-label={isFavorite ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={isFavorite}
          onClick={(e) => {
            e.preventDefault()
            onToggleFavorite?.()
          }}
        >
          <span
            className={`material-symbols-outlined text-[22px] leading-none sm:text-2xl ${
              isFavorite ? 'material-symbols-filled' : ''
            }`}
            style={{ color: isFavorite ? '#DC2626' : ORANGE }}
          >
            favorite
          </span>
        </button>
      </div>
    </article>
  )
}
