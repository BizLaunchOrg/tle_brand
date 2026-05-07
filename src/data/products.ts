export type ProductGender = 'her' | 'him'

export type Product = {
  gender: ProductGender
  img: string
  alt: string
  badge: string
  /** Shown in orange promo pill (e.g. 10% OFF) */
  promo?: string
  name: string
  cat: string
  price: string
}

export const PRODUCTS: Product[] = [
  {
    gender: 'her',
    img: '/product1.jpeg',
    alt: 'Glow Serum',
    badge: 'For Her',
    promo: '10% OFF',
    name: 'Radiance Glow Serum',
    cat: 'Skincare',
    price: '₦18,500',
  },
  {
    gender: 'her',
    img: '/product2.jpeg',
    alt: 'Hydra Mist',
    badge: 'For Her',
    promo: '10% OFF',
    name: 'Hydra-Mist Face Spray',
    cat: 'Mist & Toner',
    price: '₦12,000',
  },
  {
    gender: 'him',
    img: '/product3.jpeg',
    alt: 'Grooming Kit',
    badge: 'For Him',
    promo: '10% OFF',
    name: 'Pro Grooming Essentials',
    cat: "Men's Care",
    price: '₦32,000',
  },
  {
    gender: 'her',
    img: '/product4.jpeg',
    alt: 'Lip tint',
    badge: 'For Her',
    promo: '10% OFF',
    name: 'Velvet Lip Tint Set',
    cat: 'Makeup',
    price: '₦15,500',
  },
  {
    gender: 'him',
    img: '/product5.jpeg',
    alt: 'Face wash',
    badge: 'For Him',
    promo: '12% OFF',
    name: 'Daily Purifying Face Wash',
    cat: 'Skincare',
    price: '₦10,500',
  },
  {
    gender: 'her',
    img: '/product6.jpeg',
    alt: 'Body lotion',
    badge: 'For Her',
    promo: '8% OFF',
    name: 'Silk Nourish Body Lotion',
    cat: 'Body Care',
    price: '₦14,000',
  },
  {
    gender: 'him',
    img: 'https://images.unsplash.com/photo-1614859324967-bef9e3e5a9f4?w=600&h=800&fit=crop',
    alt: 'Fragrance',
    badge: 'For Him',
    promo: '15% OFF',
    name: 'Noir Signature Fragrance',
    cat: 'Perfume',
    price: '₦28,000',
  },
  {
    gender: 'her',
    img: '/product8.jpeg',
    alt: 'Makeup palette',
    badge: 'For Her',
    promo: '10% OFF',
    name: 'Studio Blend Makeup Palette',
    cat: 'Makeup',
    price: '₦22,500',
  },
]
