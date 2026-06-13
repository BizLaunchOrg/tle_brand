import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCartDrawer } from '../../context/CartDrawerContext.tsx'

const navLinkClass = (onPink: boolean) => {
  return ({ isActive }: { isActive: boolean }) =>
    `text-[12.5px] font-normal tracking-wide no-underline transition-colors duration-500 ${
      onPink
        ? isActive
          ? 'font-medium text-white'
          : 'text-white/80 hover:text-white'
        : isActive
          ? 'font-medium text-tle-pink'
          : 'text-tle-muted hover:text-tle-ink'
    }`
}

const mobileSheetLink = ({ isActive }: { isActive: boolean }) =>
  `block rounded-xl px-4 py-3.5 text-[13px] font-medium tracking-wide no-underline transition-colors ${
    isActive ? 'bg-tle-blush text-tle-pink' : 'text-tle-ink hover:bg-tle-blush/70'
  }`

export function Navbar() {
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchDraft, setSearchDraft] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { openCart, openFavorites, cartCount, favoriteCount } = useCartDrawer()
  const { user, logout, isAdmin, adminResolved } = useAuth()
  const navigate = useNavigate()

  const isHome = pathname === '/'
  const showSolidNav = scrolled || !isHome

  const goBookingSection = () => {
    navigate('/')
    requestAnimationFrame(() => {
      document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  useEffect(() => {
    const readScrollY = () =>
      window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0

    const fallbackScroll = () => setScrolled(readScrollY() > 1)

    const sentinel = document.querySelector('[data-nav-scroll-sentinel]')
    if (sentinel) {
      const io = new IntersectionObserver(
        ([entry]) => {
          setScrolled(!entry.isIntersecting)
        },
        { root: null, threshold: 0 },
      )
      io.observe(sentinel)
      return () => io.disconnect()
    }

    fallbackScroll()
    window.addEventListener('scroll', fallbackScroll, { passive: true })
    return () => window.removeEventListener('scroll', fallbackScroll)
  }, [pathname])

  useEffect(() => {
    setMenuOpen(false)
    setSearchOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen && !searchOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen, searchOpen])

  useEffect(() => {
    if (!searchOpen) return
    setSearchDraft(searchParams.get('q') ?? '')
    const id = requestAnimationFrame(() => searchInputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [searchOpen])

  useEffect(() => {
    if (!searchOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [searchOpen])

  const openSearch = () => {
    setMenuOpen(false)
    setSearchOpen(true)
  }

  const closeSearch = () => setSearchOpen(false)

  const submitSearch = () => {
    const q = searchDraft.trim()
    setSearchOpen(false)
    setMenuOpen(false)
    if (pathname === '/') {
      if (q) navigate(`/?q=${encodeURIComponent(q)}#shop`, { replace: false })
      else navigate('/#shop')
    } else {
      navigate(q ? `/?q=${encodeURIComponent(q)}#shop` : '/#shop')
    }
  }

  const innerBar = `relative z-[1002] mx-auto flex w-[min(920px,calc(100vw-2rem))] items-center justify-between gap-3 rounded-full border px-4 py-3 transition-all duration-700 ease-out sm:gap-4 sm:px-6 md:px-7 ${
    showSolidNav
      ? 'border-white/20 bg-gradient-to-r from-tle-deep via-tle-pink to-tle-deep shadow-[0_16px_44px_-8px_rgba(160,73,111,0.55),0_8px_24px_rgba(196,105,141,0.35)] backdrop-blur-md'
      : 'border-tle-gold/25 bg-white/80 shadow-[0_2px_24px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-[28px]'
  }`

  return (
    <nav
      id="navbar"
      className={`fixed inset-x-0 top-0 z-[1000] transition-all duration-700 ease-out ${
        showSolidNav ? 'py-3 px-4 sm:px-8' : 'py-6 px-4 sm:px-8'
      }`}
    >
      <div className={innerBar}>
        <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2 md:flex-initial md:gap-0">
          <Link to="/" className="min-w-0 shrink leading-none no-underline" onClick={() => setMenuOpen(false)}>
            <img
              src="/tlelogo.PNG"
              alt="TOBILICIOUS BY LADY EMMA"
              className="h-8 w-auto max-w-[min(160px,38vw)] object-contain object-left sm:max-w-[min(200px,42vw)] md:h-9"
              width={180}
              height={48}
              decoding="async"
            />
          </Link>
          <button
            type="button"
            className={`flex size-[38px] shrink-0 items-center justify-center rounded-full transition-colors duration-500 md:hidden ${
              showSolidNav
                ? 'text-white/90 hover:bg-white/15 hover:text-white'
                : 'text-tle-muted hover:bg-tle-blush hover:text-tle-pink'
            }`}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="material-symbols-outlined text-[22px] leading-none">
              {menuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
        <ul className="hidden items-center gap-5 xl:gap-7 md:flex">
          <li>
            <NavLink to="/" end className={navLinkClass(showSolidNav)}>
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/shop" className={navLinkClass(showSolidNav)}>
              Shop
            </NavLink>
          </li>
          <li>
            <NavLink to="/makeup" className={navLinkClass(showSolidNav)}>
              Makeup
            </NavLink>
          </li>
          <li>
            <NavLink to="/contact" className={navLinkClass(showSolidNav)} title="Contact us — visit or message">
              Contact
            </NavLink>
          </li>
        </ul>
        <div
          className={`hidden items-center gap-3 md:flex md:pr-1 ${showSolidNav ? 'text-white/95' : 'text-tle-muted'}`}
        >
          {user ? (
            <>
              <div className="max-w-[200px] leading-tight lg:max-w-[240px]">
                <p
                  className={`truncate text-[12px] font-semibold ${showSolidNav ? 'text-white' : 'text-tle-ink'}`}
                  title={user.email}
                >
                  {user.email}
                </p>
              </div>
              {isAdmin && adminResolved ? (
                <Link
                  to="/admin"
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase no-underline transition-colors ${
                    showSolidNav
                      ? 'border-white/35 text-white hover:bg-white/15'
                      : 'border-black/10 text-tle-ink hover:border-tle-pink hover:text-tle-pink'
                  }`}
                >
                  Admin
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  void logout()
                }}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase transition-colors ${
                  showSolidNav
                    ? 'border-white/35 text-white hover:bg-white/15'
                    : 'border-black/10 text-tle-ink hover:border-tle-pink hover:text-tle-pink'
                }`}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                state={{ from: pathname }}
                className={`text-[12.5px] font-medium tracking-wide no-underline transition-colors ${
                  showSolidNav ? 'text-white/90 hover:text-white' : 'text-tle-muted hover:text-tle-ink'
                }`}
              >
                Log in
              </Link>
              <Link
                to="/signup"
                state={{ from: pathname }}
                className={`rounded-full px-4 py-2 text-[11px] font-semibold tracking-wide uppercase no-underline transition-colors ${
                  showSolidNav
                    ? 'bg-white/15 text-white hover:bg-white/25'
                    : 'bg-tle-charcoal text-white hover:bg-tle-pink'
                }`}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            className={`flex size-[38px] items-center justify-center rounded-full transition-colors duration-500 ${
              showSolidNav
                ? 'text-white/90 hover:bg-white/15 hover:text-white'
                : 'text-tle-muted hover:bg-tle-blush hover:text-tle-pink'
            }`}
            aria-label="Search products"
            aria-expanded={searchOpen}
            aria-controls="nav-search-panel"
            onClick={() => (searchOpen ? closeSearch() : openSearch())}
          >
            <span className="material-symbols-outlined text-[20px] leading-none">search</span>
          </button>
          <button
            type="button"
            className={`relative flex size-[38px] items-center justify-center rounded-full transition-colors duration-500 ${
              showSolidNav
                ? 'text-white/90 hover:bg-white/15 hover:text-white'
                : 'text-tle-muted hover:bg-tle-blush hover:text-tle-pink'
            }`}
            aria-label="Wishlist"
            onClick={openFavorites}
          >
            <span className="material-symbols-outlined text-[20px] leading-none">favorite</span>
            {favoriteCount > 0 ? (
              <span className="absolute top-1 right-1 flex size-[15px] items-center justify-center rounded-full bg-white text-[8px] font-bold text-tle-deep">
                {favoriteCount}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            className={`relative flex size-[38px] items-center justify-center rounded-full transition-colors duration-500 ${
              showSolidNav
                ? 'text-white/90 hover:bg-white/15 hover:text-white'
                : 'text-tle-muted hover:bg-tle-blush hover:text-tle-pink'
            }`}
            aria-label="Cart"
            onClick={openCart}
          >
            <span className="material-symbols-outlined text-[20px] leading-none">shopping_bag</span>
            {cartCount > 0 ? (
              <span className="absolute top-1 right-1 flex size-[15px] items-center justify-center rounded-full bg-white text-[8px] font-bold text-tle-deep">
                {cartCount}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            className="flex size-[38px] items-center justify-center rounded-full bg-tle-charcoal text-white sm:hidden"
            onClick={goBookingSection}
            aria-label="Book session"
          >
            <span className="material-symbols-outlined text-[20px] leading-none">event</span>
          </button>
          <button
            type="button"
            className="hidden rounded-full bg-tle-charcoal px-5 py-2.5 text-[11.5px] font-semibold tracking-wide text-white uppercase transition-all duration-500 hover:-translate-y-px hover:bg-tle-pink sm:inline-flex"
            onClick={goBookingSection}
          >
            Book Session
          </button>
        </div>
      </div>

      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[1001] bg-tle-ink/35 backdrop-blur-[2px] md:hidden"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div
            id="mobile-nav-menu"
            className="fixed left-4 right-4 top-[5.25rem] z-[1003] max-h-[min(70vh,calc(100dvh-7rem))] overflow-y-auto rounded-2xl border border-tle-pink/20 bg-white p-3 shadow-[0_24px_60px_rgba(0,0,0,0.18)] md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
          >
            <p className="px-3 pb-2 pt-1 text-[10px] font-bold tracking-[0.2em] text-tle-muted uppercase">Menu</p>
            <ul className="flex flex-col gap-0.5 pb-1">
              <li>
                <NavLink to="/" end className={mobileSheetLink} onClick={() => setMenuOpen(false)}>
                  Home
                </NavLink>
              </li>
              <li>
                <NavLink to="/shop" className={mobileSheetLink} onClick={() => setMenuOpen(false)}>
                  Shop
                </NavLink>
              </li>
              <li>
                <NavLink to="/makeup" className={mobileSheetLink} onClick={() => setMenuOpen(false)}>
                  Makeup
                </NavLink>
              </li>
              <li>
                <NavLink to="/contact" className={mobileSheetLink} onClick={() => setMenuOpen(false)}>
                  Contact us
                </NavLink>
              </li>
              {user ? (
                <li className="px-3 py-2 text-[12px] text-tle-muted">
                  Signed in as <span className="font-medium text-tle-ink">{user.email}</span>
                  {isAdmin && adminResolved ? (
                    <Link
                      to="/admin"
                      className="mt-2 block rounded-xl bg-tle-blush py-2 text-center text-[13px] font-semibold text-tle-pink no-underline"
                      onClick={() => setMenuOpen(false)}
                    >
                      Admin dashboard
                    </Link>
                  ) : null}
                </li>
              ) : null}
              {!user ? (
                <>
                  <li>
                    <NavLink
                      to="/login"
                      state={{ from: pathname }}
                      className={mobileSheetLink}
                      onClick={() => setMenuOpen(false)}
                    >
                      Log in
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/signup"
                      state={{ from: pathname }}
                      className={mobileSheetLink}
                      onClick={() => setMenuOpen(false)}
                    >
                      Sign up
                    </NavLink>
                  </li>
                </>
              ) : null}
              {user ? (
                <li className="px-2">
                  <button
                    type="button"
                    className="w-full rounded-xl border border-black/10 py-3 text-[13px] font-semibold text-tle-ink transition-colors hover:bg-tle-blush"
                    onClick={() => {
                      setMenuOpen(false)
                      void logout()
                    }}
                  >
                    Log out
                  </button>
                </li>
              ) : null}
            </ul>
            <div className="mt-2 border-t border-tle-pink/10 px-2 pt-3">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-tle-charcoal py-3 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-tle-pink"
                onClick={() => {
                  setMenuOpen(false)
                  goBookingSection()
                }}
              >
                <span className="material-symbols-outlined text-lg leading-none">calendar_month</span>
                Book session
              </button>
            </div>
          </div>
        </>
      ) : null}

      {searchOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[1004] bg-tle-ink/40 backdrop-blur-[2px]"
            aria-label="Close search"
            onClick={closeSearch}
          />
          <div
            id="nav-search-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Search products"
            className="fixed left-4 right-4 top-[5rem] z-[1005] max-h-[min(85dvh,calc(100dvh-6rem))] overflow-hidden rounded-2xl border border-tle-pink/20 bg-white shadow-[0_28px_80px_rgba(0,0,0,0.2)] sm:left-1/2 sm:top-[5.5rem] sm:w-full sm:max-w-lg sm:-translate-x-1/2 md:top-[6rem] dark:border-zinc-600 dark:bg-zinc-900"
          >
            <div className="border-b border-tle-pink/10 px-4 py-3 dark:border-zinc-600">
              <p className="text-[10px] font-bold tracking-[0.2em] text-tle-muted uppercase dark:text-zinc-400">Search</p>
            </div>
            <div className="p-4 sm:p-5">
              <label htmlFor="nav-search-input" className="sr-only">
                Search products
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tle-muted dark:text-zinc-500">
                  <span className="material-symbols-outlined text-[22px] leading-none">search</span>
                </span>
                <input
                  ref={searchInputRef}
                  id="nav-search-input"
                  type="search"
                  autoComplete="off"
                  placeholder="Search products, categories…"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      submitSearch()
                    }
                  }}
                  className="w-full rounded-xl border-[1.5px] border-black/10 bg-tle-cream/50 py-3.5 pl-11 pr-4 font-sans text-sm text-tle-ink outline-none transition-colors placeholder:text-tle-faint focus:border-tle-pink focus:bg-white dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-tle-pink dark:focus:bg-zinc-800"
                />
              </div>
              <p className="mt-2 text-[12px] text-tle-muted dark:text-zinc-400">
                Press Enter to see matches in the shop section.
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  className="inline-flex flex-1 min-w-[8rem] items-center justify-center gap-2 rounded-full bg-tle-charcoal px-5 py-3 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-tle-pink sm:flex-initial"
                  onClick={submitSearch}
                >
                  <span className="material-symbols-outlined text-lg leading-none">search</span>
                  Search
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full border border-tle-pink/40 px-5 py-3 text-[11px] font-semibold tracking-wide text-tle-pink uppercase transition-colors hover:bg-tle-blush dark:border-tle-light dark:text-tle-light dark:hover:bg-zinc-800"
                  onClick={closeSearch}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </nav>
  )
}
