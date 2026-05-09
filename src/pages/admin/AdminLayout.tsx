import { Link, NavLink, Outlet } from 'react-router-dom'
import { ScrollToTop } from '../../components/ScrollToTop.tsx'
import { useAuth } from '../../context/AuthContext'

const navCls = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium no-underline transition-colors ${
    isActive ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
  }`

export function AdminLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-svh bg-zinc-950 font-sans text-zinc-100 antialiased">
      <ScrollToTop />
      <div className="flex min-h-svh">
        <aside className="sticky top-0 hidden h-svh w-[260px] shrink-0 flex-col border-r border-white/10 bg-zinc-900/80 px-4 py-6 backdrop-blur-md md:flex">
          <Link to="/" className="mb-8 block px-2 no-underline">
            <p className="text-[10px] font-bold tracking-[0.2em] text-tle-pink uppercase">TLE Brand</p>
            <p className="mt-1 font-serif text-lg text-white">Admin</p>
          </Link>

          <nav className="flex flex-1 flex-col gap-1">
            <NavLink to="/admin" end className={navCls}>
              <span className="material-symbols-outlined text-[20px] leading-none text-tle-pink">dashboard</span>
              Dashboard
            </NavLink>
            <NavLink to="/admin/orders" className={navCls}>
              <span className="material-symbols-outlined text-[20px] leading-none text-tle-pink">receipt_long</span>
              Orders
            </NavLink>
          </nav>

          <div className="mt-auto border-t border-white/10 pt-4">
            <p className="truncate px-2 text-[11px] text-zinc-500" title={user?.email}>
              {user?.email}
            </p>
            <button
              type="button"
              onClick={() => void logout()}
              className="mt-3 w-full rounded-xl border border-white/15 py-2.5 text-[11px] font-semibold tracking-wide text-zinc-300 uppercase transition-colors hover:border-tle-pink hover:text-white"
            >
              Log out
            </button>
            <Link
              to="/"
              className="mt-2 block py-2 text-center text-[12px] font-medium text-tle-pink no-underline hover:text-tle-pink/90"
            >
              ← Storefront
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-zinc-950/90 px-4 py-3 backdrop-blur-md md:hidden">
            <Link to="/admin" className="font-serif text-lg text-white no-underline">
              Admin
            </Link>
            <div className="flex items-center gap-2">
              <NavLink
                to="/admin/orders"
                className="rounded-lg px-2 py-1.5 text-[12px] text-zinc-400 no-underline hover:text-white"
              >
                Orders
              </NavLink>
              <Link to="/" className="text-[12px] text-tle-pink no-underline">
                Store
              </Link>
            </div>
          </header>

          <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
