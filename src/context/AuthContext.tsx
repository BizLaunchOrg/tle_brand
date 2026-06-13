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
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { resolveAdminAccess } from '../lib/adminAccess'
import { getSignupRedirectUrl } from '../lib/authRedirect.ts'
import { getSupabase } from '../lib/supabaseClient'
import { isSupabaseConfigured, mapSupabaseAuthError } from '../lib/mapSupabaseAuthError'

export type AuthUser = {
  id: string
  email: string
  name: string
}

export type AuthResult =
  | { ok: true; message?: string; requiresEmailConfirmation?: boolean }
  | { ok: false; message: string }

type AuthContextValue = {
  user: AuthUser | null
  /** Same session as storefront; true if allowlisted in Supabase or JWT claims. */
  isAdmin: boolean
  /** Initial session load finished. */
  authReady: boolean
  /** Admin allowlist / JWT check finished (for current user). */
  adminResolved: boolean
  login: (email: string, password: string) => Promise<AuthResult>
  signup: (name: string, email: string, password: string) => Promise<AuthResult>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function getDisplayName(user: SupabaseUser): string {
  const metadata = user.user_metadata as Record<string, unknown> | undefined
  const nameFromMetadata =
    (typeof metadata?.name === 'string' && metadata.name.trim()) ||
    (typeof metadata?.full_name === 'string' && metadata.full_name.trim())
  if (nameFromMetadata) return nameFromMetadata
  const emailName = user.email?.split('@')[0]?.trim()
  return emailName || 'Account'
}

function mapSupabaseUser(user: SupabaseUser | null): AuthUser | null {
  if (!user?.id || !user.email) return null
  return {
    id: user.id,
    email: user.email,
    name: getDisplayName(user),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminResolved, setAdminResolved] = useState(false)
  const adminSeqRef = useRef(0)
  const lastCheckedUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthReady(true)
      setAdminResolved(true)
      setIsAdmin(false)
      return
    }

    let cancelled = false
    const supabase = getSupabase()

    const runAdminCheck = async (su: SupabaseUser | null) => {
      const seq = ++adminSeqRef.current
      if (!su) {
        if (adminSeqRef.current !== seq) return
        lastCheckedUserIdRef.current = null
        setIsAdmin(false)
        setAdminResolved(true)
        return
      }
      const prevId = lastCheckedUserIdRef.current
      const isNewUser = prevId !== su.id
      lastCheckedUserIdRef.current = su.id
      if (isNewUser) setAdminResolved(false)
      const ok = await resolveAdminAccess(su)
      if (adminSeqRef.current !== seq) return
      setIsAdmin(ok)
      setAdminResolved(true)
    }

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      const su = data.session?.user ?? null
      setUser(mapSupabaseUser(su))
      setAuthReady(true)
      void runAdminCheck(su)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      const su = session?.user ?? null
      setUser(mapSupabaseUser(su))
      void runAdminCheck(su)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const e = normalizeEmail(email)
    if (!e || !password) return { ok: false, message: 'Enter email and password.' }
    if (!isSupabaseConfigured()) {
      return {
        ok: false,
        message:
          'Sign-in is not configured. In Vercel add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then redeploy.',
      }
    }

    const { error } = await getSupabase().auth.signInWithPassword({
      email: e,
      password,
    })

    if (error) {
      return { ok: false, message: mapSupabaseAuthError(error, 'login') }
    }

    return { ok: true }
  }, [])

  const signup = useCallback(async (name: string, email: string, password: string): Promise<AuthResult> => {
    const n = name.trim()
    const e = normalizeEmail(email)
    if (!n) return { ok: false, message: 'Enter your name.' }
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return { ok: false, message: 'Enter a valid email address.' }
    }
    if (password.length < 6) return { ok: false, message: 'Password must be at least 6 characters.' }
    if (!isSupabaseConfigured()) {
      return {
        ok: false,
        message:
          'Sign-up is not configured. In Vercel add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then redeploy.',
      }
    }

    const emailRedirectTo = getSignupRedirectUrl()

    const { data, error } = await getSupabase().auth.signUp({
      email: e,
      password,
      options: {
        data: { name: n, full_name: n },
        emailRedirectTo,
      },
    })

    if (error) {
      return { ok: false, message: mapSupabaseAuthError(error, 'signup') }
    }

    if (!data.session) {
      return {
        ok: true,
        requiresEmailConfirmation: true,
        message: 'Account created. Check your email for a confirmation link before signing in.',
      }
    }

    return { ok: true, message: 'Account created successfully.' }
  }, [])

  const logout = useCallback(async () => {
    if (isSupabaseConfigured()) {
      await getSupabase().auth.signOut()
    }
    lastCheckedUserIdRef.current = null
    setUser(null)
    setIsAdmin(false)
    setAdminResolved(true)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAdmin,
      authReady,
      adminResolved,
      login,
      signup,
      logout,
    }),
    [user, isAdmin, authReady, adminResolved, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
