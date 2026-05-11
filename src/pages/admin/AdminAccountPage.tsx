import { useEffect, useState, type FormEvent } from 'react'
import { getSupabase } from '../../lib/supabaseClient'
import { isSupabaseConfigured } from '../../lib/mapSupabaseAuthError'
import { useAuth } from '../../context/AuthContext'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { ad, adminFont } from './adminUi.ts'

export function AdminAccountPage() {
  const { user } = useAuth()
  const { theme } = useAdminTheme()
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busyEmail, setBusyEmail] = useState(false)
  const [busyPw, setBusyPw] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user?.email) setEmail(user.email)
  }, [user?.email])

  const surface = ad(
    theme,
    'rounded-sm border border-stone-200 bg-white p-5 sm:p-6',
    'rounded-sm border border-neutral-800 bg-[#141414] p-5 sm:p-6',
  )
  const input = ad(
    theme,
    'w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-[13px] outline-none focus:border-stone-500',
    'w-full rounded-sm border border-neutral-600 bg-neutral-900 px-3 py-2 text-[13px] text-neutral-100 outline-none focus:border-neutral-500',
  )
  const label = ad(
    theme,
    'mb-1 block text-[10px] font-semibold uppercase tracking-wider text-stone-500',
    'mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neutral-500',
  )
  const btn = ad(
    theme,
    'rounded-sm bg-stone-900 px-4 py-2.5 text-[13px] font-medium text-white hover:bg-stone-800 disabled:opacity-50',
    'rounded-sm bg-neutral-100 px-4 py-2.5 text-[13px] font-medium text-neutral-900 hover:bg-white disabled:opacity-50',
  )
  const muted = ad(theme, 'text-stone-500', 'text-neutral-500')

  const onEmail = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured.')
      return
    }
    const next = email.trim().toLowerCase()
    if (!next || next === user?.email) {
      setNotice('No change.')
      return
    }
    setBusyEmail(true)
    const { error: err } = await getSupabase().auth.updateUser({ email: next })
    setBusyEmail(false)
    if (err) {
      setError(err.message || 'Could not update email.')
      return
    }
    setNotice('Confirm the new address from your inbox.')
  }

  const onPassword = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured.')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setBusyPw(true)
    const { error: err } = await getSupabase().auth.updateUser({ password: newPassword })
    setBusyPw(false)
    if (err) {
      setError(err.message || 'Could not update password.')
      return
    }
    setNewPassword('')
    setConfirmPassword('')
    setNotice('Password updated.')
  }

  return (
    <div className={adminFont() + ' mx-auto max-w-md'}>
      <h1
        className={ad(
          theme,
          'text-xl font-semibold tracking-tight text-stone-900',
          'text-xl font-semibold tracking-tight text-neutral-100',
        )}
      >
        Account
      </h1>
      <p className={muted + ' mt-1 text-[13px]'}>Supabase auth · same session as the store.</p>

      {error ? (
        <p className="mt-6 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-900" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-6 rounded-sm border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-900" role="status">
          {notice}
        </p>
      ) : null}

      <form onSubmit={onEmail} className={surface + ' mt-8 space-y-4'}>
        <h2 className={ad(theme, 'text-[15px] font-semibold text-stone-900', 'text-[15px] font-semibold text-neutral-100')}>
          Email
        </h2>
        <label>
          <span className={label}>Address</span>
          <input type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <button type="submit" disabled={busyEmail} className={btn}>
          {busyEmail ? 'Updating…' : 'Update email'}
        </button>
      </form>

      <form onSubmit={onPassword} className={surface + ' mt-6 space-y-4'}>
        <h2 className={ad(theme, 'text-[15px] font-semibold text-stone-900', 'text-[15px] font-semibold text-neutral-100')}>
          Password
        </h2>
        <label>
          <span className={label}>New</span>
          <input
            type="password"
            className={input}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <label>
          <span className={label}>Confirm</span>
          <input
            type="password"
            className={input}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <button type="submit" disabled={busyPw} className={btn}>
          {busyPw ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
