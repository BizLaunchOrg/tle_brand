import { Outlet } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { CartDrawerProvider } from '../context/CartDrawerContext.tsx'
import { ScrollToTop } from './ScrollToTop.tsx'
import { CartDrawer } from './CartDrawer.tsx'
import { FavoritesDrawer } from './FavoritesDrawer.tsx'
import { FloatingActions } from './FloatingActions.tsx'
import { Navbar } from './Navbar/navbar.tsx'
import { Footer } from './Footer/footer.tsx'

export function MainLayout() {
  return (
    <AuthProvider>
      <CartDrawerProvider>
        <ScrollToTop />
        <div className="flex min-h-svh flex-col bg-white font-sans text-tle-ink antialiased">
          <Navbar />
          <main className="flex w-full flex-1 flex-col">
            {/* Sentinel for navbar scroll state (IntersectionObserver); not decorative spacing */}
            <div data-nav-scroll-sentinel className="pointer-events-none h-px w-full shrink-0" aria-hidden />
            <Outlet />
          </main>
          <Footer />
          <CartDrawer />
          <FavoritesDrawer />
          <FloatingActions />
        </div>
      </CartDrawerProvider>
    </AuthProvider>
  )
}
