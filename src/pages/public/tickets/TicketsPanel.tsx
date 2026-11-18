import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { CalendarDays, Copy, ExternalLink, Loader2, MapPin, PlusCircle, Settings2, Ticket, Trash2, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { cn, formatDate, formatMoney, formatTime } from '@/lib/utils'
import { ticketEventsApi } from '@/services'
import { extractApiError } from '@/services/api'
import { EventForm, type EventSubmitData } from './EventForm'

type View = 'create' | 'list'

const QUERY_KEY = ['ticket-events']

/** Painel do emissor de ingressos — o mesmo para artistas e contratantes. */
export function TicketsPanel() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [view, setView] = useState<View>('list')
  // muda a cada evento criado para zerar o formulário
  const [formKey, setFormKey] = useState(0)

  const {
    data: events = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => (await ticketEventsApi.list()).data,
  })

  const create = useMutation({
    mutationFn: async (data: EventSubmitData) => (await ticketEventsApi.create(data)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      setFormKey((k) => k + 1)
      setView('list')
      toast.success('Evento criado!')
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => ticketEventsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success('Evento removido.')
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const handleCreate = async (data: EventSubmitData) => {
    try {
      await create.mutateAsync(data)
    } catch {
      /* o erro já é exibido pelo onError da mutation */
    }
  }

  const copyLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/evento/${id}`)
      toast.success('Link do evento copiado!')
    } catch {
      toast.error('Não foi possível copiar o link.')
    }
  }

  const handleRemove = (id: string, name: string) => {
    if (window.confirm(`Remover o evento "${name}"?`)) remove.mutate(id)
  }

  const tabClass = (active: boolean) =>
    cn(
      'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
      active ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
    )

  return (
    <section className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:py-14">
      <div>
        <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
          <Ticket className="h-3.5 w-3.5" /> Emissor de ingressos
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight">Painel de eventos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Olá, {user?.displayName}. Crie e acompanhe seus eventos.</p>
      </div>

      <div className="inline-flex gap-1 rounded-xl border border-border/50 bg-card/50 p-1" role="tablist">
        <button type="button" role="tab" aria-selected={view === 'create'} className={tabClass(view === 'create')} onClick={() => setView('create')}>
          <PlusCircle className="h-4 w-4" /> Criar evento
        </button>
        <button type="button" role="tab" aria-selected={view === 'list'} className={tabClass(view === 'list')} onClick={() => setView('list')}>
          <CalendarDays className="h-4 w-4" /> Meus eventos ({events.length})
        </button>
      </div>

      {view === 'create' ? (
        <EventForm key={formKey} onCancel={() => setView('list')} onSubmit={handleCreate} />
      ) : isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-destructive/40 p-8 text-center">
          <p className="font-semibold">Não foi possível carregar seus eventos</p>
          <p className="mt-1 text-sm text-muted-foreground">{extractApiError(error)}</p>
          <Button className="mt-4" variant="outline" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center">
          <Ticket className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">Nenhum evento criado ainda</p>
          <p className="mt-1 text-sm text-muted-foreground">Crie o seu primeiro evento para começar.</p>
          <Button className="mt-4 gap-2" onClick={() => setView('create')}>
            <PlusCircle className="h-4 w-4" /> Criar evento
          </Button>
        </div>
      ) : (
        <>
        <div className="flex justify-end">
          <Button className="gap-2" onClick={() => setView('create')}>
            <PlusCircle className="h-4 w-4" /> Criar evento
          </Button>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {events.map((ev) => (
            <li key={ev.id} className="overflow-hidden rounded-2xl border border-border/50 bg-card/50">
              {ev.imageUrl && <img src={ev.imageUrl} alt={ev.name} className="aspect-[16/9] w-full object-cover" loading="lazy" />}
              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {ev.category}
                    </span>
                    <h3 className="mt-1.5 font-bold leading-snug">{ev.name}</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Remover ${ev.name}`}
                    disabled={remove.isPending || (ev.tickets ?? []).some((t) => t.sold > 0)}
                    title={(ev.tickets ?? []).some((t) => t.sold > 0) ? 'Eventos com ingressos vendidos não podem ser removidos' : undefined}
                    onClick={() => handleRemove(ev.id, ev.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>
                      {formatDate(ev.startDate)} {formatTime(ev.startTime)} até {formatDate(ev.endDate)} {formatTime(ev.endTime)}
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>
                      {ev.venue} — {ev.street}, {ev.number}
                      {ev.complement ? ` (${ev.complement})` : ''} · {ev.neighborhood}, {ev.city}/{ev.state}
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <User className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{ev.producerName}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-border/50 pt-3">
                  <Button asChild size="sm" variant="outline" className="gap-2">
                    <Link to={`/evento/${ev.id}`}>
                      <ExternalLink className="h-4 w-4" /> Ver página
                    </Link>
                  </Button>
                  <Button asChild size="sm" className="gap-2">
                    <Link to={`/eventos/${ev.id}/gerenciar`}>
                      <Settings2 className="h-4 w-4" /> Gerenciar
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-2" onClick={() => void copyLink(ev.id)}>
                    <Copy className="h-4 w-4" /> Copiar link
                  </Button>
                </div>
                {(ev.tickets?.length ?? 0) > 0 && (
                  <ul className="space-y-1 border-t border-border/50 pt-3 text-sm">
                    {ev.tickets?.map((tk) => (
                      <li key={tk.id} className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate">
                          {tk.title} <span className="text-muted-foreground">· {tk.sold}/{tk.quantity} vendidos</span>
                        </span>
                        <span className="shrink-0 font-semibold">{tk.buyerPrice === 0 ? 'Gratuito' : formatMoney(tk.buyerPrice)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
        </>
      )}
    </section>
  )
}
