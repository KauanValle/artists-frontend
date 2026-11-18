import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { TicketsLogin } from './tickets/TicketsLogin'
import { TicketsPanel } from './tickets/TicketsPanel'

/** Emissor de ingressos: login para quem não entrou; painel único (artista ou contratante) para quem entrou. */
export function TicketsPage() {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated || !user) return <TicketsLogin />

  if (!user.perfilCompleto && user.role !== 'Admin') return <Navigate to="/completar-perfil" replace />

  return <TicketsPanel />
}
