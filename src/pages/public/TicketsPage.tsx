import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Loader2, MapPin, PlusCircle, Ticket, User, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ticketEventsApi, type TicketEvent } from '@/services'
import { formatDate, formatMoney, formatTime, toDateInput } from '@/lib/utils'

/**
 * /eventos — listagem pública de todos os eventos da plataforma.
 * Sem login, sem painel — apenas vitrine dos eventos.
 */
export function TicketsPage() {
  const {
    data: events = [],
    isLoading,
  } = useQuery({
    queryKey: ['public-ticket-events'],
    queryFn: async () => (await ticketEventsApi.listPublic()).data,
  })

  const today = toDateInput()
  const upcoming = events.filter((e) => e.endDate >= today)
  const past = events.filter((e) => e.endDate < today)

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            <Ticket className="h-3.5 w-3.5" /> Eventos
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">Eventos na plataforma</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Confira todos os eventos com ingressos disponíveis na Reprissa.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2 self-start">
          <Link to="/eventos/painel">
            <PlusCircle className="h-4 w-4" /> Criar seu evento
          </Link>
        </Button>
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center">
          <Ticket className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">Nenhum evento cadastrado ainda</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Em breve novos eventos aparecerão aqui.
          </p>
          <Button asChild className="mt-4 gap-2">
            <Link to="/eventos/painel">
              <PlusCircle className="h-4 w-4" /> Criar o primeiro evento
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-10">
          {upcoming.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-bold">Próximos eventos</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((ev) => (
                  <EventCard key={ev.id} event={ev} />
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-bold text-muted-foreground">Eventos encerrados</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 opacity-60">
                {past.map((ev) => (
                  <EventCard key={ev.id} event={ev} past />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function EventCard({ event: ev, past }: { event: TicketEvent; past?: boolean }) {
  const today = toDateInput()
  const sameDay = ev.startDate === ev.endDate

  const totalAvailable = (ev.tickets ?? []).reduce((sum, t) => {
    if (today < t.salesStartDate || today > t.salesEndDate) return sum
    return sum + t.available
  }, 0)
  const cheapest = (ev.tickets ?? [])
    .filter((t) => today >= t.salesStartDate && today <= t.salesEndDate && t.available > 0)
    .sort((a, b) => a.buyerPrice - b.buyerPrice)[0]

  return (
    <Link
      to={`/evento/${ev.id}`}
      className="group overflow-hidden rounded-2xl border border-border/50 bg-card/60 transition-all hover:border-primary/40 hover:shadow-lg"
    >
      {ev.imageUrl ? (
        <img
          src={ev.imageUrl}
          alt={ev.name}
          className="aspect-[16/9] w-full object-cover transition-transform group-hover:scale-[1.02]"
          loading="lazy"
        />
      ) : (
        <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
          <Ticket className="h-12 w-12 text-primary/30" />
        </div>
      )}

      <div className="space-y-3 p-4">
        <div>
          <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {ev.category}
          </span>
          <h3 className="mt-1.5 font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {ev.name}
          </h3>
        </div>

        <div className="space-y-1 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary" />
            {sameDay
              ? `${formatDate(ev.startDate)} · ${formatTime(ev.startTime)} - ${formatTime(ev.endTime)}`
              : `${formatDate(ev.startDate)} - ${formatDate(ev.endDate)}`}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate">{ev.venue} · {ev.city}/{ev.state}</span>
          </p>
          <p className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate">{ev.producerName}</span>
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-border/50 pt-3">
          {past ? (
            <span className="text-xs font-medium text-muted-foreground">Encerrado</span>
          ) : cheapest ? (
            <span className="text-sm font-bold">
              {cheapest.buyerPrice === 0 ? 'Gratuito' : `A partir de ${formatMoney(cheapest.buyerPrice)}`}
            </span>
          ) : totalAvailable === 0 ? (
            <span className="text-xs font-medium text-muted-foreground">Esgotado</span>
          ) : (
            <span className="text-xs text-muted-foreground">Vendas em breve</span>
          )}
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
        </div>
      </div>
    </Link>
  )
}
