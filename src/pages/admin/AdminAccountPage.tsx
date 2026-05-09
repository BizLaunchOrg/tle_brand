import { useEffect, useState, type FormEvent } from 'react'
import { getSupabase } from '../../lib/supabaseClient'
import { isSupabaseConfigured } from '../../lib/mapSupabaseAuthError'
import { useAuth } from '../../context/AuthContext'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { ad } from './adminUi.ts'

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

  const card = ad(
    theme,
    'rounded-xl border border-zinc-200/90 bg-white p-6 shadow-sm',
    'rounded-xl border border-zinc-800/90 bg-[#0c0c0e] p-6',
  )
  const input = ad(
    theme,
    'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400',
    'w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-zinc-500',
  )
  const btnPrimary = ad(
    theme,
    'rounded-lg bg-zinc-900 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50',
    'rounded-lg bg-zinc-100 px-4 py-2.5 text-[13px] font-semibold text-zinc-900 transition-colors hover:bg-white disabled:opacity-50',
  )

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
      setNotice('Email unchanged.')
      return
    }
    setBusyEmail(true)
    const { error: err } = await getSupabase().auth.updateUser({ email: next })
    setBusyEmail(false)
    if (err) {
      setError(err.message || 'Could not update email.')
      return
    }
    setNotice('Check your inbox to confirm the new email address.')
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
    <div className="mx-auto max-w-lg">
      <h1 className="font-sans text-2xl font-semibold tracking-tight">Account</h1>
      <p className={ad(theme, 'mt-1 text-sm text-zinc-500', 'mt-1 text-sm text-zinc-500')}>
        Same session as the storefront. Changes apply to your Supabase auth user.
      </p>

      {error ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
          {notice}
        </p>
      ) : null}

      <form onSubmit={onEmail} className={card + ' mt-8 space-y-4'}>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-zinc-500">mail</span>
          <h2 className="text-[15px] font-semibold tracking-tight">Email</h2>
        </div>
        <label>
          <span className={ad(theme, 'mb-1.5 block text-[10px] font-bold text-zinc-500 uppercase', '')}>Address</span>
          <input type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <button type="submit" disabled={busyEmail} className={btnPrimary}>
          {busyEmail ? 'Updating…' : 'Update email'}
        </button>
      </form>

      <form onSubmit={onPassword} className={card + ' mt-6 space-y-4'}>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-zinc-500">key</span>
          <h2 className="text-[15px] font-semibold tracking-tight">Password</h2>
        </div>
        <label>
          <span className={ad(theme, 'mb-1.5 block text-[10px] font-bold text-zinc-500 uppercase', '')}>New password</span>
          <input
            type="password"
            className={input}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <label>
          <span className={ad(theme, 'mb-1.5 block text-[10px] font-bold text-zinc-500 uppercase', '')}>Confirm</span>
          <input
            type="password"
            className={input}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <button type="submit" disabled={busyPw} className={btnPrimary}>
          {busyPw ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
