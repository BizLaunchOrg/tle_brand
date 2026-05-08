import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient.ts'
import { isSupabaseConfigured, mapSupabaseAuthError } from '../lib/mapSupabaseAuthError.ts'

export type AuthUser = {
  email: string
  name: string
}

export type AuthResult =
  | { ok: true; message?: string; requiresEmailConfirmation?: boolean }
  | { ok: false; message: string }

type AuthContextValue = {
  user: AuthUser | null
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
  if (!user?.email) return null
  return {
    email: user.email,
    name: getDisplayName(user),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setUser(mapSupabaseUser(data.session?.user ?? null))
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapSupabaseUser(session?.user ?? null))
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const e = normalizeEmail(email)
    if (!e || !password) return { ok: false, message: 'Enter email and password.' }
    if (!isSupabaseConfigured()) {
      return { ok: false, message: 'Sign-in is not configured. Check Supabase URL and anon key in your environment.' }
    }

    const { error } = await supabase.auth.signInWithPassword({
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
      return { ok: false, message: 'Sign-up is not configured. Check Supabase URL and anon key in your environment.' }
    }

    const emailRedirectTo = import.meta.env.VITE_AUTH_REDIRECT_URL || `${window.location.origin}/login`

    const { data, error } = await supabase.auth.signUp({
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
    await supabase.auth.signOut()
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
