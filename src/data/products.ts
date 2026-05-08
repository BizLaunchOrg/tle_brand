export type ProductGender = 'her' | 'him'

/** Finish / shade / color — drives gallery + optional price on the detail page */
export type ProductColorOption = {
  id: string
  label: string
  /** Swatch fill (hex or CSS color) */
  swatch: string
  /** Photos for this option; falls back to product default images when omitted */
  images?: string[]
  price?: string
}

export type Product = {
  /** URL segment for /product/:slug */
  slug: string
  gender: ProductGender
  /** Primary photo (cards, cart default) */
  img: string
  alt: string
  badge: string
  /** Shown in orange promo pill (e.g. 10% OFF) */
  promo?: string
  name: string
  cat: string
  price: string
  /** Extra angles / lifestyle shots (detail gallery); first hero is always `img` */
  gallery?: string[]
  /** When set, buyer picks a finish; each option can have its own photos & price */
  colorOptions?: ProductColorOption[]
  /** Longer story for the product detail page */
  description: string
}

/** Unique cart line: same slug + different color = separate rows */
export function cartLineKey(slug: string, variantId?: string): string {
  return `${slug}::${variantId ?? 'default'}`
}

/** Image URLs for PDP / card previews when no color is selected */
export function getDefaultImageUrls(product: Product): string[] {
  const urls = [product.img, ...(product.gallery ?? [])]
  return urls.filter((u, i) => u && urls.indexOf(u) === i)
}

export function getActiveColorOption(product: Product, colorId: string | undefined): ProductColorOption | undefined {
  if (!product.colorOptions?.length || !colorId) return undefined
  return product.colorOptions.find((c) => c.id === colorId)
}

/** Full gallery for current color (or default) */
export function getGalleryUrls(product: Product, colorId?: string): string[] {
  const opt = getActiveColorOption(product, colorId)
  if (opt?.images?.length) return opt.images.filter((u, i, a) => a.indexOf(u) === i)
  return getDefaultImageUrls(product)
}

export function getDisplayPrice(product: Product, colorId?: string): string {
  const opt = getActiveColorOption(product, colorId)
  return opt?.price ?? product.price
}

/** First color/finish when quick-adding from grids (shop / landing cards) */
export function defaultVariantSelection(product: Product): { id: string; label: string } | undefined {
  const o = product.colorOptions?.[0]
  if (!o) return undefined
  return { id: o.id, label: o.label }
}

export const PRODUCTS: Product[] = [
  {
    slug: 'radiance-glow-serum',
    gender: 'her',
    img: '/product1.jpeg',
    alt: 'Glow Serum',
    badge: 'For Her',
    promo: '10% OFF',
    name: 'Radiance Glow Serum',
    cat: 'Skincare',
    price: '₦18,500',
    gallery: ['/product2.jpeg', '/product6.jpeg'],
    colorOptions: [
      {
        id: 'amber-glass',
        label: 'Amber glass',
        swatch: '#c4a574',
        images: ['/product1.jpeg', '/product2.jpeg', '/product6.jpeg'],
      },
      {
        id: 'frosted',
        label: 'Frosted',
        swatch: '#e8e4df',
        images: ['/product2.jpeg', '/product1.jpeg', '/product4.jpeg'],
        price: '₦19,200',
      },
    ],
    description:
      'A lightweight, fast-absorbing serum designed to brighten dull skin and support a smooth, even-looking complexion. Use morning or night under moisturizer for a lit-from-within finish.',
  },
  {
    slug: 'hydra-mist-face-spray',
    gender: 'her',
    img: '/product2.jpeg',
    alt: 'Hydra Mist',
    badge: 'For Her',
    promo: '10% OFF',
    name: 'Hydra-Mist Face Spray',
    cat: 'Mist & Toner',
    price: '₦12,000',
    gallery: ['/product1.jpeg', '/product5.jpeg'],
    description:
      'A fine facial mist you can reach for anytime skin feels tight or tired. Mist over bare skin or on top of makeup for a fresh, dewy refresh without disturbing your look.',
  },
  {
    slug: 'pro-grooming-essentials',
    gender: 'him',
    img: '/product3.jpeg',
    alt: 'Grooming Kit',
    badge: 'For Him',
    promo: '10% OFF',
    name: 'Pro Grooming Essentials',
    cat: "Men's Care",
    price: '₦32,000',
    gallery: ['/product5.jpeg', '/product8.jpeg'],
    colorOptions: [
      { id: 'graphite', label: 'Graphite case', swatch: '#3d4556', images: ['/product3.jpeg', '/product5.jpeg'] },
      { id: 'sand', label: 'Sand case', swatch: '#c9b8a4', images: ['/product8.jpeg', '/product3.jpeg'] },
    ],
    description:
      'Curated staples for a clean, confident routine—everything you need to cleanse, hydrate, and polish your look without a dozen bottles on the shelf.',
  },
  {
    slug: 'velvet-lip-tint-set',
    gender: 'her',
    img: '/product4.jpeg',
    alt: 'Lip tint',
    badge: 'For Her',
    promo: '10% OFF',
    name: 'Velvet Lip Tint Set',
    cat: 'Makeup',
    price: '₦15,500',
    gallery: ['/product8.jpeg', '/product1.jpeg'],
    colorOptions: [
      {
        id: 'rose-milk',
        label: 'Rose milk',
        swatch: '#d4a5a5',
        images: ['/product4.jpeg', '/product8.jpeg', '/product1.jpeg'],
      },
      {
        id: 'terracotta',
        label: 'Terracotta',
        swatch: '#b85c4a',
        images: ['/product8.jpeg', '/product4.jpeg', '/product2.jpeg'],
        price: '₦15,500',
      },
      {
        id: 'plum',
        label: 'Plum',
        swatch: '#6b3d5c',
        images: ['/product2.jpeg', '/product4.jpeg', '/product6.jpeg'],
        price: '₦16,000',
      },
    ],
    description:
      'Soft matte tints with a velvety feel and buildable color. Mix and match shades for an ombré lip or wear one shade full strength for a bold statement.',
  },
  {
    slug: 'daily-purifying-face-wash',
    gender: 'him',
    img: '/product5.jpeg',
    alt: 'Face wash',
    badge: 'For Him',
    promo: '12% OFF',
    name: 'Daily Purifying Face Wash',
    cat: 'Skincare',
    price: '₦10,500',
    gallery: ['/product3.jpeg', '/product1.jpeg'],
    description:
      'A daily cleanser that lifts excess oil and buildup while leaving skin feeling balanced—not stripped. Ideal as the first step in a simple skincare routine.',
  },
  {
    slug: 'silk-nourish-body-lotion',
    gender: 'her',
    img: '/product6.jpeg',
    alt: 'Body lotion',
    badge: 'For Her',
    promo: '8% OFF',
    name: 'Silk Nourish Body Lotion',
    cat: 'Body Care',
    price: '₦14,000',
    gallery: ['/product2.jpeg', '/product4.jpeg'],
    colorOptions: [
      { id: 'original', label: 'Original', swatch: '#f5e6dc' },
      { id: 'shea-vanilla', label: 'Shea vanilla', swatch: '#e8d4b8', price: '₦14,500' },
    ],
    description:
      'Silky body lotion that melts in quickly and leaves skin touchably soft. Subtle, clean scent that won’t compete with your perfume.',
  },
  {
    slug: 'noir-signature-fragrance',
    gender: 'him',
    img: 'https://images.unsplash.com/photo-1614859324967-bef9e3e5a9f4?w=600&h=800&fit=crop',
    alt: 'Fragrance',
    badge: 'For Him',
    promo: '15% OFF',
    name: 'Noir Signature Fragrance',
    cat: 'Perfume',
    price: '₦28,000',
    gallery: [
      'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&h=800&fit=crop',
      '/product5.jpeg',
    ],
    colorOptions: [
      {
        id: 'noir-50',
        label: '50 ml',
        swatch: '#1a1a1a',
        images: [
          'https://images.unsplash.com/photo-1614859324967-bef9e3e5a9f4?w=600&h=800&fit=crop',
          'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&h=800&fit=crop',
        ],
        price: '₦28,000',
      },
      {
        id: 'noir-100',
        label: '100 ml',
        swatch: '#2c2416',
        images: [
          'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&h=800&fit=crop',
          '/product5.jpeg',
        ],
        price: '₦42,000',
      },
    ],
    description:
      'A confident, modern scent with depth and staying power. Spray on pulse points for an impression that lingers from day to evening.',
  },
  {
    slug: 'studio-blend-makeup-palette',
    gender: 'her',
    img: '/product8.jpeg',
    alt: 'Makeup palette',
    badge: 'For Her',
    promo: '10% OFF',
    name: 'Studio Blend Makeup Palette',
    cat: 'Makeup',
    price: '₦22,500',
    gallery: ['/product4.jpeg', '/product2.jpeg'],
    colorOptions: [
      {
        id: 'warm-edit',
        label: 'Warm edit',
        swatch: '#c17b5c',
        images: ['/product8.jpeg', '/product4.jpeg', '/product2.jpeg'],
      },
      {
        id: 'cool-edit',
        label: 'Cool edit',
        swatch: '#9b7b9b',
        images: ['/product4.jpeg', '/product8.jpeg', '/product1.jpeg'],
        price: '₦22,500',
      },
    ],
    description:
      'An all-in-one face palette with coordinated shades for eyes and cheeks. Blendable powders make it easy to go from soft daytime to sculpted evening.',
  },
]

export function getProductBySlug(slug: string | undefined): Product | undefined {
  if (!slug) return undefined
  return PRODUCTS.find((p) => p.slug === slug)
}
