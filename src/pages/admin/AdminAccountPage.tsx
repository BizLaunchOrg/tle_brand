import { useEffect, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
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
import {
  DEFAULT_DELIVERY_FEE_NGN,
  DEFAULT_PROCESSING_FEE_NGN,
  fetchShopFees,
  updateShopFees,
} from '../../lib/shopSettings.ts'

const formatNaira = (n: number) => `₦${Math.round(n).toLocaleString()}`

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

  const [deliveryFee, setDeliveryFee] = useState(String(DEFAULT_DELIVERY_FEE_NGN))
  const [processingFee, setProcessingFee] = useState(String(DEFAULT_PROCESSING_FEE_NGN))
  const [busyFees, setBusyFees] = useState(false)
  const [feesLoaded, setFeesLoaded] = useState(false)
  const [notifyEnabled, setNotifyEnabled] = useState(false)
  const [notifBusy, setNotifBusy] = useState(false)
  const [pushSubscribed, setPushSubscribed] = useState(false)

  const rawBase = import.meta.env.BASE_URL || '/'
  const adminInstallHref = `${rawBase.endsWith('/') ? rawBase : `${rawBase}/`}admin-install.html`.replace(
    /([^:]\/)\/+/g,
    '$1',
  )

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

  useEffect(() => {
    let on = true
    void (async () => {
      const fees = await fetchShopFees()
      if (!on) return
      setDeliveryFee(String(fees.deliveryFeeNgn))
      setProcessingFee(String(fees.processingFeeNgn))
      setFeesLoaded(true)
    })()
    return () => {
      on = false
    }
  }, [])

  const surface = ad(
    theme,
    'rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm sm:p-6',
    'rounded-2xl border border-neutral-700/90 bg-neutral-900/40 p-5 shadow-sm sm:p-6',
  )
  const input = ad(
    theme,
    'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[13px] outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
    'w-full rounded-xl border border-neutral-600 bg-neutral-950 px-3 py-2.5 text-[13px] text-neutral-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25',
  )
  const label = ad(
    theme,
    'mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500',
    'mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500',
  )
  const btn = ad(
    theme,
    'rounded-xl bg-emerald-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-700 disabled:opacity-50',
    'rounded-xl bg-emerald-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-md shadow-emerald-900/25 transition hover:bg-emerald-500 disabled:opacity-50',
  )
  const muted = ad(theme, 'text-stone-500', 'text-neutral-500')
  const heading = ad(theme, 'text-2xl font-bold tracking-tight text-stone-900', 'text-2xl font-bold tracking-tight text-white')

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

  const onSaveFees = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    const d = Math.round(Number(deliveryFee.replace(/[^\d]/g, '')) || 0)
    const p = Math.round(Number(processingFee.replace(/[^\d]/g, '')) || 0)
    if (d < 0 || p < 0 || d > 50_000_000 || p > 50_000_000) {
      setError('Enter sensible whole-naira amounts (0–50,000,000).')
      return
    }
    setBusyFees(true)
    const res = await updateShopFees(d, p)
    setBusyFees(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setNotice('Checkout fees saved. New checkouts use these amounts.')
  }

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

  return (
    <div className={adminFont() + ' mx-auto w-full max-w-lg pb-10'}>
      <h1 className={heading}>Account</h1>
      <p className={muted + ' mt-1 text-[14px] leading-relaxed'}>Sign-in, passwords, store checkout fees, and alerts.</p>

      {error ? (
        <p
          className={
            'mt-6 rounded-2xl border px-4 py-3 text-[13px] font-medium ' +
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
            'mt-6 rounded-2xl border px-4 py-3 text-[13px] font-medium ' +
            ad(theme, 'border-emerald-200 bg-emerald-50 text-emerald-900', 'border-emerald-800/50 bg-emerald-950/40 text-emerald-200')
          }
          role="status"
        >
          {notice}
        </p>
      ) : null}

      <div id="admin-push" className={surface + ' mt-6 scroll-mt-24 space-y-3'}>
        <h2 className={ad(theme, 'text-[16px] font-bold text-stone-900', 'text-[16px] font-bold text-neutral-100')}>
          Notifications
        </h2>
        <p className={muted + ' text-[13px] leading-relaxed'}>New orders and makeup bookings.</p>
        <button
          type="button"
          disabled={notifBusy}
          onClick={() => void onNotifications()}
          className={btn + ' w-full py-3.5 text-[15px] sm:w-auto sm:py-2.5 sm:text-[13px]'}
        >
          {notifBusy ? 'Please wait…' : notificationsActive ? 'Turn off notifications' : 'Allow notifications'}
        </button>
        <p className={muted + ' mt-3 text-[12px] leading-relaxed'}>
          <span className={ad(theme, 'font-semibold text-stone-700', 'font-semibold text-neutral-200')}>
            iPhone home screen:
          </span>{' '}
          if Share → Add to Home Screen keeps opening the shop instead of admin, open{' '}
          <a
            href={adminInstallHref}
            className={ad(
              theme,
              'font-semibold text-emerald-700 underline decoration-emerald-700/30 underline-offset-2',
              'font-semibold text-emerald-400 underline decoration-emerald-400/30 underline-offset-2',
            )}
          >
            admin-install.html
          </a>{' '}
          in Safari, stay on that page, then use Add to Home Screen from there.
        </p>
      </div>

      <form onSubmit={onSaveFees} className={surface + ' mt-8 space-y-5'}>
        <div>
          <h2 className={ad(theme, 'text-[16px] font-bold text-stone-900', 'text-[16px] font-bold text-neutral-100')}>Checkout fees</h2>
          <p className={muted + ' mt-1 text-[13px] leading-relaxed'}>
            Flat amounts added to every website order (delivery + processing). Stored in the database; checkout and receipts use these values.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={label}>Delivery (₦)</span>
            <input
              type="text"
              inputMode="numeric"
              className={input}
              value={deliveryFee}
              disabled={!feesLoaded}
              onChange={(e) => setDeliveryFee(e.target.value)}
              autoComplete="off"
            />
            <p className={muted + ' mt-1 text-[11px]'}>Example: {formatNaira(DEFAULT_DELIVERY_FEE_NGN)}</p>
          </label>
          <label>
            <span className={label}>Processing (₦)</span>
            <input
              type="text"
              inputMode="numeric"
              className={input}
              value={processingFee}
              disabled={!feesLoaded}
              onChange={(e) => setProcessingFee(e.target.value)}
              autoComplete="off"
            />
            <p className={muted + ' mt-1 text-[11px]'}>Example: {formatNaira(DEFAULT_PROCESSING_FEE_NGN)}</p>
          </label>
        </div>
        <button type="submit" disabled={busyFees || !feesLoaded} className={btn + ' w-full sm:w-auto'}>
          {busyFees ? 'Saving…' : 'Save checkout fees'}
        </button>
      </form>

      <form onSubmit={onEmail} className={surface + ' mt-6 space-y-4'}>
        <h2 className={ad(theme, 'text-[16px] font-bold text-stone-900', 'text-[16px] font-bold text-neutral-100')}>Email</h2>
        <label>
          <span className={label}>Address</span>
          <input type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <button type="submit" disabled={busyEmail} className={btn}>
          {busyEmail ? 'Updating…' : 'Update email'}
        </button>
      </form>

      <form onSubmit={onPassword} className={surface + ' mt-6 space-y-4'}>
        <h2 className={ad(theme, 'text-[16px] font-bold text-stone-900', 'text-[16px] font-bold text-neutral-100')}>Password</h2>
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
