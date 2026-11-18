import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { ArrowLeft, CalendarDays, Clock, ExternalLink, Loader2, MapPin, Ticket, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate, formatMoney, formatTime, toDateInput } from '@/lib/utils'
import { ticketEventsApi, type EventTicket, type TicketEvent } from '@/services'
import { extractApiError } from '@/services/api'
import { BuyTicketModal } from './BuyTicketModal'

/** "sábado, 20 de dezembro de 2026" */
function longDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

type SalesState = 'soon' | 'open' | 'closed'

function salesState(t: EventTicket): SalesState {
  const today = toDateInput()
  if (today < t.salesStartDate) return 'soon'
  if (today > t.salesEndDate) return 'closed'
  return 'open'
}

const SALES_LABEL: Record<SalesState, { text: string; className: string }> = {
  soon: { text: 'Vendas em breve', className: 'bg-amber-500/10 text-amber-500' },
  open: { text: 'Vendas abertas', className: 'bg-emerald-500/10 text-emerald-500' },
  closed: { text: 'Vendas encerradas', className: 'bg-muted text-muted-foreground' },
}

function TicketCard({ ticket, onBuy }: { ticket: EventTicket; onBuy: (t: EventTicket) => void }) {
  const state = salesState(ticket)
  const label = SALES_LABEL[state]
  const soldOut = ticket.available <= 0
  return (
    <li className="space-y-3 rounded-xl border border-border/50 bg-background/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold leading-snug">{ticket.title}</h3>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${label.className}`}>
            {label.text}
          </span>
        </div>
        <p className="shrink-0 text-lg font-extrabold">{ticket.buyerPrice === 0 ? 'Gratuito' : formatMoney(ticket.buyerPrice)}</p>
      </div>
      {ticket.description && <p className="whitespace-pre-line text-sm text-muted-foreground">{ticket.description}</p>}
      <p className="text-xs text-muted-foreground">
        Vendas de {formatDate(ticket.salesStartDate)} até {formatDate(ticket.salesEndDate)} · {ticket.available} disponíve{ticket.available === 1 ? 'l' : 'is'}
      </p>
      <Button className="w-full" disabled={state !== 'open' || soldOut} onClick={() => onBuy(ticket)}>
        {soldOut ? 'Esgotado' : state === 'closed' ? 'Vendas encerradas' : state === 'soon' ? 'Vendas em breve' : 'Comprar ingresso'}
      </Button>
    </li>
  )
}

function EventContent({ ev }: { ev: TicketEvent }) {
  const sameDay = ev.startDate === ev.endDate
  const address = `${ev.street}, ${ev.number}${ev.complement ? ` – ${ev.complement}` : ''} · ${ev.neighborhood}, ${ev.city}/${ev.state} · CEP ${ev.cep}`
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${ev.street}, ${ev.number}, ${ev.neighborhood}, ${ev.city} - ${ev.state}, ${ev.cep}`
  )}`
  const tickets = ev.tickets ?? []
  const [buying, setBuying] = useState<EventTicket | null>(null)

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:py-12">
      <Link to="/eventos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/40">
        {ev.imageUrl && <img src={ev.imageUrl} alt={ev.name} className="aspect-[16/9] max-h-[28rem] w-full object-cover" />}
        <div className="space-y-3 p-6 sm:p-8">
          <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            {ev.category}
          </span>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{ev.name}</h1>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-8">
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-card/40 p-5">
              <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="text-sm">
                <p className="font-semibold">Data e horário</p>
                {sameDay ? (
                  <>
                    <p className="capitalize text-muted-foreground">{longDate(ev.startDate)}</p>
                    <p className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> {formatTime(ev.startTime)} às {formatTime(ev.endTime)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">
                      Início: <span className="capitalize">{longDate(ev.startDate)}</span>, {formatTime(ev.startTime)}
                    </p>
                    <p className="text-muted-foreground">
                      Término: <span className="capitalize">{longDate(ev.endDate)}</span>, {formatTime(ev.endTime)}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-card/40 p-5">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 text-sm">
                <p className="font-semibold">{ev.venue}</p>
                <p className="text-muted-foreground">{address}</p>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  Ver no mapa <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold">Sobre o evento</h2>
            <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{ev.description}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold">Produtor</h2>
            <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-card/40 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 text-sm">
                <p className="font-semibold">{ev.producerName}</p>
                <p className="mt-1 whitespace-pre-line text-muted-foreground">{ev.producerDescription}</p>
              </div>
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-4 rounded-2xl border border-border/50 bg-card/50 p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Ticket className="h-5 w-5 text-primary" /> Ingressos
            </h2>
            {tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">Os ingressos deste evento ainda não foram disponibilizados.</p>
            ) : (
              <ul className="space-y-3">
                {tickets.map((t) => (
                  <TicketCard key={t.id} ticket={t} onBuy={setBuying} />
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
      <BuyTicketModal eventId={ev.id} ticket={buying} onOpenChange={(o) => !o && setBuying(null)} />
    </main>
  )
}

/** Página pública do evento — link compartilhável, não exige login. */
export function TicketEventPage() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['ticket-event-public', id],
    queryFn: async () => (await ticketEventsApi.getPublic(id!)).data,
    enabled: !!id,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data) {
    const notFound = axios.isAxiosError(error) && error.response?.status === 404
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
        <Ticket className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-bold">{notFound ? 'Evento não encontrado' : 'Não foi possível carregar o evento'}</h1>
        <p className="text-sm text-muted-foreground">
          {notFound ? 'O link pode estar incorreto ou o evento foi removido.' : extractApiError(error)}
        </p>
        <Button asChild variant="outline">
          <Link to="/eventos">Ir para o emissor de ingressos</Link>
        </Button>
      </div>
    )
  }

  return <EventContent ev={data} />
}
