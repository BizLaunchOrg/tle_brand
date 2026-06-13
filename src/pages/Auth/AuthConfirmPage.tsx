import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import type { EmailOtpType } from '@supabase/supabase-js'
import { getSupabase } from '../../lib/supabaseClient'
import { isSupabaseConfigured } from '../../lib/mapSupabaseAuthError'

type ConfirmState = 'verifying' | 'success' | 'error'

const allowedTypes = new Set<EmailOtpType>(['signup', 'invite', 'recovery', 'email_change', 'email'])

function getSafeNextPath(nextParam: string | null, adminFlow: boolean) {
  if (!nextParam) return adminFlow ? '/admin/account' : '/login'
  if (!nextParam.startsWith('/')) return adminFlow ? '/admin/account' : '/login'
  if (adminFlow && !nextParam.startsWith('/admin')) return '/admin/account'
  return nextParam
}

function parseHashParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams()
  return new URLSearchParams(window.location.hash.replace(/^#/, ''))
}

function stripHashFromUrl() {
  if (typeof window === 'undefined') return
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
}

export function AuthConfirmPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const adminFlow =
    location.pathname.startsWith('/admin/auth/confirm') ||
    (searchParams.get('next') ?? '').startsWith('/admin')

  const [state, setState] = useState<ConfirmState>('verifying')
  const [message, setMessage] = useState('Verifying your email confirmation link...')
  const [resolvedType, setResolvedType] = useState<string | null>(null)

  const tokenHash = searchParams.get('token_hash')
  const rawType = searchParams.get('type')
  const nextPath = useMemo(
    () => getSafeNextPath(searchParams.get('next'), adminFlow),
    [adminFlow, searchParams],
  )

  useEffect(() => {
    let active = true

    const finishError = (msg: string) => {
      if (!active) return
      setState('error')
      setMessage(msg)
    }

    const finishSuccess = (authType: string | null) => {
      if (!active) return
      setResolvedType(authType)
      const isEmailChange = authType === 'email_change' || adminFlow
      setState('success')
      setMessage(
        isEmailChange
          ? 'Email updated. Redirecting you back to admin settings…'
          : 'Email confirmed successfully. Redirecting you to sign in…',
      )
      window.setTimeout(() => {
        navigate(nextPath, {
          replace: true,
          state: {
            authNotice: isEmailChange
              ? 'Your email address was updated.'
              : 'Email confirmed successfully. You can now sign in.',
          },
        })
      }, 1200)
    }

    async function verifyEmailLink() {
      if (!isSupabaseConfigured()) {
        finishError('Authentication is not configured yet. Please contact support.')
        return
      }

      const supabase = getSupabase()
      const hashParams = parseHashParams()

      const hashError = hashParams.get('error_description') || hashParams.get('error')
      const queryError = searchParams.get('error_description') || searchParams.get('error')
      if (hashError || queryError) {
        finishError('This confirmation link is invalid or has expired. Please request a new one.')
        return
      }

      const code = searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!active) return
        if (error) {
          finishError('This confirmation link is invalid or has expired. Please request a new one.')
          return
        }
        stripHashFromUrl()
        finishSuccess(searchParams.get('type'))
        return
      }

      if (tokenHash && rawType && allowedTypes.has(rawType as EmailOtpType)) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: rawType as EmailOtpType,
        })
        if (!active) return
        if (error) {
          finishError('This confirmation link is invalid or has expired. Please request a new one.')
          return
        }
        finishSuccess(rawType)
        return
      }

      // {{ .ConfirmationURL }} hits Supabase /auth/v1/verify first, then redirects here
      // with access_token + refresh_token in the URL hash (not token_hash in query).
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const hashType = hashParams.get('type')

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (!active) return
        if (error) {
          finishError('This confirmation link is invalid or has expired. Please request a new one.')
          return
        }
        stripHashFromUrl()
        finishSuccess(hashType)
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!active) return
      if (session && (adminFlow || hashType === 'email_change')) {
        finishSuccess(hashType ?? 'email_change')
        return
      }

      finishError('This confirmation link is invalid or incomplete.')
    }

    void verifyEmailLink()

    return () => {
      active = false
    }
  }, [adminFlow, navigate, nextPath, rawType, searchParams, tokenHash])

  const shellCls = adminFlow
    ? 'flex min-h-svh flex-col items-center justify-center bg-neutral-950 px-4 py-16'
    : 'min-h-0 flex-1 bg-tle-cream/60 px-4 pb-20 pt-28 sm:px-6 md:px-10 md:pt-32 lg:px-16'

  const cardCls = adminFlow
    ? 'mx-auto w-full max-w-[560px] rounded-2xl border border-neutral-800 bg-neutral-900/90 p-6 text-center shadow-lg sm:p-8'
    : 'mx-auto w-full max-w-[560px] rounded-[28px] border border-black/8 bg-white p-6 text-center shadow-[0_10px_40px_rgba(0,0,0,0.04)] sm:p-8'

  const titleCls = adminFlow
    ? 'font-sans text-[clamp(1.5rem,4vw,2rem)] font-semibold text-neutral-100'
    : 'font-sans text-[clamp(1.5rem,4vw,2rem)] font-semibold text-tle-ink'

  const isEmailChange = resolvedType === 'email_change' || adminFlow

  const page = (
    <section className={shellCls}>
      <div className={cardCls}>
        <div className="mb-3 flex items-center justify-center gap-3">
          <div className={`h-px w-[22px] ${adminFlow ? 'bg-emerald-500/60' : 'bg-tle-gold'}`} />
          <span
            className={`text-[10px] font-semibold tracking-[0.22em] uppercase ${
              adminFlow ? 'text-emerald-400/90' : 'text-tle-gold'
            }`}
          >
            {adminFlow ? 'Admin · Account' : 'Account'}
          </span>
          <div className={`h-px w-[22px] ${adminFlow ? 'bg-emerald-500/60' : 'bg-tle-gold'}`} />
        </div>

        <h1 className={titleCls}>
          {state === 'verifying'
            ? 'Confirming your email'
            : state === 'success'
              ? isEmailChange
                ? 'Email updated'
                : 'Email confirmed'
              : 'Confirmation failed'}
        </h1>

        <p
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            state === 'error'
              ? adminFlow
                ? 'border border-red-900/60 bg-red-950/40 text-red-200'
                : 'border border-red-200 bg-red-50 text-red-800'
              : state === 'success'
                ? adminFlow
                  ? 'border border-emerald-900/50 bg-emerald-950/30 text-emerald-200'
                  : 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                : adminFlow
                  ? 'border border-neutral-800 bg-neutral-950/60 text-neutral-400'
                  : 'border border-black/10 bg-tle-cream/60 text-tle-muted'
          }`}
          role={state === 'error' ? 'alert' : 'status'}
        >
          {message}
        </p>

        {state === 'error' ? (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {adminFlow ? (
              <>
                <Link
                  to="/admin/account"
                  className="rounded-full bg-emerald-600 px-5 py-2.5 text-[12px] font-bold tracking-[0.12em] text-white no-underline uppercase transition-colors hover:bg-emerald-500"
                >
                  Back to admin settings
                </Link>
                <Link
                  to="/login"
                  className="rounded-full border border-neutral-700 px-5 py-2.5 text-[12px] font-bold tracking-[0.12em] text-neutral-200 no-underline uppercase transition-colors hover:border-emerald-500 hover:text-emerald-300"
                >
                  Sign in
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/signup"
                  className="rounded-full bg-tle-charcoal px-5 py-2.5 text-[12px] font-bold tracking-[0.12em] text-white no-underline uppercase transition-colors hover:bg-tle-pink"
                >
                  Create account again
                </Link>
                <Link
                  to="/login"
                  className="rounded-full border border-black/15 px-5 py-2.5 text-[12px] font-bold tracking-[0.12em] text-tle-ink no-underline uppercase transition-colors hover:border-tle-pink hover:text-tle-pink"
                >
                  Go to login
                </Link>
              </>
            )}
          </div>
        ) : null}
      </div>
    </section>
  )

  return page
}
