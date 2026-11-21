import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CalendarDays,
  Copy,
  Eye,
  Loader2,
  Search,
  TestTube,
  Ticket,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/badges'
import { formatDate, formatMoney, formatTime } from '@/lib/utils'
import {
  adminTicketEventsApi,
  type AdminTicketEvent,
  type TicketEvent,
} from '@/services'
import { extractApiError } from '@/services/api'
import { Manager } from '@/pages/public/tickets/TicketEventManagePage'

type View = 'list' | 'manage' | 'test-ticket'

export function AdminTicketEventsPage() {
  const [view, setView] = useState<View>('list')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const { data: events, isLoading, isError, error } = useQuery({
    queryKey: ['admin-ticket-events'],
    queryFn: async () => (await adminTicketEventsApi.list()).data,
  })

  const filtered = (events ?? []).filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase())
      || e.ownerUserName.toLowerCase().includes(search.toLowerCase())
      || e.ownerUserEmail.toLowerCase().includes(search.toLowerCase())
      || e.city.toLowerCase().includes(search.toLowerCase())
  )

  if (view === 'manage' && selectedEventId) {
    return <Manager id={selectedEventId} isAdmin />
  }

  if (view === 'test-ticket' && selectedEventId) {
    return (
      <TestTicketView
        eventId={selectedEventId}
        onBack={() => { setView('list'); setSelectedEventId(null) }}
      />
    )
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Ingressos — Admin</h1>
        <p className="text-sm text-muted-foreground">Todos os eventos de ingressos da plataforma</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, dono ou cidade..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Erro ao carregar eventos: {extractApiError(error)}
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <EmptyState icon={<Ticket className="h-10 w-10" />} title="Nenhum evento encontrado" description={search ? 'Tente outro termo de busca.' : 'Nenhum evento de ingresso foi criado ainda.'} />
      )}

      <div className="space-y-3">
        {filtered.map(ev => (
          <EventCard
            key={ev.id}
            event={ev}
            onManage={() => { setSelectedEventId(ev.id); setView('manage') }}
            onTestTicket={() => { setSelectedEventId(ev.id); setView('test-ticket') }}
          />
        ))}
      </div>
    </div>
  )
}

function EventCard({ event: ev, onManage, onTestTicket }: {
  event: AdminTicketEvent
  onManage: () => void
  onTestTicket: () => void
}) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          {ev.imageUrl && (
            <img
              src={ev.imageUrl}
              alt={ev.name}
              className="h-20 w-20 shrink-0 rounded-lg object-cover"
            />
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="truncate text-base font-semibold">{ev.name}</h3>
            <p className="text-xs text-muted-foreground">
              <CalendarDays className="mr-1 inline h-3 w-3" />
              {formatDate(ev.startDate)} às {formatTime(ev.startTime)} · {ev.city}/{ev.state}
            </p>
            <p className="text-xs text-muted-foreground">
              <Users className="mr-1 inline h-3 w-3" />
              Dono: <span className="font-medium text-foreground">{ev.ownerUserName}</span> ({ev.ownerUserEmail})
            </p>
            <div className="flex flex-wrap gap-3 pt-1 text-xs">
              <span className="rounded-full bg-muted px-2 py-0.5">
                <Ticket className="mr-1 inline h-3 w-3" />
                {ev.totalSold}/{ev.totalTickets} vendidos
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5">
                Receita: {formatMoney(ev.grossRevenue)}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5">
                {ev.category}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2 self-end sm:flex-col sm:self-center">
            <Button size="sm" variant="default" className="gap-1.5" onClick={onManage}>
              <Eye className="h-4 w-4" /> Gerenciar
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={onTestTicket}>
              <TestTube className="h-4 w-4" /> Teste
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TestTicketView({ eventId, onBack }: { eventId: string; onBack: () => void }) {
  const queryClient = useQueryClient()

  const { data: ev, isLoading: evLoading } = useQuery({
    queryKey: ['admin-ticket-event', eventId],
    queryFn: async () => (await adminTicketEventsApi.get(eventId)).data,
  })

  const mutation = useMutation({
    mutationFn: (eventTicketId: string) => adminTicketEventsApi.createTestTicket(eventId, eventTicketId),
    onSuccess: (res) => {
      toast.success('Ingresso de teste gerado!')
      setLastTicket(res.data)
      void queryClient.invalidateQueries({ queryKey: ['admin-ticket-events'] })
    },
    onError: (err) => toast.error(extractApiError(err)),
  })

  const [lastTicket, setLastTicket] = useState<{
    orderId: string
    issuedTicketId: string
    code: string
    ticketTitle: string
    buyerName: string
  } | null>(null)

  if (evLoading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  if (!ev) {
    return (
      <div className="space-y-4 px-4 py-8">
        <p className="text-sm text-muted-foreground">Evento não encontrado.</p>
        <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div>
        <h1 className="text-xl font-bold">Gerar ingresso de teste</h1>
        <p className="text-sm text-muted-foreground">Evento: {ev.name}</p>
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          O ingresso de teste não contabiliza vendas e é criado com dados fictícios (TESTE ADMIN).
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Selecione o tipo de ingresso:</h2>
        {ev.tickets?.map(t => (
          <Card key={t.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => mutation.mutate(t.id)}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium">{t.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatMoney(t.buyerPrice)} · {t.sold}/{t.quantity} vendidos
                </p>
              </div>
              <Button size="sm" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                Gerar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {lastTicket && (
        <Card className="border-green-500/40 bg-green-500/5">
          <CardContent className="space-y-3 p-4">
            <h3 className="text-sm font-semibold text-green-700 dark:text-green-400">Ingresso de teste gerado com sucesso!</h3>
            <div className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Tipo:</span> {lastTicket.ticketTitle}</p>
              <p><span className="text-muted-foreground">Comprador:</span> {lastTicket.buyerName}</p>
              <p className="flex items-center gap-2">
                <span className="text-muted-foreground">Código:</span>
                <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{lastTicket.code}</code>
                <button
                  onClick={() => { void navigator.clipboard.writeText(lastTicket.code); toast.success('Código copiado!') }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Use este código para testar o QR code e o check-in do evento.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
