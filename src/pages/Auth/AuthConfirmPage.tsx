import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { EmailOtpType } from '@supabase/supabase-js'
import { getSupabase } from '../../lib/supabaseClient'
import { isSupabaseConfigured } from '../../lib/mapSupabaseAuthError'

type ConfirmState = 'verifying' | 'success' | 'error'

const allowedTypes = new Set<EmailOtpType>(['signup', 'invite', 'recovery', 'email_change', 'email'])

function getSafeNextPath(nextParam: string | null) {
  if (!nextParam) return '/login'
  return nextParam.startsWith('/') ? nextParam : '/login'
}

export function AuthConfirmPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [state, setState] = useState<ConfirmState>('verifying')
  const [message, setMessage] = useState('Verifying your email confirmation link...')

  const tokenHash = searchParams.get('token_hash')
  const rawType = searchParams.get('type')
  const nextPath = useMemo(() => getSafeNextPath(searchParams.get('next')), [searchParams])

  useEffect(() => {
    let active = true

    async function verifyEmailLink() {
      if (!isSupabaseConfigured()) {
        if (!active) return
        setState('error')
        setMessage('Authentication is not configured yet. Please contact support.')
        return
      }

      if (!tokenHash || !rawType || !allowedTypes.has(rawType as EmailOtpType)) {
        if (!active) return
        setState('error')
        setMessage('This confirmation link is invalid or incomplete.')
        return
      }

      const { error } = await getSupabase().auth.verifyOtp({
        token_hash: tokenHash,
        type: rawType as EmailOtpType,
      })

      if (!active) return

      if (error) {
        setState('error')
        setMessage('This confirmation link is invalid or has expired. Please request a new one.')
        return
      }

      setState('success')
      setMessage('Email confirmed successfully. Redirecting you to sign in...')
      window.setTimeout(() => {
        navigate(nextPath, {
          replace: true,
          state: {
            from: '/shop',
            authNotice: 'Email confirmed successfully. You can now sign in.',
          },
        })
      }, 1200)
    }

    void verifyEmailLink()

    return () => {
      active = false
    }
  }, [navigate, nextPath, rawType, tokenHash])

  return (
    <section className="min-h-0 flex-1 bg-tle-cream/60 px-4 pb-20 pt-28 sm:px-6 md:px-10 md:pt-32 lg:px-16">
      <div className="mx-auto w-full max-w-[560px] rounded-[28px] border border-black/8 bg-white p-6 text-center shadow-[0_10px_40px_rgba(0,0,0,0.04)] sm:p-8">
        <div className="mb-3 flex items-center justify-center gap-3">
          <div className="h-px w-[22px] bg-tle-gold" />
          <span className="text-[10px] font-semibold tracking-[0.22em] text-tle-gold uppercase">Account</span>
          <div className="h-px w-[22px] bg-tle-gold" />
        </div>

        <h1 className="font-sans text-[clamp(1.5rem,4vw,2rem)] font-semibold text-tle-ink">
          {state === 'verifying' ? 'Confirming your email' : state === 'success' ? 'Email confirmed' : 'Confirmation failed'}
        </h1>

        <p
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            state === 'error'
              ? 'border border-red-200 bg-red-50 text-red-800'
              : state === 'success'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border border-black/10 bg-tle-cream/60 text-tle-muted'
          }`}
          role={state === 'error' ? 'alert' : 'status'}
        >
          {message}
        </p>

        {state === 'error' ? (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
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
          </div>
        ) : null}
      </div>
    </section>
  )
}
