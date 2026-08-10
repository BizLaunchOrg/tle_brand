import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { BookableServiceItem, MakeupMenuItem } from '../data/bookingServices.ts'
import {
  DEFAULT_MAKEUP_MENU,
  fetchMakeupMenu,
  getMemoryMakeupMenu,
  makeupHighlightTags,
  makeupServices,
  photoshootPackages as buildPhotoshootPackages,
  photoshootServices,
  toBookableService,
  type MakeupMenu,
} from '../lib/makeupMenu.ts'

type Ctx = {
  menu: MakeupMenu
  loading: boolean
  services: BookableServiceItem[]
  items: MakeupMenuItem[]
  makeupItems: MakeupMenuItem[]
  photoshootItems: MakeupMenuItem[]
  photoshootPackages: { line: string; price: string }[]
  highlightTags: string[]
  refresh: () => Promise<void>
}

const MakeupMenuContext = createContext<Ctx>({
  menu: DEFAULT_MAKEUP_MENU,
  loading: true,
  services: DEFAULT_MAKEUP_MENU.items.map(toBookableService),
  items: DEFAULT_MAKEUP_MENU.items,
  makeupItems: makeupServices(DEFAULT_MAKEUP_MENU),
  photoshootItems: photoshootServices(DEFAULT_MAKEUP_MENU),
  photoshootPackages: buildPhotoshootPackages(DEFAULT_MAKEUP_MENU),
  highlightTags: makeupHighlightTags(DEFAULT_MAKEUP_MENU),
  refresh: async () => {},
})

export function MakeupMenuProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<MakeupMenu>(() => getMemoryMakeupMenu())
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const next = await fetchMakeupMenu()
    setMenu(next)
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

  const value = useMemo<Ctx>(() => {
    return {
      menu,
      loading,
      services: menu.items.map(toBookableService),
      items: menu.items,
      makeupItems: makeupServices(menu),
      photoshootItems: photoshootServices(menu),
      photoshootPackages: buildPhotoshootPackages(menu),
      highlightTags: makeupHighlightTags(menu),
      refresh,
    }
  }, [menu, loading, refresh])

  return <MakeupMenuContext.Provider value={value}>{children}</MakeupMenuContext.Provider>
}

export function useMakeupMenu(): Ctx {
  return useContext(MakeupMenuContext)
}
