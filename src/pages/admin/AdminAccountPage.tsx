import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getSupabase } from '../../lib/supabaseClient'
import { isSupabaseConfigured, mapSupabaseAuthError } from '../../lib/mapSupabaseAuthError'
import { useAuth } from '../../context/AuthContext'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { ad, adminFont } from './adminUi.ts'
import {
  getAdminBrowserNotifyEnabled,
  setAdminBrowserNotifyEnabled,
} from '../../lib/adminBrowserNotifications.ts'
import {
  getExistingPushSubscription,
  getVapidPublicKeyForPush,
  isPushApiSupported,
  subscribeAdminPush,
  syncAdminWebPushLocalFromBrowser,
  unsubscribeAdminPush,
} from '../../lib/adminPushSubscribe.ts'

export function AdminAccountPage() {
  const { user } = useAuth()
  const { theme } = useAdminTheme()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busyEmail, setBusyEmail] = useState(false)
  const [busyPw, setBusyPw] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notifyEnabled, setNotifyEnabled] = useState(false)
  const [notifBusy, setNotifBusy] = useState(false)
  const [pushSubscribed, setPushSubscribed] = useState(false)

  useEffect(() => {
    if (user?.email) setEmail(user.email)
  }, [user?.email])

  useEffect(() => {
    setNotifyEnabled(getAdminBrowserNotifyEnabled())
  }, [])

  useEffect(() => {
    if (location.hash !== '#admin-push') return
    window.requestAnimationFrame(() => {
      document.getElementById('admin-push')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [location.hash])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await syncAdminWebPushLocalFromBrowser()
      const sub = await getExistingPushSubscription()
      if (!cancelled) setPushSubscribed(!!sub)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const shell = ad(theme, 'min-h-[calc(100vh-4rem)] bg-stone-100/90', 'min-h-[calc(100vh-4rem)] bg-neutral-950')
  const listCard = ad(
    theme,
    'overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm',
    'overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/80 shadow-sm',
  )
  const rowHover = ad(theme, 'transition-colors hover:bg-stone-50', 'transition-colors hover:bg-neutral-800/40')
  const chevron = ad(theme, 'material-symbols-outlined shrink-0 text-[22px] text-stone-300', 'material-symbols-outlined shrink-0 text-[22px] text-neutral-600')
  const titleSm = ad(theme, 'text-[11px] font-bold uppercase tracking-[0.2em] text-stone-400', 'text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500')
  const rowTitle = ad(theme, 'text-[16px] font-semibold leading-snug text-stone-900', 'text-[16px] font-semibold leading-snug text-neutral-100')
  const rowSub = ad(theme, 'mt-1 text-[13px] leading-snug text-stone-500', 'mt-1 text-[13px] leading-snug text-neutral-400')
  const label = ad(theme, 'mb-1.5 block text-[11px] font-semibold text-stone-500', 'mb-1.5 block text-[11px] font-semibold text-neutral-400')
  const input = ad(
    theme,
    'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30',
    'w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-[15px] text-neutral-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30',
  )
  const btn = ad(
    theme,
    'inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-600 px-5 text-[13px] font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50',
    'inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-600 px-5 text-[13px] font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50',
  )
  const muted = ad(theme, 'text-stone-500', 'text-neutral-400')
  const pageTitle = ad(theme, 'text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl', 'text-2xl font-bold tracking-tight text-white sm:text-3xl')

  const notificationsActive = pushSubscribed || notifyEnabled

  const onNotifications = async () => {
    setError(null)
    setNotice(null)
    if (notificationsActive) {
      setNotifBusy(true)
      await unsubscribeAdminPush()
      setAdminBrowserNotifyEnabled(false)
      setNotifyEnabled(false)
      const sub = await getExistingPushSubscription()
      setPushSubscribed(!!sub)
      await syncAdminWebPushLocalFromBrowser()
      setNotifBusy(false)
      setNotice('Notifications are off.')
      return
    }
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotice('This browser does not support notifications.')
      return
    }
    setNotifBusy(true)
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') {
      setNotifBusy(false)
      setNotice('Notifications stay off until you allow them in your browser or phone settings.')
      return
    }
    const tryPush = Boolean(getVapidPublicKeyForPush()) && isPushApiSupported()
    if (tryPush) {
      const res = await subscribeAdminPush()
      if (res.ok) {
        setPushSubscribed(true)
        setNotifBusy(false)
        setNotice('Notifications are on.')
        return
      }
    }
    setAdminBrowserNotifyEnabled(true)
    setNotifyEnabled(true)
    setPushSubscribed(!!(await getExistingPushSubscription()))
    setNotifBusy(false)
    setNotice('Notifications are on while you keep admin open in a tab.')
  }

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
      setError(mapSupabaseAuthError(err, 'account_email'))
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
      setError(mapSupabaseAuthError(err, 'account_password'))
      return
    }
    setNewPassword('')
    setConfirmPassword('')
    setNotice('Password updated.')
  }

  const divide = ad(theme, 'divide-y divide-stone-100', 'divide-y divide-neutral-800/80')

  return (
    <div className={adminFont() + ' ' + shell}>
      <div className="mx-auto w-full max-w-lg px-4 py-8 sm:max-w-xl sm:px-6 lg:max-w-2xl lg:py-12">
        <h1 className={pageTitle}>Settings</h1>
        <p className={muted + ' mt-2 text-[15px]'}>Store options and your admin sign-in.</p>

        {error ? (
          <p
            className={
              'mt-6 rounded-xl border px-4 py-3 text-[13px] font-medium ' +
              ad(theme, 'border-rose-200 bg-rose-50 text-rose-900', 'border-rose-900/40 bg-rose-950/30 text-rose-200')
            }
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {notice ? (
          <p
            className={
              'mt-6 rounded-xl border px-4 py-3 text-[13px] font-medium ' +
              ad(theme, 'border-emerald-200 bg-emerald-50 text-emerald-900', 'border-emerald-800/50 bg-emerald-950/40 text-emerald-200')
            }
            role="status"
          >
            {notice}
          </p>
        ) : null}

        <p className={titleSm + ' mt-10 mb-2 px-1'}>Store</p>
        <nav className={listCard + ' ' + divide} aria-label="Store settings">
          <Link
            to="/admin/account/checkout"
            className={'flex min-h-[4.5rem] items-center gap-4 px-5 py-4 no-underline ' + rowHover}
          >
            <div className="min-w-0 flex-1">
              <p className={rowTitle}>Shop checkout</p>
              <p className={rowSub}>Delivery fees, mainland &amp; island, pickup points</p>
            </div>
            <span className={chevron} aria-hidden>
              chevron_right
            </span>
          </Link>
        </nav>

        <p className={titleSm + ' mt-10 mb-2 px-1'}>Alerts</p>
        <div id="admin-push" className={listCard + ' scroll-mt-24'}>
          <div className="flex min-h-[4.5rem] items-center gap-4 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className={rowTitle}>Notifications</p>
              <p className={rowSub}>New orders and makeup bookings</p>
            </div>
            <button
              type="button"
              disabled={notifBusy}
              onClick={() => void onNotifications()}
              className={
                btn +
                ' shrink-0 rounded-full px-4 py-2 text-[12px] ' +
                (notificationsActive ? ' opacity-90' : '')
              }
            >
              {notifBusy ? '…' : notificationsActive ? 'Off' : 'On'}
            </button>
          </div>
        </div>

        <p className={titleSm + ' mt-10 mb-2 px-1'}>Sign-in</p>
        <div className={listCard}>
          <form onSubmit={onEmail} className={'border-b px-5 py-5 ' + ad(theme, 'border-stone-100', 'border-neutral-800/80')}>
            <label className="block">
              <span className={label}>Email</span>
              <input type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </label>
            <button type="submit" disabled={busyEmail} className={btn + ' mt-4 w-full sm:w-auto'}>
              {busyEmail ? 'Updating…' : 'Update email'}
            </button>
          </form>
          <form onSubmit={onPassword} className="px-5 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block min-w-0">
                <span className={label}>New password</span>
                <input
                  type="password"
                  className={input}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
              <label className="block min-w-0">
                <span className={label}>Confirm</span>
                <input
                  type="password"
                  className={input}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
            </div>
            <button type="submit" disabled={busyPw} className={btn + ' mt-4 w-full sm:w-auto'}>
              {busyPw ? 'Saving…' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
