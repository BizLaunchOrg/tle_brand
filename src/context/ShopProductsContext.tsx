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
import { useLocation } from 'react-router-dom'
import type { Product } from '../data/products.ts'
import { fetchStorefrontCatalogProducts } from '../lib/storefrontCatalog.ts'
import { getSupabase } from '../lib/supabaseClient.ts'
import { isSupabaseConfigured } from '../lib/mapSupabaseAuthError.ts'
import { useAuth } from './AuthContext.tsx'

type ShopProductsContextValue = {
  products: Product[]
  /** True until the first catalog fetch finishes (avoids a false “empty shop” flash). */
  loading: boolean
}

const ShopProductsContext = createContext<ShopProductsContextValue>({
  products: [],
  loading: true,
})

export function ShopProductsProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { user, authReady } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const fetchSeq = useRef(0)
  const onStorefront = !pathname.startsWith('/admin')

  const loadCatalog = useCallback(async (opts?: { silent?: boolean }) => {
    if (!onStorefront) return
    const seq = ++fetchSeq.current
    if (!opts?.silent) setLoading(true)
    try {
      const rows = await fetchStorefrontCatalogProducts()
      if (seq !== fetchSeq.current) return
      setProducts(rows)
    } catch {
      if (seq !== fetchSeq.current) return
      // Keep whatever we already have; don't blank the shelf on a flaky refresh.
    } finally {
      if (seq === fetchSeq.current) setLoading(false)
    }
  }, [onStorefront])

  // Initial + auth/path refresh
  useEffect(() => {
    if (!onStorefront) return
    if (!authReady) return
    void loadCatalog()
  }, [onStorefront, authReady, user?.id, loadCatalog])

  // Live updates when admin adds/edits/removes products (no customer refresh needed)
  useEffect(() => {
    if (!onStorefront || !isSupabaseConfigured()) return

    const channel = getSupabase()
      .channel('storefront-catalog-products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'catalog_products' },
        () => {
          void loadCatalog({ silent: true })
        },
      )
      .subscribe()

    return () => {
      void getSupabase().removeChannel(channel)
    }
  }, [onStorefront, loadCatalog])

  // Refetch when the tab becomes visible again (covers missed realtime / cold start)
  useEffect(() => {
    if (!onStorefront) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') void loadCatalog({ silent: true })
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [onStorefront, loadCatalog])

  // Soft poll so shelves update even if Realtime is not enabled on the project yet
  useEffect(() => {
    if (!onStorefront || !isSupabaseConfigured()) return
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadCatalog({ silent: true })
    }, 20_000)
    return () => window.clearInterval(id)
  }, [onStorefront, loadCatalog])

  const value = useMemo(() => ({ products, loading }), [products, loading])

  return <ShopProductsContext.Provider value={value}>{children}</ShopProductsContext.Provider>
}

export function useShopProducts(): Product[] {
  return useContext(ShopProductsContext).products
}

export function useShopCatalogLoading(): boolean {
  return useContext(ShopProductsContext).loading
}
