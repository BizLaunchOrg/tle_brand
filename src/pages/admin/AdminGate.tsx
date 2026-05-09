import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * Uses the same Supabase session as the storefront (no separate admin login).
 * Access: row in public.admin_users and/or JWT app_metadata.role === 'admin'.
 */
export function AdminGate() {
  const { user, isAdmin, authReady, adminResolved } = useAuth()
  const location = useLocation()

  if (!authReady || (user && !adminResolved)) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-zinc-950 px-6 text-zinc-300">
        <div
          className="size-9 animate-spin rounded-full border-2 border-tle-pink/30 border-t-tle-pink"
          aria-hidden
        />
        <p className="text-sm">Checking access…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
