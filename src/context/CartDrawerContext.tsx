import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  cartLineKey,
  getDefaultImageUrls,
  getDisplayPrice,
  getGalleryUrls,
  getProductPurchasableMaxUnits,
  isVariantOutOfStock,
  parseProductPriceNgn,
  PRODUCTS,
  type Product,
} from '../data/products.ts'
import { loadShopState, saveShopState, type PersistedCartLine } from '../lib/shopStorage.ts'
import {
  fetchUserCartItems,
  fetchUserFavoriteSlugs,
  mergeCartLines,
  mergeFavoriteSlugs,
  replaceUserCartItems,
  replaceUserFavorites,
} from '../lib/userShopSync.ts'
import { isSupabaseConfigured } from '../lib/mapSupabaseAuthError'
import { useAuth } from './AuthContext'
import { useShopProducts } from './ShopProductsContext.tsx'

export type CartVariant = { id: string; label: string }

type CartItem = Product & {
  quantity: number
  variantId?: string
  variantLabel?: string
}

type CartDrawerContextValue = {
  cartOpen: boolean
  favoritesOpen: boolean
  cartItems: CartItem[]
  favoriteItems: Product[]
  cartCount: number
  favoriteCount: number
  cartSubtotal: number
  openCart: () => void
  closeCart: () => void
  openFavorites: () => void
  closeFavorites: () => void
  addToCart: (product: Product, variant?: CartVariant) => void
  incrementCartItem: (lineKey: string) => void
  decrementCartItem: (lineKey: string) => void
  removeCartItem: (lineKey: string) => void
  clearCart: () => void
  toggleFavorite: (product: Product) => void
  isFavorite: (slug: string) => boolean
  isLineInCart: (lineKey: string) => boolean
  hasProductInCart: (slug: string) => boolean
  lineQuantityInCart: (lineKey: string) => number
}

const CartDrawerContext = createContext<CartDrawerContextValue | null>(null)

function buildCartLine(product: Product, variant?: CartVariant): CartItem {
  const variantId = variant?.id
  const urls = getGalleryUrls(product, variantId)
  const hero = urls[0] ?? getDefaultImageUrls(product)[0] ?? product.img
  const price = getDisplayPrice(product, variantId)
  const alt =
    variant?.label && variant.label.length > 0 ? `${product.alt} — ${variant.label}` : product.alt

  return {
    ...product,
    quantity: 1,
    price,
    img: hero,
    alt,
    variantId,
    variantLabel: variant?.label,
  }
}

function productBySlug(products: Product[], slug: string): Product | undefined {
  return products.find((p) => p.slug === slug)
}

function hydrateCart(lines: PersistedCartLine[], products: Product[]): CartItem[] {
  const out: CartItem[] = []
  for (const line of lines) {
    const p = productBySlug(products, line.slug)
    if (!p) continue
    let variant: CartVariant | undefined
    if (line.variantId) {
      const opt = p.colorOptions?.find((c) => c.id === line.variantId)
      if (opt) variant = { id: opt.id, label: opt.label }
    }
    const max = getProductPurchasableMaxUnits(p, variant?.id)
    if (max < 1) continue
    const qty = Math.min(max, Math.min(999, Math.max(1, Math.floor(Number(line.quantity)) || 1)))
    out.push({ ...buildCartLine(p, variant), quantity: qty })
  }
  return out
}

function hydrateFavoriteSlugs(slugs: string[], products: Product[]): Product[] {
  const out: Product[] = []
  const seen = new Set<string>()
  for (const slug of slugs) {
    if (seen.has(slug)) continue
    const p = productBySlug(products, slug)
    if (p) {
      seen.add(slug)
      out.push(p)
    }
  }
  return out
}

function readInitialShop(products: Product[]): { cart: CartItem[]; favorites: Product[] } {
  const raw = loadShopState()
  if (!raw) return { cart: [], favorites: [] }
  return {
    cart: hydrateCart(raw.cart, products),
    favorites: hydrateFavoriteSlugs(raw.favoriteSlugs, products),
  }
}

export function CartDrawerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const shopProducts = useShopProducts()
  const initRef = useRef<{ cart: CartItem[]; favorites: Product[] } | null>(null)
  const getInit = () => {
    if (!initRef.current) initRef.current = readInitialShop(PRODUCTS)
    return initRef.current
  }
  const [cartOpen, setCartOpen] = useState(false)
  const [favoritesOpen, setFavoritesOpen] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => getInit().cart)
  const [favoriteItems, setFavoriteItems] = useState<Product[]>(() => getInit().favorites)
  const [shopRemoteSynced, setShopRemoteSynced] = useState(false)

  useEffect(() => {
    const raw = loadShopState()
    if (!raw) return
    setCartItems(hydrateCart(raw.cart, shopProducts))
    setFavoriteItems(hydrateFavoriteSlugs(raw.favoriteSlugs, shopProducts))
  }, [shopProducts])

  useEffect(() => {
    if (!user?.id) {
      setShopRemoteSynced(false)
      return
    }

    if (!isSupabaseConfigured()) {
      setShopRemoteSynced(true)
      return
    }

    let cancelled = false
    setShopRemoteSynced(false)

    ;(async () => {
      const [remoteCart, remoteFav] = await Promise.all([
        fetchUserCartItems(user.id),
        fetchUserFavoriteSlugs(user.id),
      ])
      if (cancelled) return

      setCartItems((prev) => {
        const localLines: PersistedCartLine[] = prev.map((i) => ({
          slug: i.slug,
          variantId: i.variantId,
          quantity: i.quantity,
        }))
        const merged = mergeCartLines(localLines, remoteCart)
        return hydrateCart(merged, shopProducts)
      })

      setFavoriteItems((prev) => {
        const mergedSlugs = mergeFavoriteSlugs(
          prev.map((p) => p.slug),
          remoteFav,
        )
        return hydrateFavoriteSlugs(mergedSlugs, shopProducts)
      })

      setShopRemoteSynced(true)
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id, shopProducts])

  useEffect(() => {
    if (!user?.id || !shopRemoteSynced) return

    const lines: PersistedCartLine[] = cartItems.map((i) => ({
      slug: i.slug,
      variantId: i.variantId,
      quantity: i.quantity,
    }))
    const favSlugs = favoriteItems.map((p) => p.slug)

    const t = window.setTimeout(() => {
      void Promise.all([replaceUserCartItems(user.id, lines), replaceUserFavorites(user.id, favSlugs)])
    }, 450)

    return () => window.clearTimeout(t)
  }, [cartItems, favoriteItems, user?.id, shopRemoteSynced])

  useEffect(() => {
    saveShopState({
      cart: cartItems.map((item) => ({
        slug: item.slug,
        variantId: item.variantId,
        quantity: item.quantity,
      })),
      favoriteSlugs: favoriteItems.map((p) => p.slug),
    })
  }, [cartItems, favoriteItems])

  const openCart = useCallback(() => setCartOpen(true), [])
  const closeCart = useCallback(() => setCartOpen(false), [])
  const openFavorites = useCallback(() => setFavoritesOpen(true), [])
  const closeFavorites = useCallback(() => setFavoritesOpen(false), [])

  const addToCart = useCallback(
    (product: Product, variant?: CartVariant) => {
      const live = productBySlug(shopProducts, product.slug) ?? product
      if (isVariantOutOfStock(live, variant?.id)) return
      const max = getProductPurchasableMaxUnits(live, variant?.id)
      const lineKey = cartLineKey(live.slug, variant?.id)
      setCartItems((prev) => {
        const existing = prev.find((item) => cartLineKey(item.slug, item.variantId) === lineKey)
        if (!existing) return [...prev, buildCartLine(live, variant)]
        if (existing.quantity >= max) return prev
        return prev.map((item) =>
          cartLineKey(item.slug, item.variantId) === lineKey
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      })
      setCartOpen(true)
    },
    [shopProducts],
  )

  const incrementCartItem = useCallback(
    (lineKey: string) => {
      setCartItems((prev) =>
        prev.map((item) => {
          if (cartLineKey(item.slug, item.variantId) !== lineKey) return item
          const live = productBySlug(shopProducts, item.slug)
          const max = getProductPurchasableMaxUnits(live ?? item, item.variantId)
          if (item.quantity >= max) return item
          return { ...item, quantity: item.quantity + 1 }
        }),
      )
    },
    [shopProducts],
  )

  const decrementCartItem = useCallback((lineKey: string) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          cartLineKey(item.slug, item.variantId) === lineKey ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }, [])

  const removeCartItem = useCallback((lineKey: string) => {
    setCartItems((prev) => prev.filter((item) => cartLineKey(item.slug, item.variantId) !== lineKey))
  }, [])

  const clearCart = useCallback(() => {
    setCartItems([])
  }, [])

  const toggleFavorite = useCallback((product: Product) => {
    let opened = false
    setFavoriteItems((prev) => {
      const exists = prev.some((item) => item.slug === product.slug)
      if (exists) return prev.filter((item) => item.slug !== product.slug)
      opened = true
      return [...prev, product]
    })
    if (opened) setFavoritesOpen(true)
  }, [])

  const isFavorite = useCallback(
    (slug: string) => favoriteItems.some((item) => item.slug === slug),
    [favoriteItems],
  )

  const isLineInCart = useCallback(
    (lineKey: string) => cartItems.some((item) => cartLineKey(item.slug, item.variantId) === lineKey),
    [cartItems],
  )

  const hasProductInCart = useCallback(
    (slug: string) => cartItems.some((item) => item.slug === slug),
    [cartItems],
  )

  const lineQuantityInCart = useCallback(
    (lineKey: string) => cartItems.find((item) => cartLineKey(item.slug, item.variantId) === lineKey)?.quantity ?? 0,
    [cartItems],
  )

  const cartCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems])
  const favoriteCount = useMemo(() => favoriteItems.length, [favoriteItems])
  const cartSubtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + parseProductPriceNgn(item.price) * item.quantity, 0),
    [cartItems],
  )

  const value = useMemo(
    () => ({
      cartOpen,
      favoritesOpen,
      cartItems,
      favoriteItems,
      cartCount,
      favoriteCount,
      cartSubtotal,
      openCart,
      closeCart,
      openFavorites,
      closeFavorites,
      addToCart,
      incrementCartItem,
      decrementCartItem,
      removeCartItem,
      clearCart,
      toggleFavorite,
      isFavorite,
      isLineInCart,
      hasProductInCart,
      lineQuantityInCart,
    }),
    [
      cartOpen,
      favoritesOpen,
      cartItems,
      favoriteItems,
      cartCount,
      favoriteCount,
      cartSubtotal,
      openCart,
      closeCart,
      openFavorites,
      closeFavorites,
      addToCart,
      incrementCartItem,
      decrementCartItem,
      removeCartItem,
      clearCart,
      toggleFavorite,
      isFavorite,
      isLineInCart,
      hasProductInCart,
      lineQuantityInCart,
    ],
  )

  return <CartDrawerContext.Provider value={value}>{children}</CartDrawerContext.Provider>
}

export function useCartDrawer() {
  const ctx = useContext(CartDrawerContext)
  if (!ctx) {
    throw new Error('useCartDrawer must be used within CartDrawerProvider')
  }
  return ctx
}
