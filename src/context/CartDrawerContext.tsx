import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Product } from '../data/products.ts'

type CartItem = Product & { quantity: number }

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
  addToCart: (product: Product) => void
  incrementCartItem: (productName: string) => void
  decrementCartItem: (productName: string) => void
  removeCartItem: (productName: string) => void
  toggleFavorite: (product: Product) => void
  isFavorite: (productName: string) => boolean
  isInCart: (productName: string) => boolean
}

const CartDrawerContext = createContext<CartDrawerContextValue | null>(null)

const parsePrice = (price: string) => Number(price.replace(/[^\d]/g, '')) || 0

export function CartDrawerProvider({ children }: { children: ReactNode }) {
  const [cartOpen, setCartOpen] = useState(false)
  const [favoritesOpen, setFavoritesOpen] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [favoriteItems, setFavoriteItems] = useState<Product[]>([])

  const openCart = useCallback(() => setCartOpen(true), [])
  const closeCart = useCallback(() => setCartOpen(false), [])
  const openFavorites = useCallback(() => setFavoritesOpen(true), [])
  const closeFavorites = useCallback(() => setFavoritesOpen(false), [])

  const addToCart = useCallback((product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.name === product.name)
      if (!existing) return [...prev, { ...product, quantity: 1 }]
      return prev.map((item) => (item.name === product.name ? { ...item, quantity: item.quantity + 1 } : item))
    })
    setCartOpen(true)
  }, [])

  const incrementCartItem = useCallback((productName: string) => {
    setCartItems((prev) =>
      prev.map((item) => (item.name === productName ? { ...item, quantity: item.quantity + 1 } : item)),
    )
  }, [])

  const decrementCartItem = useCallback((productName: string) => {
    setCartItems((prev) =>
      prev
        .map((item) => (item.name === productName ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0),
    )
  }, [])

  const removeCartItem = useCallback((productName: string) => {
    setCartItems((prev) => prev.filter((item) => item.name !== productName))
  }, [])

  const toggleFavorite = useCallback((product: Product) => {
    setFavoriteItems((prev) => {
      const exists = prev.some((item) => item.name === product.name)
      if (exists) return prev.filter((item) => item.name !== product.name)
      return [...prev, product]
    })
  }, [])

  const isFavorite = useCallback(
    (productName: string) => favoriteItems.some((item) => item.name === productName),
    [favoriteItems],
  )
  const isInCart = useCallback(
    (productName: string) => cartItems.some((item) => item.name === productName),
    [cartItems],
  )

  const cartCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems])
  const favoriteCount = useMemo(() => favoriteItems.length, [favoriteItems])
  const cartSubtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + parsePrice(item.price) * item.quantity, 0),
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
      toggleFavorite,
      isFavorite,
      isInCart,
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
      toggleFavorite,
      isFavorite,
      isInCart,
    ],
  )

  return (
    <CartDrawerContext.Provider value={value}>
      {children}
    </CartDrawerContext.Provider>
  )
}

export function useCartDrawer() {
  const ctx = useContext(CartDrawerContext)
  if (!ctx) {
    throw new Error('useCartDrawer must be used within CartDrawerProvider')
  }
  return ctx
}
