import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  Lock,
  Megaphone,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { bookingsApi, eventsApi, financialApi } from '@/services'
import { useAuth } from '@/hooks/useAuth'
import { useAssinaturaObrigatoria } from '@/hooks/useAssinatura'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookingStatusBadge, eventTypeLabel } from '@/components/badges'
import { EmptyState } from '@/components/badges'
import { formatMoney, toDateInput } from '@/lib/utils'
import { useMyArtist } from '@/hooks/useArtistProfile'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'

/** Visão do artista com conta gratuita: sem dados, só o convite para assinar. */
function FreeArtistDashboard({ name }: { name?: string }) {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={<LayoutDashboard />}
        title={`Olá, ${name ?? 'artista'} 👋`}
        subtitle="Sua conta é gratuita — assine para liberar a plataforma."
      />

      <Card className="overflow-hidden border-0 shadow-md">
        <div className="h-1.5 bg-gradient-to-r from-primary to-primary/50" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-4 w-4 text-muted-foreground" /> ACESSO TOTAL A PLATAFORMA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Por <strong className="text-foreground">R$ 49,90/mês</strong> você desbloqueia financeiro, agenda, shows,
            equipe, equipamentos, perfil público e muito mais.
          </p>
          <Button asChild>
            <Link to="/artist/assinatura">
              <CreditCard /> Conhecer a assinatura
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// Keep backward-compat export so other pages that import { StatCard } from this file still work
export { StatCard } from '@/components/StatCard'

export function ArtistDashboardPage() {
  const { user } = useAuth()
  const assinaturaObrigatoria = useAssinaturaObrigatoria()
  const isFreeArtist = user?.subscriptionTier === 'Gratuito' && assinaturaObrigatoria
  const today = new Date()
  const { data: myArtist } = useMyArtist(user?.role === 'Artist')
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const fmt = (d: Date) => toDateInput(d)

  const { data: summary } = useQuery({
    queryKey: ['financial-summary', fmt(monthStart)],
    queryFn: async () =>
      (
        await financialApi.summary(
          fmt(monthStart),
          fmt(new Date(today.getFullYear(), today.getMonth() + 1, 0))
        )
      ).data,
    enabled: !isFreeArtist,
  })

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['events-upcoming'],
    queryFn: async () =>
      (await eventsApi.list({ from: fmt(today), to: fmt(new Date(today.getTime() + 90 * 86400000)) }))
        .data,
    enabled: !isFreeArtist,
  })

  const { data: recentBookings } = useQuery({
    queryKey: ['bookings-recent'],
    queryFn: async () => (await bookingsApi.list(undefined, 1, 5)).data,
    enabled: !isFreeArtist,
  })

  if (isFreeArtist) {
    return <FreeArtistDashboard name={user?.displayName} />
  }

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <PageHeader
        icon={<LayoutDashboard />}
        title={`Olá, ${myArtist?.artisticName ?? 'artista'} 👋`}
        subtitle="Visão geral do mês"
      />

      {/* ── Stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Receita prevista (mês)"
          value={formatMoney(summary?.incomeExpected)}
          icon={<TrendingUp />}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-500"
        />
        <StatCard
          title="Recebido"
          value={formatMoney(summary?.incomeReceived)}
          icon={<Wallet />}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-500"
        />
        <StatCard
          title="Contas a receber"
          value={formatMoney(summary?.accountsReceivable)}
          icon={<CreditCard />}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-500"
        />
        <StatCard
          title="Próximos shows"
          value={String(summary?.upcomingShowsCount ?? 0)}
          icon={<CalendarDays />}
          iconBg="bg-primary/10"
          iconColor="text-primary"
        />
      </div>

      {/* ── Content cards ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Próximos eventos */}
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 px-5 py-4">
            <CardTitle className="text-base font-semibold">Próximos eventos</CardTitle>
            <Link
              to="/artist/agenda"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver agenda <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {upcomingEvents.length === 0 && (
              <div className="p-6">
                <EmptyState
                  title="Nenhum evento na agenda"
                  description="Crie shows, ensaios e compromissos."
                  icon={<CalendarDays />}
                />
              </div>
            )}
            {upcomingEvents.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="text-sm font-bold leading-none">
                      {new Date(event.startDateTime).getDate()}
                    </span>
                    <span className="text-[10px] font-medium uppercase leading-none">
                      {new Date(event.startDateTime).toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {eventTypeLabel[event.type]} •{' '}
                      {new Date(event.startDateTime).toLocaleString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <Megaphone className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Solicitações recentes */}
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 px-5 py-4">
            <CardTitle className="text-base font-semibold">Solicitações recentes</CardTitle>
            <Link
              to="/artist/shows"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver shows <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {(recentBookings?.items.length ?? 0) === 0 && (
              <div className="p-6">
                <EmptyState
                  title="Nenhuma solicitação ainda"
                  description="Quando um contratante se interessar, aparece aqui."
                  icon={<Megaphone />}
                />
              </div>
            )}
            {recentBookings?.items.map((booking) => (
              <Link
                key={booking.id}
                to={`/artist/shows/${booking.id}`}
                className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-muted/40"
              >
                <div>
                  <p className="text-sm font-medium">{booking.contractorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(booking.eventDate + 'T00:00:00').toLocaleDateString('pt-BR')} •{' '}
                    {booking.startTime.slice(0, 5)}
                  </p>
                </div>
                <BookingStatusBadge status={booking.status} />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
