import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

export function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string; authNotice?: string } | null)?.from ?? '/shop'
  const authNotice = (location.state as { from?: string; authNotice?: string } | null)?.authNotice ?? null
  const safeFrom = from.startsWith('/') ? from : '/shop'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    navigate(safeFrom, { replace: true })
  }, [navigate, safeFrom, user])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const result = await login(email, password)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      toast.success('Signed in successfully')
      navigate(safeFrom, { replace: true })
    } catch {
      toast.error('Unable to sign in right now. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="min-h-0 flex-1 bg-tle-cream/60 px-4 pb-20 pt-28 sm:px-6 md:px-10 md:pt-32 lg:px-16">
      <div className="mx-auto w-full max-w-[440px]">
        <div className="mb-3 flex items-center gap-3">
          <div className="h-px w-[22px] bg-tle-gold" />
          <span className="text-[10px] font-semibold tracking-[0.22em] text-tle-gold uppercase">
            Account
          </span>
        </div>
        <h1 className="font-sans text-[clamp(1.75rem,4vw,2.25rem)] font-semibold text-tle-ink">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-tle-muted">
          Sign in to track orders and move through checkout faster.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-10 rounded-[28px] border border-black/8 bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] sm:p-8"
        >
          {authNotice ? (
            <p
              className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              role="status"
            >
              {authNotice}
            </p>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">
              Email
            </span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border-[1.5px] border-black/10 bg-white px-4 py-3 text-sm text-tle-ink outline-none transition-colors placeholder:text-tle-faint focus:border-tle-pink"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="mt-5 block">
            <span className="mb-2 block text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border-[1.5px] border-black/10 bg-white px-4 py-3 text-sm text-tle-ink outline-none transition-colors placeholder:text-tle-faint focus:border-tle-pink"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="mt-8 w-full rounded-full bg-tle-charcoal py-3.5 text-[12px] font-bold tracking-[0.12em] text-white uppercase transition-colors hover:bg-tle-pink disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-tle-muted">
          New here?{' '}
          <Link
            to="/signup"
            className="font-semibold text-tle-pink no-underline hover:text-tle-deep"
            state={{ from: safeFrom }}
          >
            Create an account
          </Link>
        </p>

        <Link
          to="/"
          className="mt-6 flex items-center justify-center gap-2 text-[13px] font-semibold text-tle-muted no-underline hover:text-tle-pink"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">
            arrow_back
          </span>
          Back to home
        </Link>
      </div>
    </section>
  )
}
