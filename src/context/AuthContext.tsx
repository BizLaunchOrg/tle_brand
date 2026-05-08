import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type AuthUser = {
  email: string
  name: string
}

type StoredAccount = {
  email: string
  name: string
  /** Demo-only; use a real backend + hashing in production */
  password: string
}

const ACCOUNTS_KEY = 'tle_brand_accounts_v1'
const SESSION_KEY = 'tle_brand_session_v1'

function readAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (a): a is StoredAccount =>
        a != null &&
        typeof a === 'object' &&
        typeof (a as StoredAccount).email === 'string' &&
        typeof (a as StoredAccount).password === 'string' &&
        typeof (a as StoredAccount).name === 'string',
    )
  } catch {
    return []
  }
}

function writeAccounts(accounts: StoredAccount[]): void {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
  } catch {
    /* ignore */
  }
}

function readSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as unknown
    if (!s || typeof s !== 'object') return null
    const email = (s as AuthUser).email
    const name = (s as AuthUser).name
    if (typeof email !== 'string' || typeof name !== 'string') return null
    return { email, name }
  } catch {
    return null
  }
}

function writeSession(user: AuthUser | null): void {
  try {
    if (!user) localStorage.removeItem(SESSION_KEY)
    else localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  } catch {
    /* ignore */
  }
}

type AuthContextValue = {
  user: AuthUser | null
  login: (email: string, password: string) => AuthResult
  signup: (name: string, email: string, password: string) => AuthResult
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)
type AuthResult = { ok: true } | { ok: false; message: string }

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readSession())

  const login = useCallback((email: string, password: string): AuthResult => {
    try {
      const e = normalizeEmail(email)
      if (!e || !password) return { ok: false as const, message: 'Enter email and password.' }
      const accounts = readAccounts()
      const found = accounts.find((a) => normalizeEmail(a.email) === e)
      if (!found || found.password !== password) {
        return { ok: false as const, message: 'Invalid email or password.' }
      }
      const session = { email: found.email, name: found.name }
      writeSession(session)
      setUser(session)
      return { ok: true as const }
    } catch {
      return { ok: false as const, message: 'Something went wrong while signing in. Please try again.' }
    }
  }, [])

  const signup = useCallback((name: string, email: string, password: string): AuthResult => {
    try {
      const n = name.trim()
      const e = normalizeEmail(email)
      if (!n) return { ok: false as const, message: 'Enter your name.' }
      if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
        return { ok: false as const, message: 'Enter a valid email address.' }
      }
      if (password.length < 6) return { ok: false as const, message: 'Password must be at least 6 characters.' }
      const accounts = readAccounts()
      if (accounts.some((a) => normalizeEmail(a.email) === e)) {
        return { ok: false as const, message: 'An account with this email already exists.' }
      }
      const next: StoredAccount = { email: e, name: n, password }
      writeAccounts([...accounts, next])
      const session = { email: e, name: n }
      writeSession(session)
      setUser(session)
      return { ok: true as const }
    } catch {
      return { ok: false as const, message: 'Something went wrong while creating your account. Please try again.' }
    }
  }, [])

  const logout = useCallback(() => {
    writeSession(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      login,
      signup,
      logout,
    }),
    [user, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
