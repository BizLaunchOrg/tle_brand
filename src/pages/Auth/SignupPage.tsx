import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

export function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/shop'
  const safeFrom = from.startsWith('/') ? from : '/shop'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const result = await signup(name, email, password)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      if (result.requiresEmailConfirmation) {
        toast.success(result.message ?? 'Account created. Check your email to confirm.')
        navigate('/login', {
          replace: true,
          state: {
            from: safeFrom,
            authNotice: result.message ?? 'Account created. Check your email to confirm your account.',
          },
        })
        return
      }
      toast.success('Account created successfully')
      navigate(safeFrom, { replace: true })
    } catch {
      toast.error('Unable to create account right now. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="min-h-0 flex-1 bg-tle-cream/60 px-4 pb-20 pt-28 sm:px-6 md:px-10 md:pt-32 lg:px-16">
      <div className="mx-auto w-full max-w-[440px]">
        <div className="mb-3 flex items-center gap-3">
          <div className="h-px w-[22px] bg-tle-gold" />
          <span className="text-[10px] font-semibold tracking-[0.22em] text-tle-gold uppercase">Account</span>
        </div>
        <h1 className="font-sans text-[clamp(1.75rem,4vw,2.25rem)] font-semibold text-tle-ink">Create account</h1>
        <p className="mt-2 text-sm text-tle-muted">Join TLE-BRAND to save favorites and checkout with ease.</p>

        <form
          onSubmit={onSubmit}
          className="mt-10 rounded-[28px] border border-black/8 bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] sm:p-8"
        >
          <label className="block">
            <span className="mb-2 block text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">
              Full name
            </span>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border-[1.5px] border-black/10 bg-white px-4 py-3 text-sm text-tle-ink outline-none transition-colors placeholder:text-tle-faint focus:border-tle-pink"
              placeholder="Ada Lovelace"
              required
            />
          </label>

          <label className="mt-5 block">
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border-[1.5px] border-black/10 bg-white px-4 py-3 text-sm text-tle-ink outline-none transition-colors placeholder:text-tle-faint focus:border-tle-pink"
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
          </label>

          <label className="mt-5 block">
            <span className="mb-2 block text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">
              Confirm password
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-2xl border-[1.5px] border-black/10 bg-white px-4 py-3 text-sm text-tle-ink outline-none transition-colors placeholder:text-tle-faint focus:border-tle-pink"
              placeholder="Repeat password"
              required
              minLength={6}
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="mt-8 w-full rounded-full bg-tle-charcoal py-3.5 text-[12px] font-bold tracking-[0.12em] text-white uppercase transition-colors hover:bg-tle-pink disabled:opacity-60"
          >
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-tle-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-tle-pink no-underline hover:text-tle-deep" state={{ from: safeFrom }}>
            Sign in
          </Link>
        </p>

        <Link
          to="/"
          className="mt-6 flex items-center justify-center gap-2 text-[13px] font-semibold text-tle-muted no-underline hover:text-tle-pink"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">arrow_back</span>
          Back to home
        </Link>
      </div>
    </section>
  )
}
