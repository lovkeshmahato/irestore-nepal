import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { FullPageSpinner } from './ui/Spinner'
import type { UserRole } from '../types'

export function ProtectedRoute() {
  const { session, profile, loading } = useAuth()

  if (loading) return <FullPageSpinner />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <FullPageSpinner />

  return <Outlet />
}

export function RoleRoute({ roles }: { roles: UserRole[] }) {
  const { profile } = useAuth()
  if (!profile) return <FullPageSpinner />
  if (!roles.includes(profile.role)) return <Navigate to="/" replace />
  return <Outlet />
}
