import { useEffect, useState, type FormEvent } from 'react'
import { getSupabase } from '../../lib/supabaseClient'
import { isSupabaseConfigured, mapSupabaseAuthError } from '../../lib/mapSupabaseAuthError'
import { useAuth } from '../../context/AuthContext'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { ad, adminFont } from './adminUi.ts'
import {
  getAdminBrowserNotifyEnabled,
  requestNotificationPermission,
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
  const [notifyBusy, setNotifyBusy] = useState(false)
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)

  useEffect(() => {
    if (user?.email) setEmail(user.email)
  }, [user?.email])

  useEffect(() => {
    setNotifyEnabled(getAdminBrowserNotifyEnabled())
  }, [])

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

  const notifySupported = typeof window !== 'undefined' && 'Notification' in window
  const notifyPermission = notifySupported ? Notification.permission : 'denied'

  const onToggleNotify = async () => {
    setError(null)
    setNotice(null)
    if (!notifySupported) {
      setError('This browser does not support notifications.')
      return
    }
    if (notifyEnabled) {
      setAdminBrowserNotifyEnabled(false)
      setNotifyEnabled(false)
      setNotice('Browser alerts are off. Badges in the sidebar still update while you are in admin.')
      return
    }
    setNotifyBusy(true)
    const perm = await requestNotificationPermission()
    setNotifyBusy(false)
    if (perm !== 'granted') {
      setError(
        'Permission was not granted. On mobile, check site settings for this store and allow notifications.',
      )
      setAdminBrowserNotifyEnabled(false)
      setNotifyEnabled(false)
      return
    }
    setAdminBrowserNotifyEnabled(true)
    setNotifyEnabled(true)
    setNotice('Tab alerts on. You will see pings while admin stays open in a tab. For alerts when the browser is closed, use phone push above.')
  }

  const pushConfigured = Boolean(getVapidPublicKeyForPush())
  const pushApiOk = typeof window !== 'undefined' && isPushApiSupported()

  const onTogglePush = async () => {
    setError(null)
    setNotice(null)
    if (pushSubscribed) {
      setPushBusy(true)
      const res = await unsubscribeAdminPush()
      setPushBusy(false)
      if (!res.ok) {
        setError(res.message)
        return
      }
      setPushSubscribed(false)
      setNotice('Phone push is off for this device.')
      return
    }
    if (!pushConfigured) {
      setError('This build is missing VITE_VAPID_PUBLIC_KEY. Add the public VAPID key in your host env and redeploy.')
      return
    }
    if (!pushApiOk) {
      setError(
        'This browser does not support Web Push here. Try Chrome or Edge on Android, or install the site to the home screen on iOS 16.4+.',
      )
      return
    }
    setPushBusy(true)
    const res = await subscribeAdminPush()
    setPushBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setPushSubscribed(true)
    setNotice(
      'Phone push is on for this device. New orders and makeup bookings are sent through Google or Apple push services (usually within seconds, not guaranteed instant).',
    )
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

      <div className={surface + ' mt-8 space-y-4'}>
        <div>
          <h2 className={ad(theme, 'text-[16px] font-bold text-stone-900', 'text-[16px] font-bold text-neutral-100')}>
            Phone notifications (Web Push)
          </h2>
          <p className={muted + ' mt-1 text-[13px] leading-relaxed'}>
            Same delivery path as most apps: your phone shows a banner when a new order or makeup booking is saved,
            even if the store tab is closed (after you enable this and your developer connects Supabase webhooks). Tap
            the banner to open that order or booking. This uses a tiny service worker — not a heavy offline cache.
          </p>
        </div>
        {!pushConfigured ? (
          <p className={'text-[12px] font-medium ' + ad(theme, 'text-amber-800', 'text-amber-200')}>
            Waiting on configuration: set <span className="font-mono">VITE_VAPID_PUBLIC_KEY</span> in production, run the
            database migration for <span className="font-mono">push_subscriptions</span>, deploy the Edge Function{' '}
            <span className="font-mono">admin-push-hook</span>, and add two Database Webhooks (see comments in{' '}
            <span className="font-mono">supabase/functions/admin-push-hook/index.ts</span>).
          </p>
        ) : null}
        <p className={'text-[12px] font-medium ' + muted}>
          This device: {pushSubscribed ? 'subscribed' : 'not subscribed'}
          {pushApiOk ? '' : ' — push API not available in this context.'}
        </p>
        <button
          type="button"
          disabled={pushBusy || !pushConfigured || !pushApiOk}
          onClick={() => void onTogglePush()}
          className={btn + ' w-full sm:w-auto'}
        >
          {pushBusy ? 'Working…' : pushSubscribed ? 'Turn off phone push on this device' : 'Turn on phone push on this device'}
        </button>
      </div>

      <div className={surface + ' mt-6 space-y-4'}>
        <div>
          <h2 className={ad(theme, 'text-[16px] font-bold text-stone-900', 'text-[16px] font-bold text-neutral-100')}>
            Tab-only alerts (fallback)
          </h2>
          <p className={muted + ' mt-1 text-[13px] leading-relaxed'}>
            Optional extra pings using the regular browser notification API while an admin tab is open or in the
            background. Turned off automatically when phone push is active on this device so you do not get duplicates.
          </p>
        </div>
        <p className={'text-[12px] font-medium ' + muted}>
          Status:{' '}
          {!notifySupported
            ? 'Not supported in this browser.'
            : notifyPermission === 'granted'
              ? 'Permission granted.'
              : notifyPermission === 'denied'
                ? 'Blocked — allow notifications for this site in browser settings.'
                : 'Not asked yet — use the button below.'}
        </p>
        <button type="button" disabled={notifyBusy || !notifySupported} onClick={() => void onToggleNotify()} className={btn + ' w-full sm:w-auto'}>
          {notifyBusy ? 'Working…' : notifyEnabled ? 'Turn off tab alerts' : 'Turn on tab alerts'}
        </button>
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
