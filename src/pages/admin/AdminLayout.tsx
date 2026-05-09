import { Link, NavLink, Outlet } from 'react-router-dom'
import { ScrollToTop } from '../../components/ScrollToTop.tsx'
import { useAuth } from '../../context/AuthContext'
import { AdminThemeProvider, useAdminTheme } from './AdminThemeContext.tsx'
import { ad } from './adminUi.ts'

const icon = 'material-symbols-outlined text-[22px] leading-none shrink-0'

function NavItem({
  to,
  end,
  label,
  symbol,
  theme,
}: {
  to: string
  end?: boolean
  label: string
  symbol: string
  theme: 'light' | 'dark'
}) {
  return (
    <NavLink to={to} end={end} className="block no-underline">
      {({ isActive }) => (
        <span
          className={[
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium tracking-tight transition-colors',
            isActive
              ? ad(theme, 'bg-zinc-900 text-white shadow-sm', 'bg-zinc-100 text-zinc-900')
              : ad(
                  theme,
                  'text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900',
                  'text-zinc-400 hover:bg-white/5 hover:text-zinc-200',
                ),
          ].join(' ')}
        >
          <span
            className={[icon, isActive ? '' : 'opacity-80'].join(' ')}
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
          >
            {symbol}
          </span>
          {label}
        </span>
      )}
    </NavLink>
  )
}

function AdminLayoutInner() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useAdminTheme()

  const shell = ad(
    theme,
    'min-h-svh bg-[#ececee] text-zinc-900 antialiased',
    'min-h-svh bg-[#09090b] text-zinc-100 antialiased',
  )
  const sidebar = ad(
    theme,
    'border-zinc-200/90 bg-white/90 shadow-[0_1px_0_rgba(0,0,0,0.04)]',
    'border-zinc-800/80 bg-[#0c0c0e]/95',
  )
  const headerMobile = ad(
    theme,
    'border-zinc-200/90 bg-white/80',
    'border-zinc-800 bg-[#09090b]/90',
  )

  return (
    <div className={shell}>
      <ScrollToTop />
      <div className="flex min-h-svh">
        <aside
          className={`sticky top-0 hidden h-svh w-[252px] shrink-0 flex-col border-r px-3 py-5 backdrop-blur-md lg:flex ${sidebar}`}
        >
          <div className="mb-8 px-2">
            <p
              className={ad(
                theme,
                'text-[10px] font-semibold tracking-[0.22em] text-tle-deep uppercase',
                'text-[10px] font-semibold tracking-[0.22em] text-tle-light uppercase',
              )}
            >
              TLE Brand
            </p>
            <p className="mt-1.5 font-sans text-[15px] font-semibold tracking-tight">Operations</p>
            <p className={ad(theme, 'mt-0.5 text-[11px] text-zinc-500', 'mt-0.5 text-[11px] text-zinc-500')}>
              Commerce console
            </p>
          </div>

          <nav className="flex flex-1 flex-col gap-0.5">
            <NavItem to="/admin" end label="Overview" symbol="grid_view" theme={theme} />
            <NavItem to="/admin/orders" label="Orders" symbol="shopping_bag" theme={theme} />
            <NavItem to="/admin/transactions" label="Transactions" symbol="payments" theme={theme} />
            <NavItem to="/admin/products" label="Catalog" symbol="inventory_2" theme={theme} />
            <div className={ad(theme, 'my-3 h-px bg-zinc-200', 'my-3 h-px bg-zinc-800')} />
            <NavItem to="/admin/account" label="Account" symbol="manage_accounts" theme={theme} />
          </nav>

          <div className={ad(theme, 'mt-auto border-t border-zinc-200/90 pt-4', 'mt-auto border-t border-zinc-800 pt-4')}>
            <p
              className={ad(theme, 'truncate px-2 text-[11px] text-zinc-500', 'truncate px-2 text-[11px] text-zinc-500')}
              title={user?.email}
            >
              {user?.email}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className={ad(
                  theme,
                  'flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white py-2 text-[11px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-50',
                  'flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 py-2 text-[11px] font-semibold text-zinc-200 transition-colors hover:bg-zinc-800',
                )}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <span className="material-symbols-outlined text-[18px] leading-none">
                  {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                </span>
                {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
              <button
                type="button"
                onClick={() => void logout()}
                className={ad(
                  theme,
                  'rounded-lg border border-zinc-200 px-3 py-2 text-[11px] font-semibold text-zinc-600 transition-colors hover:border-red-200 hover:text-red-700',
                  'rounded-lg border border-zinc-700 px-3 py-2 text-[11px] font-semibold text-zinc-400 transition-colors hover:border-red-900/50 hover:text-red-400',
                )}
              >
                Out
              </button>
            </div>
            <Link
              to="/"
              className={ad(
                theme,
                'mt-3 block py-2 text-center text-[12px] font-medium text-tle-deep no-underline hover:underline',
                'mt-3 block py-2 text-center text-[12px] font-medium text-tle-light no-underline hover:underline',
              )}
            >
              ← Storefront
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header
            className={`sticky top-0 z-20 flex items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur-md lg:hidden ${headerMobile}`}
          >
            <Link to="/admin" className="font-sans text-[15px] font-semibold tracking-tight no-underline">
              TLE · Admin
            </Link>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleTheme}
                className={ad(
                  theme,
                  'flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700',
                  'flex size-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-200',
                )}
                aria-label="Toggle theme"
              >
                <span className="material-symbols-outlined text-[20px] leading-none">
                  {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                </span>
              </button>
              <Link
                to="/admin/account"
                className={ad(
                  theme,
                  'flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700',
                  'flex size-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-200',
                )}
                aria-label="Account"
              >
                <span className="material-symbols-outlined text-[20px] leading-none">person</span>
              </Link>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            <Outlet />
          </main>
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
