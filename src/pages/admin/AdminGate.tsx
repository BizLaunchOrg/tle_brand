import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function AdminGate() {
  const { user, isAdmin, authReady, adminResolved } = useAuth()
  const location = useLocation()

  if (!authReady || (user && !adminResolved)) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-stone-100 px-6 text-stone-600">
        <div className="h-px w-8 bg-stone-300" aria-hidden />
        <p className="text-[13px] font-medium tracking-tight">Verifying session…</p>
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
