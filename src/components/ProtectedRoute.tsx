import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types'

export function ProtectedRoute({ role }: { role?: UserRole }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (role && user?.role !== role) {
    return <Navigate to={user?.role === 'Artist' ? '/artist/dashboard' : '/contractor/dashboard'} replace />
  }

  return <Outlet />
}

export function RoleRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth()
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Navigate to={user?.role === 'Artist' ? '/artist/dashboard' : '/contractor/dashboard'} replace />
}
