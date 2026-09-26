import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CalendarDays, CreditCard, Megaphone, TrendingUp, Wallet } from 'lucide-react'
import { bookingsApi, eventsApi, financialApi } from '@/services'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookingStatusBadge, eventTypeLabel } from '@/components/badges'
import { EmptyState } from '@/components/badges'
import { formatMoney } from '@/lib/utils'

export function StatCard({ title, value, icon, hint }: { title: string; value: string; icon?: React.ReactNode; hint?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}

export function ArtistDashboardPage() {
  const { user } = useAuth()
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  const { data: summary } = useQuery({
    queryKey: ['financial-summary', fmt(monthStart)],
    queryFn: async () => (await financialApi.summary(fmt(monthStart), fmt(new Date(today.getFullYear(), today.getMonth() + 1, 0)))).data,
  })

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['events-upcoming'],
    queryFn: async () =>
      (await eventsApi.list({ from: fmt(today), to: fmt(new Date(today.getTime() + 90 * 86400000)) })).data,
  })

  const { data: recentBookings } = useQuery({
    queryKey: ['bookings-recent'],
    queryFn: async () => (await bookingsApi.list(undefined, 1, 5)).data,
  })

  const shows = upcomingEvents.filter((e) => e.type === 'Show').slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Olá, {user?.displayName} 👋</h1>
        <p className="text-sm text-muted-foreground">Visão geral do mês (semana/mês/ano via filtro do financeiro)</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Receita prevista (mês)" value={formatMoney(summary?.incomeExpected)} icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} />
        <StatCard title="Recebido" value={formatMoney(summary?.incomeReceived)} icon={<Wallet className="h-4 w-4 text-muted-foreground" />} />
        <StatCard title="Contas a receber" value={formatMoney(summary?.accountsReceivable)} icon={<CreditCard className="h-4 w-4 text-muted-foreground" />} />
        <StatCard title="Próximos shows" value={String(summary?.upcomingShowsCount ?? 0)} icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Próximos eventos</CardTitle>
            <Link to="/artist/agenda" className="text-sm text-primary hover:underline">
              Ver agenda
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingEvents.length === 0 && <EmptyState title="Nenhum evento na agenda" description="Crie shows, ensaios e compromissos." icon={<CalendarDays />} />}
            {upcomingEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {eventTypeLabel[event.type]} • {new Date(event.startDateTime).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <Megaphone className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Solicitações recentes</CardTitle>
            <Link to="/artist/shows" className="text-sm text-primary hover:underline">
              Ver shows
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {(recentBookings?.items.length ?? 0) === 0 && (
              <EmptyState title="Nenhuma solicitação ainda" description="Quando um contratante se interessar, aparece aqui." icon={<Megaphone />} />
            )}
            {recentBookings?.items.map((booking) => (
              <Link key={booking.id} to={`/artist/shows/${booking.id}`} className="block rounded-md border p-3 hover:bg-accent">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{booking.contractorName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(booking.eventDate + 'T00:00:00').toLocaleDateString('pt-BR')} • {booking.startTime.slice(0, 5)}
                    </p>
                  </div>
                  <BookingStatusBadge status={booking.status} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
