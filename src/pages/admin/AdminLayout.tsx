import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ScrollToTop } from '../../components/ScrollToTop.tsx'
import { useAuth } from '../../context/AuthContext'
import { AdminThemeProvider, useAdminTheme } from './AdminThemeContext.tsx'
import { ad, adminFont } from './adminUi.ts'
import {
  getAdminBrowserNotifyEnabled,
  markBookingNotified,
  markOrderNotified,
  showMakeupBookingNotification,
  showOrderNotification,
  wasBookingAlreadyNotified,
  wasOrderAlreadyNotified,
} from '../../lib/adminBrowserNotifications.ts'
import { getAdminWebPushActive } from '../../lib/adminPushLocalFlag.ts'
import { syncAdminWebPushLocalFromBrowser } from '../../lib/adminPushSubscribe.ts'
import {
  countNewMakeupBookingsSince,
  ensureAdminMakeupBookingsSeenBaseline,
  fetchNewMakeupBookingIdsSince,
  getAdminMakeupBookingsLastSeenAt,
  markAdminMakeupBookingsSeenNow,
} from '../../lib/adminMakeupAlerts.ts'
import {
  countNewOrdersSince,
  ensureAdminOrdersSeenBaseline,
  fetchNewOrderIdsSince,
  getAdminOrdersLastSeenAt,
  markAdminOrdersSeenNow,
} from '../../lib/adminOrderAlerts.ts'

function NavItem({
  to,
  end,
  label,
  theme,
  icon,
  badge,
}: {
  to: string
  end?: boolean
  label: string
  theme: 'light' | 'dark'
  icon: string
  badge?: number
}) {
  return (
    <NavLink to={to} end={end} className="block no-underline">
      {({ isActive }) => (
        <span
          className={[
            'flex items-center gap-3 rounded-xl py-2.5 pl-3 pr-3 text-[13px] font-medium leading-snug transition-colors',
            isActive
              ? ad(
                  theme,
                  'bg-emerald-50 text-emerald-900 shadow-sm shadow-emerald-900/5',
                  'bg-emerald-950/45 text-emerald-50',
                )
              : ad(
                  theme,
                  'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
                  'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-100',
                ),
          ].join(' ')}
        >
          <span
            className={[
              'material-symbols-outlined shrink-0 text-[20px] font-light leading-none',
              isActive
                ? ad(theme, 'text-emerald-600', 'text-emerald-400')
                : ad(theme, 'text-stone-400', 'text-neutral-500'),
            ].join(' ')}
            aria-hidden
          >
            {icon}
          </span>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {typeof badge === 'number' && badge > 0 ? (
            <span
              className={
                'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ' +
                ad(theme, 'bg-rose-600 text-white', 'bg-rose-500 text-white')
              }
            >
              {badge > 99 ? '99+' : badge}
            </span>
          ) : null}
        </span>
      )}
    </NavLink>
  )
}

function MobileNavItem({
  to,
  end,
  label,
  icon,
  theme,
  dot,
}: {
  to: string
  end?: boolean
  label: string
  icon: string
  theme: 'light' | 'dark'
  dot?: boolean
}) {
  return (
    <NavLink to={to} end={end} className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2.5 no-underline">
      {({ isActive }) => (
        <>
          <span className="relative inline-flex">
            <span
              className={[
                'material-symbols-outlined text-[22px] font-light leading-none',
                isActive
                  ? ad(theme, 'text-emerald-600', 'text-emerald-400')
                  : ad(theme, 'text-stone-400', 'text-neutral-500'),
              ].join(' ')}
            >
              {icon}
            </span>
            {dot ? (
              <span
                className={
                  'absolute -top-0.5 -right-1 size-2 rounded-full bg-rose-500 ring-2 ' +
                  ad(theme, 'ring-stone-100', 'ring-[#101412]')
                }
                aria-hidden
              />
            ) : null}
          </span>
          <span
            className={[
              'max-w-full truncate px-0.5 text-[10px] font-semibold tracking-wide uppercase',
              isActive
                ? ad(theme, 'text-emerald-800', 'text-emerald-300')
                : ad(theme, 'text-stone-500', 'text-neutral-500'),
            ].join(' ')}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}

function AdminLayoutInner() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useAdminTheme()
  const location = useLocation()
  const [orderAlertCount, setOrderAlertCount] = useState(0)
  const [makeupAlertCount, setMakeupAlertCount] = useState(0)
  const storeOrigin = typeof window !== 'undefined' ? window.location.origin : ''

  const shell = [
    adminFont(),
    ad(
      theme,
      'min-h-svh bg-[#f0f3f1] text-stone-900 antialiased [font-feature-settings:normal]',
      'min-h-svh bg-[#0c0f0d] text-neutral-200 antialiased [font-feature-settings:normal]',
    ),
  ].join(' ')

  const sidebar = ad(theme, 'border-stone-200/90 bg-white shadow-[1px_0_0_rgba(0,0,0,0.04)]', 'border-neutral-800 bg-[#101412]')

  const mainPad =
    'min-w-0 flex-1 px-4 py-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-5 sm:py-6 lg:px-8 lg:py-8 lg:pb-10'

  const initials = (user?.name || user?.email || '?')
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const copyStoreLink = async () => {
    try {
      await navigator.clipboard.writeText(storeOrigin)
    } catch {
      /* ignore */
    }
  }

  /** PWA “Add to Home Screen” uses manifest start_url — point merchants at /admin while they are in admin. */
  useEffect(() => {
    if (typeof document === 'undefined') return
    const link = document.getElementById('tle-web-manifest') as HTMLLinkElement | null
    if (!link) return
    const raw = import.meta.env.BASE_URL || '/'
    const prefix = raw.endsWith('/') ? raw : `${raw}/`
    const storeManifest = `${prefix}manifest.webmanifest`.replace(/([^:]\/)\/+/g, '$1')
    const adminManifest = `${prefix}manifest-admin.webmanifest`.replace(/([^:]\/)\/+/g, '$1')
    link.setAttribute('href', adminManifest)
    return () => {
      link.setAttribute('href', storeManifest)
    }
  }, [])

  useEffect(() => {
    ensureAdminOrdersSeenBaseline()
    ensureAdminMakeupBookingsSeenBaseline()
    void syncAdminWebPushLocalFromBrowser()
  }, [])

  useEffect(() => {
    const p = location.pathname
    if (p === '/admin/orders' || p.startsWith('/admin/orders/') || p === '/admin/transactions') {
      markAdminOrdersSeenNow()
      setOrderAlertCount(0)
    }
    if (p === '/admin/makeup-bookings') {
      markAdminMakeupBookingsSeenNow()
      setMakeupAlertCount(0)
    }
  }, [location.pathname])

  useEffect(() => {
    const refresh = async () => {
      const orderSince = getAdminOrdersLastSeenAt()
      const makeupSince = getAdminMakeupBookingsLastSeenAt()
      if (orderSince) {
        const n = await countNewOrdersSince(orderSince)
        setOrderAlertCount(n)
      }
      if (makeupSince) {
        const m = await countNewMakeupBookingsSince(makeupSince)
        setMakeupAlertCount(m)
      }

      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        !getAdminWebPushActive() &&
        getAdminBrowserNotifyEnabled() &&
        Notification.permission === 'granted'
      ) {
        if (orderSince) {
          const orderIds = await fetchNewOrderIdsSince(orderSince)
          for (const id of orderIds) {
            if (!wasOrderAlreadyNotified(id)) {
              showOrderNotification(id)
              markOrderNotified(id)
            }
          }
        }
        if (makeupSince) {
          const bookingIds = await fetchNewMakeupBookingIdsSince(makeupSince)
          for (const id of bookingIds) {
            if (!wasBookingAlreadyNotified(id)) {
              showMakeupBookingNotification(id)
              markBookingNotified(id)
            }
          }
        }
      }
    }
    void refresh()
    const id = window.setInterval(() => void refresh(), 45_000)
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  return (
    <div className={shell}>
      <ScrollToTop />
      <div className="flex min-h-svh">
        <aside className={`sticky top-0 hidden h-svh w-[248px] shrink-0 flex-col border-r lg:flex ${sidebar}`}>
          <div className="px-4 pt-6 pb-5">
            <Link to="/admin" className="flex items-center gap-2.5 no-underline">
              <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-900/25">
                <span className="material-symbols-outlined text-[22px] font-normal leading-none">shopping_bag</span>
              </span>
              <span>
                <span className={ad(theme, 'block text-[15px] font-bold tracking-tight text-stone-900', 'block text-[15px] font-bold tracking-tight text-neutral-100')}>
                  TLE Brand
                </span>
                <span className={ad(theme, 'block text-[11px] text-emerald-700/90', 'block text-[11px] text-emerald-400/90')}>Admin</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center justify-between gap-2 px-4 pb-2">
            <p
              className={ad(
                theme,
                'text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400',
                'text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500',
              )}
            >
              Quick access
            </p>
            <Link
              to="/admin/orders"
              className={
                'relative flex size-9 shrink-0 items-center justify-center rounded-xl no-underline transition ' +
                ad(theme, 'text-stone-600 hover:bg-stone-100', 'text-neutral-300 hover:bg-neutral-800/80')
              }
              aria-label={orderAlertCount > 0 ? `${orderAlertCount} new orders or checkouts` : 'Orders (no new alerts)'}
            >
              <span className="material-symbols-outlined text-[22px] font-light">notifications</span>
              {orderAlertCount > 0 ? (
                <span
                  className={
                    'absolute -right-0.5 -top-0.5 flex min-w-[1.1rem] items-center justify-center rounded-full px-1 py-0.5 text-[9px] font-bold leading-none text-white ' +
                    ad(theme, 'bg-rose-600', 'bg-rose-500')
                  }
                >
                  {orderAlertCount > 99 ? '99+' : orderAlertCount}
                </span>
              ) : null}
            </Link>
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 px-3">
            <NavItem to="/admin" end label="Dashboard" theme={theme} icon="dashboard" />
            <NavItem to="/admin/customers" label="Customers" theme={theme} icon="group" />
            <NavItem to="/admin/makeup-bookings" label="Makeup requests" theme={theme} icon="face_retouching_natural" badge={makeupAlertCount} />
            <NavItem to="/admin/makeup-hours" label="Makeup hours" theme={theme} icon="schedule" />
            <NavItem to="/admin/orders" label="Orders" theme={theme} icon="receipt_long" badge={orderAlertCount} />
            <NavItem to="/admin/products" label="Products" theme={theme} icon="inventory_2" />
            <NavItem to="/admin/transactions" label="Transactions" theme={theme} icon="account_balance_wallet" badge={orderAlertCount} />
            <div className={ad(theme, 'my-2 mx-1 h-px bg-stone-100', 'my-2 mx-1 h-px bg-neutral-800')} />
            <NavItem to="/admin/account" label="Account" theme={theme} icon="person" />
          </nav>

          <div className={ad(theme, 'mt-auto border-t border-stone-100 px-4 py-4', 'mt-auto border-t border-neutral-800 px-4 py-4')}>
            <div className="flex items-center gap-2.5">
              <span
                className={ad(
                  theme,
                  'flex size-9 shrink-0 items-center justify-center rounded-full bg-stone-200 text-[11px] font-semibold text-stone-700',
                  'flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-[11px] font-semibold text-neutral-100',
                )}
              >
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={ad(
                    theme,
                    'truncate text-[11px] font-medium text-stone-800',
                    'truncate text-[11px] font-medium text-neutral-200',
                  )}
                  title={user?.email}
                >
                  {user?.email}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className={ad(
                  theme,
                  'flex size-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50',
                  'flex size-9 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800',
                )}
              >
                <span className="material-symbols-outlined text-[20px] font-light">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
              </button>
              <button
                type="button"
                onClick={() => void logout()}
                className={
                  'flex-1 rounded-xl py-2 text-center text-[12px] font-semibold ' +
                  ad(theme, 'bg-stone-100 text-stone-800 hover:bg-stone-200', 'bg-neutral-800 text-neutral-100 hover:bg-neutral-700')
                }
              >
                Sign out
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header
            className={ad(
              theme,
              'sticky top-0 z-30 border-b border-stone-200/90 bg-white/95 px-3 py-3 backdrop-blur-md lg:hidden',
              'sticky top-0 z-30 border-b border-neutral-800 bg-[#0c0f0d]/95 px-3 py-3 backdrop-blur-md lg:hidden',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={ad(theme, 'truncate text-[11px] font-medium text-stone-500', 'truncate text-[11px] font-medium text-neutral-500')}>
                  {storeOrigin.replace(/^https?:\/\//, '')}
                </p>
                <Link
                  to="/admin"
                  className={ad(
                    theme,
                    'mt-0.5 block truncate text-[15px] font-bold tracking-tight text-stone-900 no-underline',
                    'mt-0.5 block truncate text-[15px] font-bold tracking-tight text-neutral-100 no-underline',
                  )}
                >
                  TLE · Admin
                </Link>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                <Link
                  to="/admin/account#admin-push"
                  className={ad(
                    theme,
                    'rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-900 no-underline hover:bg-emerald-100',
                    'rounded-full border border-emerald-800/60 bg-emerald-950/40 px-3 py-1.5 text-[11px] font-semibold text-emerald-100 no-underline hover:bg-emerald-900/50',
                  )}
                >
                  Push alerts
                </Link>
                <button
                  type="button"
                  onClick={() => void copyStoreLink()}
                  className={ad(
                    theme,
                    'rounded-full border border-stone-200 px-3 py-1.5 text-[11px] font-semibold text-stone-700 hover:bg-stone-50',
                    'rounded-full border border-neutral-700 px-3 py-1.5 text-[11px] font-semibold text-neutral-200 hover:bg-neutral-800/60',
                  )}
                >
                  Share
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className={ad(
                  theme,
                  'flex size-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 hover:bg-stone-50',
                  'flex size-9 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800',
                )}
              >
                <span className="material-symbols-outlined text-[22px] font-light">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
              </button>
              <Link to="/admin/account" className="no-underline">
                <span
                  className={ad(
                    theme,
                    'flex size-8 items-center justify-center rounded-full bg-stone-200 text-[11px] font-bold text-stone-700',
                    'flex size-8 items-center justify-center rounded-full bg-neutral-700 text-[11px] font-bold text-neutral-200',
                  )}
                >
                  {initials}
                </span>
              </Link>
            </div>
          </header>

          <header
            className={ad(
              theme,
              'sticky top-0 z-20 hidden items-center justify-between gap-4 border-b border-stone-200/90 bg-white/95 px-6 py-3.5 backdrop-blur-md lg:flex',
              'sticky top-0 z-20 hidden items-center justify-between gap-4 border-b border-neutral-800 bg-[#101412]/95 px-6 py-3.5 backdrop-blur-md lg:flex',
            )}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                className={ad(
                  theme,
                  'flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2 text-left text-[12px] font-semibold text-stone-800 hover:bg-stone-100',
                  'flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900/60 px-3 py-2 text-left text-[12px] font-semibold text-neutral-100 hover:bg-neutral-800',
                )}
              >
                <span className="material-symbols-outlined text-[18px] font-light text-emerald-600">location_on</span>
                Main store
                <span className="material-symbols-outlined text-[16px] opacity-60">expand_more</span>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className={ad(
                  theme,
                  'flex size-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 hover:bg-stone-50',
                  'flex size-10 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800',
                )}
              >
                <span className="material-symbols-outlined text-[22px] font-light">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
              </button>
              <div
                className={ad(
                  theme,
                  'flex items-center gap-2 rounded-full border border-stone-200 py-1 pl-1 pr-3',
                  'flex items-center gap-2 rounded-full border border-neutral-700 py-1 pl-1 pr-3',
                )}
              >
                <span
                  className={ad(
                    theme,
                    'flex size-8 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-900',
                    'flex size-8 items-center justify-center rounded-full bg-emerald-900/50 text-[11px] font-bold text-emerald-200',
                  )}
                >
                  {initials}
                </span>
                <span className={ad(theme, 'max-w-[140px] truncate text-[12px] font-semibold text-stone-800', 'max-w-[140px] truncate text-[12px] font-semibold text-neutral-200')}>
                  {user?.name || 'Merchant'}
                </span>
                <span className="material-symbols-outlined text-[18px] text-stone-400">expand_more</span>
              </div>
            </div>
          </header>

          <main className={mainPad}>
            <Outlet />
          </main>

          <nav
            className={ad(
              theme,
              'fixed bottom-0 left-0 right-0 z-40 flex rounded-t-2xl border-t border-stone-200/90 bg-white/95 pt-2 pb-[calc(0.65rem+env(safe-area-inset-bottom))] shadow-[0_-10px_28px_rgba(0,0,0,0.08)] backdrop-blur-md lg:hidden',
              'fixed bottom-0 left-0 right-0 z-40 flex rounded-t-2xl border-t border-neutral-800 bg-[#101412]/95 pt-2 pb-[calc(0.65rem+env(safe-area-inset-bottom))] shadow-[0_-10px_28px_rgba(0,0,0,0.35)] backdrop-blur-md lg:hidden',
            )}
            aria-label="Admin navigation"
          >
            <MobileNavItem to="/admin" end label="Home" icon="home" theme={theme} />
            <MobileNavItem to="/admin/orders" label="Orders" icon="receipt_long" theme={theme} dot={orderAlertCount > 0} />
            <MobileNavItem to="/admin/products" label="Stock" icon="inventory_2" theme={theme} />
            <MobileNavItem to="/admin/customers" label="People" icon="group" theme={theme} />
            <MobileNavItem to="/admin/makeup-bookings" label="Makeup" icon="face_retouching_natural" theme={theme} dot={makeupAlertCount > 0} />
            <MobileNavItem to="/admin/transactions" label="Wallet" icon="account_balance_wallet" theme={theme} dot={orderAlertCount > 0} />
            <MobileNavItem to="/admin/account" label="Account" icon="notifications" theme={theme} />
          </nav>
        </div>
      </div>
    </div>
  )
}

export function AdminLayout() {
  return (
    <AdminThemeProvider>
      <AdminLayoutInner />
    </AdminThemeProvider>
  )
}
