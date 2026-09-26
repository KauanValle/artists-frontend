import type { ReactNode } from 'react'
import type { BookingStatus, EventStatus, TransactionStatus, ProposalStatus, EquipmentStatus, AvailabilityStatus } from '@/types'
import { Badge } from '@/components/ui/badge'

const bookingLabels: Record<BookingStatus, { label: string; variant: 'secondary' | 'warning' | 'info' | 'success' | 'destructive' | 'muted' }> = {
  Requested: { label: 'Solicitado', variant: 'info' },
  Negotiating: { label: 'Em negociação', variant: 'warning' },
  Proposed: { label: 'Proposta enviada', variant: 'warning' },
  Accepted: { label: 'Aceito', variant: 'success' },
  Confirmed: { label: 'Confirmado', variant: 'success' },
  Completed: { label: 'Concluído', variant: 'muted' },
  Cancelled: { label: 'Cancelado', variant: 'destructive' },
  Rejected: { label: 'Recusado', variant: 'destructive' },
  Expired: { label: 'Expirado', variant: 'muted' },
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const config = bookingLabels[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

const eventLabels: Record<EventStatus, { label: string; variant: 'secondary' | 'success' | 'muted' | 'destructive' }> = {
  Scheduled: { label: 'Agendado', variant: 'secondary' },
  Confirmed: { label: 'Confirmado', variant: 'success' },
  Completed: { label: 'Realizado', variant: 'muted' },
  Cancelled: { label: 'Cancelado', variant: 'destructive' },
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const config = eventLabels[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

const transactionLabels: Record<TransactionStatus, { label: string; variant: 'warning' | 'success' | 'info' | 'destructive' | 'muted' }> = {
  Pending: { label: 'Pendente', variant: 'warning' },
  Received: { label: 'Recebido', variant: 'success' },
  Paid: { label: 'Pago', variant: 'success' },
  Overdue: { label: 'Em atraso', variant: 'destructive' },
  Cancelled: { label: 'Cancelado', variant: 'muted' },
}

export function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  const config = transactionLabels[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export const proposalStatusLabel: Record<ProposalStatus, string> = {
  Pending: 'Pendente',
  Accepted: 'Aceita',
  Rejected: 'Recusada',
  Expired: 'Expirada',
  Cancelled: 'Cancelada',
}

export const equipmentStatusLabel: Record<EquipmentStatus, string> = {
  Available: 'Disponível',
  InUse: 'Em uso',
  Maintenance: 'Manutenção',
  Unavailable: 'Indisponível',
}

export const availabilityStatusLabel: Record<AvailabilityStatus, string> = {
  Available: 'Disponível',
  PreReserved: 'Pré-reservado',
  Unavailable: 'Indisponível',
}

export const eventTypeLabel: Record<string, string> = {
  Show: 'Show',
  Rehearsal: 'Ensaio',
  Meeting: 'Reunião',
  Travel: 'Viagem',
  Recording: 'Gravação',
  Other: 'Outro',
}

export function EmptyState({ title, description, icon, action }: { title: string; description?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
      {icon && <div className="mb-3 text-muted-foreground">{icon}</div>}
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
