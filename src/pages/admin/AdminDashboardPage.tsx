import { useState } from 'react'
import { Copy, Link2, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { bookingsApi } from '@/services'
import { Link } from 'react-router-dom'
import { BookingStatusBadge, EmptyState, eventTypeLabel } from '@/components/badges'
import { TaxaAdministrativaCard } from '@/pages/admin/TaxaAdministrativaCard'
import { formatDate, formatMoney, formatTime } from '@/lib/utils'
import type { Booking } from '@/types'
import {StatCard} from "@/pages/artist/ArtistDashboardPage.tsx";

/**
 * Painel do administrador.
 * Seção principal: Solicitações Anônimas — shows confirmados contratados por
 * visitantes (sem cadastro), com contato direto pelo WhatsApp informado.
 */
export function AdminDashboardPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Painel do administrador</h1>
        <p className="text-sm text-muted-foreground">Acesso administrativo da reprissa</p>
      </div>
      <Card>
        <CardContent className="flex items-center gap-4">
          <div className="flex flex-1 items-center gap-4 pt-6">
            <Avatar alt={user?.displayName} className="h-12 w-12" />
            <div className="min-w-0">
              <p className="font-medium">{user?.displayName}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <TaxaAdministrativaCard />

      <TotalBookingsSection />
    </div>
  )
}

function TotalBookingsSection() {
    const { data, isLoading } = useQuery({
        queryKey: ['admin-total-bookings'],
        queryFn: async () => (await bookingsApi.list('', 1, 50, true)).data,
        placeholderData: keepPreviousData,
    })

    const bookings = data?.items ?? []
    const bookingsConfirmed = bookings.filter((b) => b.status === 'Confirmed')
    const bookingsCanceled = bookings.filter((b) => b.status === 'Cancelled')
    const bookingsRequested = bookings.filter((b) => b.status === 'Requested')
    const bookingsNegotiating = bookings.filter((b) => b.status === 'Negotiating')
    const bookingsProposed = bookings.filter((b) => b.status === 'Proposed')
    const bookingsCompleted = bookings.filter((b) => b.status === 'Completed')
    const bookingsRejected = bookings.filter((b) => b.status === 'Rejected')
    const bookingsExpired = bookings.filter((b) => b.status === 'Expired')
    const bookingsAwaitingAccount = bookings.filter((b) => b.status === 'AwaitingAccount')
    
    // @ts-ignore
    // @ts-ignore
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Dashboard de eventos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {isLoading ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
                ) : bookings.length === 0 ? (
                    <EmptyState
                        title="Nenhum evento cadastrado no sistema."
                        description="Eventos confirmados no sistema aparecem aqui."
                    />
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <StatCard title="Total de eventos cadastrados" value={bookings.length} />
                        <StatCard title="Total de eventos confirmados" value={bookingsConfirmed.length} />
                        <StatCard title="Total de eventos cancelados" value={bookingsCanceled.length} />
                        <StatCard title="Total de eventos com proposta enviada" value={bookingsRequested.length} />
                        <StatCard title="Total de eventos em negociação" value={bookingsNegotiating.length} />
                        <StatCard title="Total de eventos com proposta enviada" value={bookingsProposed.length} />
                        <StatCard title="Total de eventos completados" value={bookingsCompleted.length} />
                        <StatCard title="Total de eventos rejeitados" value={bookingsCompleted.length} />
                        <StatCard title="Total de eventos expirados" value={bookingsExpired.length} />
                        <StatCard title="Total de eventos aguardando conta" value={bookingsAwaitingAccount.length} />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/** Lista de shows confirmados contratados por visitantes (sem cadastro). */
function AnonymousBookingsSection() {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-anonymous-bookings'],
    queryFn: async () => (await bookingsApi.list('AwaitingAccount', 1, 50, true)).data,
    placeholderData: keepPreviousData,
  })

  const bookings = data?.items ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Solicitações anônimas confirmadas</CardTitle>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {bookings.length}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : bookings.length === 0 ? (
          <EmptyState
            title="Nenhuma solicitação anônima"
            description="Shows confirmados por visitantes (sem cadastro) aparecem aqui."
          />
        ) : (
          bookings.map((booking) => (
            <AnonymousBookingCard
              key={booking.id}
              booking={booking}
              expanded={expandedId === booking.id}
              onToggle={() => setExpandedId(expandedId === booking.id ? null : booking.id)}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}

function AnonymousBookingCard({
  booking,
  expanded,
  onToggle,
}: {
  booking: Booking
  expanded: boolean
  onToggle: () => void
}) {
  const waPhone = booking.guestPhone?.replace(/\D/g, '')
  const waLink = waPhone ? `https://wa.me/55${waPhone}` : undefined

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{booking.contractorName}</p>
          <p className="text-sm text-muted-foreground">
            {booking.artistName} • {formatDate(booking.eventDate)} às {formatTime(booking.startTime)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold">{formatMoney(booking.budget)}</span>
          <BookingStatusBadge status={booking.status} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {waLink && (
          <Button size="sm" variant="outline" asChild>
            <a href={waLink} target="_blank" rel="noreferrer">
              <MessageCircle /> Falar no WhatsApp
            </a>
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          title="Copia o link de cadastro pré-preenchido com os dados deste contratante"
          onClick={async () => {
            const params = new URLSearchParams({
              nome: booking.contractorName,
              empresa: booking.guestCompanyName ?? '',
              telefone: booking.guestPhone ?? '',
            })
            const link = window.location.origin + '/register?' + params.toString()
            try {
              await navigator.clipboard.writeText(link)
              toast.success('Link de cadastro copiado! Envie ao contratante.')
            } catch {
              toast.error('Não foi possível copiar o link.')
            }
          }}
        >
          <Link2 /> Gerar link
        </Button>
        <Button size="sm" variant="ghost" onClick={onToggle}>
          {expanded ? 'Ocultar informações' : 'Ver informações do evento'}
        </Button>
      </div>

      {expanded && (
        <div className="mt-4 grid gap-3 rounded-lg bg-muted/40 p-4 text-sm sm:grid-cols-2">
          <InfoRow label="Tipo de evento" value={eventTypeLabel[booking.eventType]} />
          <InfoRow label="Duração" value={`${formatTime(booking.startTime)} – ${formatTime(booking.endTime)}`} />
          <InfoRow label="Local" value={booking.location} />
          <InfoRow label="Público estimado" value={booking.estimatedAudience?.toLocaleString('pt-BR') ?? '—'} />
          <InfoRow label="Estabelecimento" value={booking.guestCompanyName ?? '—'} />
          <InfoRow label="WhatsApp" value={booking.guestPhone ?? '—'} />
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mensagem</p>
            <p className="mt-1 text-muted-foreground">{booking.message || '—'}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-56 truncate text-right font-medium">{value}</span>
    </div>
  )
}
