import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Heart,
  Search,
} from 'lucide-react'
import { bookingsApi, favoritesApi } from '@/services'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BookingStatusBadge,
  EventStatusBadge,
  EmptyState,
  eventTypeLabel,
} from '@/components/badges'
import { StatCard } from '@/pages/artist/ArtistDashboardPage'
import { cn, formatDate, formatTime } from '@/lib/utils'
import type { Booking } from '@/types'

/* ─────────────────────────── Dashboard ─────────────────────────── */

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

/* ─────────────────────────── Eventos (Agenda + Lista Paginada) ─────────────────────────── */

type View = 'month' | 'week' | 'day'

const PER_PAGE = 5

export function ContractorEventsPage() {
  /* ── estado da agenda ── */
  const [view, setView] = useState<View>('month')
  const [cursor, setCursor] = useState(new Date())

  /* ── estado da lista paginada ── */
  const [page, setPage] = useState(1)

  /* ── busca bookings confirmados + concluídos (para agenda e lista) ── */
  const { data: confirmedData } = useQuery({
    queryKey: ['bookings', 'confirmed-events'],
    queryFn: async () => (await bookingsApi.list('Confirmed', 1, 200)).data,
  })
  const { data: completedData } = useQuery({
    queryKey: ['bookings', 'completed-events'],
    queryFn: async () => (await bookingsApi.list('Completed', 1, 200)).data,
  })

  const allBookings = useMemo(
    () =>
      [...(confirmedData?.items ?? []), ...(completedData?.items ?? [])].sort(
        (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
      ),
    [confirmedData, completedData],
  )

  /* ── range do calendário ── */
  const range = useMemo(() => {
    if (view === 'month') return { from: startOfMonth(cursor), to: endOfMonth(cursor) }
    if (view === 'week')
      return { from: startOfWeek(cursor, { weekStartsOn: 0 }), to: endOfWeek(cursor, { weekStartsOn: 0 }) }
    return { from: cursor, to: cursor }
  }, [view, cursor])

  const days = useMemo(() => {
    const list: Date[] = []
    let d = range.from
    while (d <= range.to) {
      list.push(d)
      d = addDays(d, 1)
    }
    return list
  }, [range])

  /* Mapeia bookings por data do evento para o calendário */
  const bookingsByDay = useMemo(() => {
    const map = new Map<string, Booking[]>()
    for (const b of allBookings) {
      const key = b.eventDate // já é yyyy-MM-dd
      map.set(key, [...(map.get(key) ?? []), b])
    }
    return map
  }, [allBookings])

  /* ── paginação da lista ── */
  const total = allBookings.length
  const totalPaginas = Math.max(1, Math.ceil(total / PER_PAGE))
  const paginatedItems = useMemo(
    () => allBookings.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [allBookings, page],
  )

  const paginas: (number | '…')[] = useMemo(() => {
    if (totalPaginas <= 7) return Array.from({ length: totalPaginas }, (_, i) => i + 1)
    const janela = Math.min(Math.max(page - 2, 2), totalPaginas - 3)
    return [1, '…', janela, janela + 1, janela + 2, '…', totalPaginas]
  }, [page, totalPaginas])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Eventos</h1>
        <p className="text-sm text-muted-foreground">Shows confirmados e realizados</p>
      </div>

      {/* ════════ Agenda / Calendário ════════ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Agenda</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={view} onValueChange={(v) => setView(v as View)}>
                <SelectTrigger className="w-28 h-8 text-xs sm:w-32 sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Mês</SelectItem>
                  <SelectItem value="week">Semana</SelectItem>
                  <SelectItem value="day">Dia</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  setCursor(view === 'month' ? addMonths(cursor, -1) : addDays(cursor, view === 'week' ? -7 : -1))
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  setCursor(view === 'month' ? addMonths(cursor, 1) : addDays(cursor, view === 'week' ? 7 : 1))
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <p className="mb-3 text-sm font-medium capitalize">
            {view === 'month'
              ? format(cursor, 'MMMM yyyy', { locale: ptBR })
              : view === 'week'
                ? `${format(range.from, 'dd MMM', { locale: ptBR })} – ${format(range.to, 'dd MMM yyyy', { locale: ptBR })}`
                : format(cursor, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>

          {view === 'month' ? (
            <>
              <div className="grid grid-cols-7 gap-px text-center text-xs font-medium text-muted-foreground">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                  <div key={d} className="py-2">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px">
                {days.map((day) => {
                  const key = format(day, 'yyyy-MM-dd')
                  const dayBookings = bookingsByDay.get(key) ?? []
                  const isToday = key === format(new Date(), 'yyyy-MM-dd')
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setCursor(day)
                        setView('day')
                      }}
                      className={cn(
                        'min-h-16 sm:min-h-24 rounded-md border p-1.5 text-left align-top hover:bg-accent',
                        isToday && 'border-primary',
                      )}
                    >
                      <span className={cn('text-xs', isToday && 'font-bold text-primary')}>
                        {format(day, 'd')}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {dayBookings.slice(0, 2).map((b) => (
                          <p
                            key={b.id}
                            className={cn(
                              'truncate rounded px-1 py-0.5 text-[10px]',
                              b.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-primary/10 text-primary',
                            )}
                          >
                            {b.startTime.slice(0, 5)} {b.artistName}
                          </p>
                        ))}
                        {dayBookings.length > 2 && (
                          <p className="px-1 text-[10px] text-muted-foreground">
                            +{dayBookings.length - 2} mais
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            /* Semana / Dia */
            <div className="space-y-3">
              {days.map((day) => {
                const key = format(day, 'yyyy-MM-dd')
                const dayBookings = bookingsByDay.get(key) ?? []
                return (
                  <div key={key} className="rounded-md border p-3">
                    <p className="mb-2 text-sm font-medium capitalize">
                      {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </p>
                    {dayBookings.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem eventos.</p>
                    ) : (
                      <div className="space-y-2">
                        {dayBookings.map((b) => (
                          <Link
                            key={b.id}
                            to={`/contractor/solicitacoes/${b.id}`}
                            className="flex items-center justify-between rounded-md border p-3 hover:bg-accent"
                          >
                            <div>
                              <p className="text-sm font-medium">{b.artistName}</p>
                              <p className="text-xs text-muted-foreground">
                                {eventTypeLabel[b.eventType]} • {b.startTime.slice(0, 5)} – {b.endTime.slice(0, 5)}
                                {b.location ? ` • ${b.location}` : ''}
                              </p>
                            </div>
                            <EventStatusBadge status={b.status === 'Confirmed' ? 'Confirmed' : 'Completed'} />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {allBookings.length === 0 && (
                <EmptyState title="Nenhum evento no período" icon={<CalendarRange />} />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ════════ Lista Paginada ════════ */}
      {allBookings.length === 0 ? (
        <EmptyState
          title="Nenhum evento confirmado"
          description="Aceite uma proposta para confirmar um evento."
          icon={<CalendarRange />}
        />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Todos os eventos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {paginatedItems.map((booking) => (
              <Link key={booking.id} to={`/contractor/solicitacoes/${booking.id}`}>
                <Card className="mb-2 hover:shadow-md">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{booking.artistName}</p>
                        <p className="text-sm text-muted-foreground">
                          {eventTypeLabel[booking.eventType]} • {formatDate(booking.eventDate)} • {formatTime(booking.startTime)} – {formatTime(booking.endTime)} • {booking.location}
                        </p>
                      </div>
                      <EventStatusBadge status={booking.status === 'Confirmed' ? 'Confirmed' : 'Completed'} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {/* Paginação */}
            <div className="flex flex-col items-center gap-2 pt-2 sm:flex-row sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Total de {total} evento{total !== 1 ? 's' : ''}
              </p>
              {totalPaginas > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    title="Página anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {paginas.map((p, i) =>
                    p === '…' ? (
                      <span key={`elipse-${i}`} className="px-1 text-muted-foreground">
                        …
                      </span>
                    ) : (
                      <Button
                        key={p}
                        variant={p === page ? 'default' : 'outline'}
                        size="icon"
                        className="h-8 w-8 text-xs"
                        onClick={() => setPage(p as number)}
                      >
                        {p}
                      </Button>
                    ),
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
                    disabled={page >= totalPaginas}
                    title="Próxima página"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
