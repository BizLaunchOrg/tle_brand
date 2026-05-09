import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'tle_admin_theme'

export type AdminTheme = 'light' | 'dark'

type Ctx = {
  theme: AdminTheme
  setTheme: (t: AdminTheme) => void
  toggleTheme: () => void
}

const AdminThemeContext = createContext<Ctx | null>(null)

function readStored(): AdminTheme {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* ignore */
  }
  return 'dark'
}

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AdminTheme>(() =>
    typeof window === 'undefined' ? 'dark' : readStored(),
  )

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const setTheme = useCallback((t: AdminTheme) => setThemeState(t), [])
  const toggleTheme = useCallback(() => setThemeState((x) => (x === 'dark' ? 'light' : 'dark')), [])

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme])

  return <AdminThemeContext.Provider value={value}>{children}</AdminThemeContext.Provider>
}

export function useAdminTheme() {
  const ctx = useContext(AdminThemeContext)
  if (!ctx) throw new Error('useAdminTheme must be used within AdminThemeProvider')
  return ctx
}
