import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { PRODUCTS, type Product } from '../data/products.ts'
import { fetchStorefrontCatalogProducts } from '../lib/storefrontCatalog.ts'

const ShopProductsContext = createContext<Product[]>(PRODUCTS)

export function ShopProductsProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [remote, setRemote] = useState<Product[] | null>(null)

  useEffect(() => {
    if (pathname.startsWith('/admin')) return

    let cancelled = false
    void (async () => {
      const rows = await fetchStorefrontCatalogProducts()
      if (cancelled) return
      if (rows.length) setRemote(rows)
    })()

    return () => {
      cancelled = true
    }
  }, [pathname])

  const value = useMemo(() => (remote?.length ? remote : PRODUCTS), [remote])

  return <ShopProductsContext.Provider value={value}>{children}</ShopProductsContext.Provider>
}

export function useShopProducts(): Product[] {
  return useContext(ShopProductsContext)
}
