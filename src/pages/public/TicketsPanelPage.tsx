import { TicketsPanel } from './tickets/TicketsPanel'
import { TicketsLogin } from './tickets/TicketsLogin'
import { useAuth } from '@/hooks/useAuth'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * /eventos/painel — painel do produtor (login + criação/gerenciamento de eventos).
 * Separado da listagem pública.
 */
export function TicketsPanelPage() {
  const { user } = useAuth()

  return (
    <div>
      <div className="mx-auto max-w-3xl px-4 pt-6">
        <Link
          to="/eventos"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Ver todos os eventos
        </Link>
      </div>
      {user ? <TicketsPanel /> : <TicketsLogin />}
    </div>
  )
}
