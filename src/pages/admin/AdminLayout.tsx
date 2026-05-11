import { Link, NavLink, Outlet } from 'react-router-dom'
import { ScrollToTop } from '../../components/ScrollToTop.tsx'
import { useAuth } from '../../context/AuthContext'
import { AdminThemeProvider, useAdminTheme } from './AdminThemeContext.tsx'
import { ad, adminFont } from './adminUi.ts'

function NavItem({
  to,
  end,
  label,
  theme,
  icon,
}: {
  to: string
  end?: boolean
  label: string
  theme: 'light' | 'dark'
  icon: string
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
              'material-symbols-outlined text-[20px] font-light leading-none',
              isActive
                ? ad(theme, 'text-emerald-600', 'text-emerald-400')
                : ad(theme, 'text-stone-400', 'text-neutral-500'),
            ].join(' ')}
            aria-hidden
          >
            {icon}
          </span>
          {label}
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
}: {
  to: string
  end?: boolean
  label: string
  icon: string
  theme: 'light' | 'dark'
}) {
  return (
    <NavLink to={to} end={end} className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 no-underline">
      {({ isActive }) => (
        <>
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

  const mainPad = 'flex-1 px-4 py-5 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-5 sm:py-6 lg:px-8 lg:py-8 lg:pb-10'

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

          <p
            className={ad(
              theme,
              'px-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400',
              'px-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500',
            )}
          >
            Quick access
          </p>
          <nav className="flex flex-1 flex-col gap-0.5 px-3">
            <NavItem to="/admin" end label="Dashboard" theme={theme} icon="dashboard" />
            <NavItem to="/admin/orders" label="Orders" theme={theme} icon="receipt_long" />
            <NavItem to="/admin/products" label="Products" theme={theme} icon="inventory_2" />
            <NavItem to="/admin/transactions" label="Transactions" theme={theme} icon="account_balance_wallet" />
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
              <div className="flex shrink-0 items-center gap-1.5">
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
              'fixed bottom-0 left-0 right-0 z-40 flex border-t border-stone-200/90 bg-white/95 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur-md lg:hidden',
              'fixed bottom-0 left-0 right-0 z-40 flex border-t border-neutral-800 bg-[#101412]/95 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md lg:hidden',
            )}
            aria-label="Admin navigation"
          >
            <MobileNavItem to="/admin" end label="Home" icon="home" theme={theme} />
            <MobileNavItem to="/admin/orders" label="Orders" icon="receipt_long" theme={theme} />
            <MobileNavItem to="/admin/products" label="Stock" icon="inventory_2" theme={theme} />
            <MobileNavItem to="/admin/transactions" label="Wallet" icon="account_balance_wallet" theme={theme} />
            <MobileNavItem to="/admin/account" label="More" icon="menu" theme={theme} />
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
