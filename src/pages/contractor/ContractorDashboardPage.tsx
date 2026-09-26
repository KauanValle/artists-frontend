import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CalendarRange, ClipboardList, Heart, Search } from 'lucide-react'
import { bookingsApi, favoritesApi } from '@/services'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookingStatusBadge, EventStatusBadge, EmptyState, eventTypeLabel } from '@/components/badges'
import { StatCard } from '@/pages/artist/ArtistDashboardPage'
import { formatDate, formatTime } from '@/lib/utils'

export function ContractorDashboardPage() {
  const { user } = useAuth()

  const { data: bookings } = useQuery({
    queryKey: ['bookings', 'mine'],
    queryFn: async () => (await bookingsApi.list(undefined, 1, 50)).data,
  })

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => (await favoritesApi.list()).data,
  })

  const items = bookings?.items ?? []
  const confirmed = items.filter((b) => b.status === 'Confirmed' || b.status === 'Accepted')
  const pending = items.filter((b) => b.status === 'Requested' || b.status === 'Negotiating' || b.status === 'Proposed')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Olá, {user?.displayName} 👋</h1>
        <p className="text-sm text-muted-foreground">Acompanhe suas contratações</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Solicitações em aberto" value={String(pending.length)} icon={<ClipboardList className="h-4 w-4 text-muted-foreground" />} />
        <StatCard title="Eventos confirmados" value={String(confirmed.length)} icon={<CalendarRange className="h-4 w-4 text-muted-foreground" />} />
        <StatCard title="Favoritos" value={String(favorites.length)} icon={<Heart className="h-4 w-4 text-muted-foreground" />} />
        <StatCard title="Total de contratações" value={String(items.length)} icon={<Search className="h-4 w-4 text-muted-foreground" />} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Atividade recente</CardTitle>
          <Link to="/contractor/solicitacoes" className="text-sm text-primary hover:underline">
            Ver todas
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && (
            <EmptyState
              title="Nenhuma contratação ainda"
              description="Encontre artistas no marketplace e envie sua primeira solicitação."
              icon={<Search />}
              action={
                <Button asChild>
                  <Link to="/contractor/buscar">Buscar artistas</Link>
                </Button>
              }
            />
          )}
          {items.slice(0, 6).map((booking) => (
            <Link key={booking.id} to={`/contractor/solicitacoes/${booking.id}`} className="block rounded-md border p-3 hover:bg-accent">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{booking.artistName}</p>
                  <p className="text-xs text-muted-foreground">
                    {eventTypeLabel[booking.eventType]} • {formatDate(booking.eventDate)} às {formatTime(booking.startTime)} • {booking.location}
                  </p>
                </div>
                <BookingStatusBadge status={booking.status} />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export function ContractorEventsPage() {
  const { data: bookings } = useQuery({
    queryKey: ['bookings', 'confirmed-events'],
    queryFn: async () => (await bookingsApi.list('Confirmed', 1, 50)).data,
  })

  const { data: completed } = useQuery({
    queryKey: ['bookings', 'completed-events'],
    queryFn: async () => (await bookingsApi.list('Completed', 1, 50)).data,
  })

  const all = [...(bookings?.items ?? []), ...(completed?.items ?? [])].sort(
    (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Eventos</h1>
        <p className="text-sm text-muted-foreground">Shows confirmados e realizados</p>
      </div>

      {all.length === 0 ? (
        <EmptyState title="Nenhum evento confirmado" description="Aceite uma proposta para confirmar um evento." icon={<CalendarRange />} />
      ) : (
        <div className="space-y-2">
          {all.map((booking) => (
            <Link key={booking.id} to={`/contractor/solicitacoes/${booking.id}`}>
              <Card className="mb-2 hover:shadow-md">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{booking.artistName}</p>
                    <p className="text-sm text-muted-foreground">
                      {eventTypeLabel[booking.eventType]} • {formatDate(booking.eventDate)} • {formatTime(booking.startTime)} • {booking.location}
                    </p>
                  </div>
                  <BookingStatusBadge status={booking.status} />
                  <EventStatusBadge status={booking.status === 'Confirmed' ? 'Confirmed' : 'Completed'} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
