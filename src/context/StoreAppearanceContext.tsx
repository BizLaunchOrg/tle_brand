import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  DEFAULT_STORE_APPEARANCE,
  fetchStoreAppearance,
  getMemoryAppearance,
  type StoreAppearance,
} from '../lib/storeAppearance'

type Ctx = {
  appearance: StoreAppearance
  loading: boolean
  refresh: () => Promise<void>
}

const AppearanceContext = createContext<Ctx>({
  appearance: DEFAULT_STORE_APPEARANCE,
  loading: true,
  refresh: async () => {},
})

export function StoreAppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<StoreAppearance>(() => getMemoryAppearance())
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const next = await fetchStoreAppearance()
    setAppearance(next)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  const value = useMemo(() => ({ appearance, loading, refresh }), [appearance, loading, refresh])
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}

export function useStoreAppearance(): StoreAppearance {
  return useContext(AppearanceContext).appearance
}

export function useStoreAppearanceLoading(): boolean {
  return useContext(AppearanceContext).loading
}
