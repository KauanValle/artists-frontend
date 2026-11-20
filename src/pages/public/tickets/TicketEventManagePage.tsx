import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  BarChart3,
  Copy,
  Download,
  ExternalLink,
  KeyRound,
  Loader2,
  PlusCircle,
  ScanLine,
  Search,
  Trash2,
  Pencil,
  Undo2,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, formatDateTime, formatMoney, formatTime } from '@/lib/utils'
import {
  adminTicketEventsApi,
  ticketEventsApi,
  ticketManagementApi,
  type CheckInResult,
  type EventOrder,
  type TicketEvent,
  type TicketEventStats,
} from '@/services'
import { extractApiError } from '@/services/api'
import { CheckInConsole } from './CheckInConsole'
import { EventForm, type EventSubmitData } from './EventForm'
import { TicketsLogin } from './TicketsLogin'

type Tab = 'overview' | 'orders' | 'checkin' | 'gates' | 'edit'

const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'overview', label: 'Visão geral', icon: BarChart3 },
  { id: 'orders', label: 'Pedidos', icon: Users },
  { id: 'checkin', label: 'Check-in', icon: ScanLine },
  { id: 'gates', label: 'Portaria', icon: KeyRound },
  { id: 'edit', label: 'Editar', icon: Pencil },
]

const fmtCpf = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
const fmtPhone = (v: string) => {
  const d = v.replace(/\D/g, '')
  return d.length === 11 ? d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}
const fmtGate = (code: string) => code.replace(/(.{4})(?=.)/g, '$1-')

function Progress({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

// ─────────────── Visão geral ───────────────

function Overview({ stats, ev }: { stats: TicketEventStats; ev: TicketEvent }) {
  const link = `${window.location.origin}/evento/${ev.id}`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Link do evento copiado!')
    } catch {
      toast.error('Não foi possível copiar o link.')
    }
  }
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ingressos vendidos" value={`${stats.totalSold} / ${stats.totalCapacity}`} hint={`${stats.totalReserved} reservados aguardando pagamento`} />
        <StatCard label="Arrecadado" value={formatMoney(stats.grossRevenue)} hint="Pago pelos compradores (com taxas)" />
        <StatCard label="A receber" value={formatMoney(stats.netRevenue)} hint="Valor líquido, sem a taxa administrativa" />
        <StatCard label="Entradas" value={`${stats.totalCheckedIn} / ${stats.totalSold}`} hint="Ingressos lidos na portaria" />
      </div>

      <div className="space-y-2 rounded-2xl border border-border/50 bg-card/50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold">Vendas por ingresso</h3>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link to={`/evento/${ev.id}`}>
                <ExternalLink className="h-4 w-4" /> Página pública
              </Link>
            </Button>
            <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => void copy()}>
              <Copy className="h-4 w-4" /> Copiar link
            </Button>
          </div>
        </div>
        <ul className="divide-y divide-border/50">
          {stats.types.map((t) => (
            <li key={t.ticketId} className="space-y-2 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">
                  {t.title} <span className="text-sm font-normal text-muted-foreground">· {t.buyerPrice === 0 ? 'Gratuito' : formatMoney(t.buyerPrice)}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{t.sold}</span> vendidos · {t.available} disponíveis · {t.checkedIn} entradas
                </p>
              </div>
              <Progress value={t.sold} max={t.quantity} />
              <p className="text-xs text-muted-foreground">
                Arrecadado {formatMoney(t.grossRevenue)} · a receber {formatMoney(t.netRevenue)}
              </p>
            </li>
          ))}
          {stats.types.length === 0 && <li className="py-3 text-sm text-muted-foreground">Este evento ainda não tem ingressos.</li>}
        </ul>
        {stats.pendingOrders > 0 && (
          <p className="text-xs text-muted-foreground">{stats.pendingOrders} pedido(s) aguardando pagamento dentro do prazo de reserva (30 min).</p>
        )}
      </div>
    </div>
  )
}

// ─────────────── Pedidos ───────────────

const STATUS_LABEL = (o: EventOrder) =>
  o.status === 'Paid' ? 'Pago' : o.status === 'Cancelled' ? 'Cancelado' : o.expired ? 'Reserva expirada' : 'Aguardando'

function OrdersTab({ eventId, eventName, isAdmin = false }: { eventId: string; eventName: string; isAdmin?: boolean }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'Paid' | 'pending'>('all')
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['ticket-event-orders', eventId],
    queryFn: async () => (await (isAdmin ? adminTicketEventsApi.orders(eventId) : ticketManagementApi.orders(eventId))).data,
  })

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const qd = q.replace(/\D/g, '')
    return (data ?? []).filter((o) => {
      if (filter === 'Paid' && o.status !== 'Paid') return false
      if (filter === 'pending' && o.status === 'Paid') return false
      if (!q) return true
      return (
        o.buyerName.toLowerCase().includes(q) ||
        o.buyerEmail.toLowerCase().includes(q) ||
        (qd.length > 0 && (o.buyerCpf.includes(qd) || o.buyerPhone.includes(qd)))
      )
    })
  }, [data, query, filter])

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const header = ['Nome', 'CPF', 'E-mail', 'Telefone', 'Ingresso', 'Quantidade', 'Total', 'Status', 'Pedido em', 'Pago em', 'Entradas']
    const lines = rows.map((o) =>
      [
        o.buyerName,
        fmtCpf(o.buyerCpf),
        o.buyerEmail,
        fmtPhone(o.buyerPhone),
        o.ticketTitle,
        o.quantity,
        o.totalAmount.toFixed(2).replace('.', ','),
        STATUS_LABEL(o),
        formatDateTime(o.createdAt),
        o.paidAt ? formatDateTime(o.paidAt) : '',
        `${o.checkedIn}/${o.quantity}`,
      ]
        .map(esc)
        .join(';')
    )
    const blob = new Blob(['﻿' + [header.map(esc).join(';'), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `pedidos-${eventName.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
  if (isError) return <p className="py-8 text-center text-sm text-destructive">{extractApiError(error)}</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, e-mail, CPF ou telefone" className="pl-9" />
        </div>
        <div className="flex gap-1.5">
          {(
            [
              ['all', 'Todos'],
              ['Paid', 'Pagos'],
              ['pending', 'Pendentes'],
            ] as const
          ).map(([id, label]) => (
            <Button key={id} size="sm" variant={filter === id ? 'default' : 'outline'} onClick={() => setFilter(id)}>
              {label}
            </Button>
          ))}
          <Button size="sm" variant="outline" className="gap-1.5" onClick={exportCsv} disabled={rows.length === 0}>
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((o) => (
            <li key={o.id} className="rounded-xl border border-border/50 bg-card/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{o.buyerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.buyerEmail} · {fmtPhone(o.buyerPhone)} · CPF {fmtCpf(o.buyerCpf)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    o.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : o.status === 'Cancelled' || o.expired ? 'bg-muted text-muted-foreground' : 'bg-amber-500/10 text-amber-500'
                  }`}
                >
                  {STATUS_LABEL(o)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  {o.quantity}x {o.ticketTitle}
                  {o.status === 'Paid' && <span className="text-muted-foreground"> · {o.checkedIn}/{o.quantity} entradas</span>}
                </span>
                <span className="font-bold">{o.totalAmount === 0 ? 'Gratuito' : formatMoney(o.totalAmount)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {o.paidAt ? `Pago em ${formatDateTime(o.paidAt)}` : `Pedido em ${formatDateTime(o.createdAt)}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─────────────── Check-in (produtor) ───────────────

function CheckInTab({ eventId, stats, isAdmin = false }: { eventId: string; stats: TicketEventStats; isAdmin?: boolean }) {
  const qc = useQueryClient()
  const { data: logs } = useQuery({
    queryKey: ['ticket-event-checkins', eventId],
    queryFn: async () => (await (isAdmin ? adminTicketEventsApi.checkIns(eventId) : ticketManagementApi.checkIns(eventId))).data,
    refetchInterval: 10_000,
  })
  const [counts, setCounts] = useState<{ entered: number; sold: number } | null>(null)

  const undo = useMutation({
    mutationFn: (ticketId: string) => ticketManagementApi.undoCheckIn(eventId, ticketId),
    onSuccess: () => {
      toast.success('Entrada desfeita.')
      void qc.invalidateQueries({ queryKey: ['ticket-event-checkins', eventId] })
      void qc.invalidateQueries({ queryKey: ['ticket-event-stats', eventId] })
      void qc.invalidateQueries({ queryKey: ['ticket-event-orders', eventId] })
      setCounts((c) => (c ? { ...c, entered: Math.max(0, c.entered - 1) } : c))
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const entered = counts?.entered ?? stats.totalCheckedIn
  const sold = counts?.sold ?? stats.totalSold

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/50 bg-card/50 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Entradas</span>
            <span className="text-2xl font-extrabold">
              {entered} <span className="text-base font-medium text-muted-foreground">/ {sold}</span>
            </span>
          </div>
          <div className="mt-2">
            <Progress value={entered} max={sold} />
          </div>
        </div>
        <CheckInConsole
          check={async (code) => (await ticketManagementApi.checkIn(eventId, code)).data}
          onResult={(r: CheckInResult) => {
            setCounts({ entered: r.enteredCount, sold: r.totalSold })
            void qc.invalidateQueries({ queryKey: ['ticket-event-checkins', eventId] })
            void qc.invalidateQueries({ queryKey: ['ticket-event-stats', eventId] })
            void qc.invalidateQueries({ queryKey: ['ticket-event-orders', eventId] })
          }}
        />
      </div>

      <div className="space-y-3">
        <h3 className="font-bold">Últimas entradas</h3>
        {!logs || logs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">Nenhuma entrada registrada ainda.</p>
        ) : (
          <ul className="space-y-2">
            {logs.map((l) => (
              <li key={l.ticketId} className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-card/50 p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{l.buyerName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {l.ticketTitle} · {l.sequence}/{l.quantity} · {formatDateTime(l.checkedInAt)} · {l.checkedInBy}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 gap-1.5"
                  disabled={undo.isPending}
                  onClick={() => {
                    if (window.confirm(`Desfazer a entrada de ${l.buyerName}? O ingresso poderá ser lido de novo.`)) undo.mutate(l.ticketId)
                  }}
                >
                  <Undo2 className="h-4 w-4" /> Desfazer
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─────────────── Portaria ───────────────

function GatesTab({ eventId, isAdmin = false }: { eventId: string; isAdmin?: boolean }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['ticket-event-gates', eventId],
    queryFn: async () => (await (isAdmin ? adminTicketEventsApi.gates(eventId) : ticketManagementApi.gates(eventId))).data,
  })

  const create = useMutation({
    mutationFn: async () => (await ticketManagementApi.createGate(eventId, name)).data,
    onSuccess: () => {
      setName('')
      toast.success('Acesso de portaria criado!')
      void qc.invalidateQueries({ queryKey: ['ticket-event-gates', eventId] })
    },
    onError: (e) => toast.error(extractApiError(e)),
  })
  const revoke = useMutation({
    mutationFn: (gateId: string) => ticketManagementApi.revokeGate(eventId, gateId),
    onSuccess: () => {
      toast.success('Acesso revogado.')
      void qc.invalidateQueries({ queryKey: ['ticket-event-gates', eventId] })
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(msg)
    } catch {
      toast.error('Não foi possível copiar.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl border border-border/50 bg-card/50 p-5">
        <div>
          <h3 className="font-bold">Novo acesso de portaria</h3>
          <p className="text-sm text-muted-foreground">
            Crie um acesso para cada pessoa ou portão e envie o link. Quem abrir lê os QR codes deste evento, sem precisar de conta, e você pode revogar a qualquer momento.
          </p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim().length >= 2 && !create.isPending) create.mutate()
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Portão A, Maria (credenciamento)" maxLength={120} />
          <Button type="submit" className="gap-1.5" disabled={name.trim().length < 2 || create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />} Criar
          </Button>
        </form>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : isError ? (
        <p className="text-center text-sm text-destructive">{extractApiError(error)}</p>
      ) : (data ?? []).length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">Nenhum acesso de portaria criado ainda.</p>
      ) : (
        <ul className="space-y-3">
          {data!.map((g) => {
            const link = `${window.location.origin}/portaria?c=${g.code}`
            const revoked = Boolean(g.revokedAt)
            return (
              <li key={g.id} className={`space-y-3 rounded-2xl border border-border/50 bg-card/50 p-4 ${revoked ? 'opacity-60' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{g.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {revoked ? `Revogado em ${formatDateTime(g.revokedAt!)}` : `Criado em ${formatDateTime(g.createdAt)}`} · {g.checkIns} entrada(s) registrada(s)
                    </p>
                  </div>
                  {!revoked && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-destructive"
                      disabled={revoke.isPending}
                      onClick={() => {
                        if (window.confirm(`Revogar o acesso "${g.name}"? Quem estiver com este código perde o acesso.`)) revoke.mutate(g.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" /> Revogar
                    </Button>
                  )}
                </div>
                {!revoked && (
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded-md bg-muted px-3 py-1.5 font-mono text-sm tracking-widest">{fmtGate(g.code)}</code>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void copy(fmtGate(g.code), 'Código copiado!')}>
                      <Copy className="h-4 w-4" /> Código
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void copy(link, 'Link da portaria copiado!')}>
                      <Copy className="h-4 w-4" /> Link
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}


// ─────────────── Editar evento ───────────────

function EditTab({ ev, onSaved }: { ev: TicketEvent; onSaved: () => void }) {
  const isTbd = ev.venue === 'A definir' || ev.cep === '00000-000'

  const initialData = {
    name: ev.name,
    imageUrl: ev.imageUrl,
    category: ev.category,
    startDate: ev.startDate,
    startTime: ev.startTime,
    endDate: ev.endDate,
    endTime: ev.endTime,
    description: ev.description,
    addressTbd: isTbd,
    cep: isTbd ? '' : ev.cep,
    venue: isTbd ? '' : ev.venue,
    street: isTbd ? '' : ev.street,
    number: isTbd ? '' : ev.number,
    complement: ev.complement ?? '',
    neighborhood: isTbd ? '' : ev.neighborhood,
    city: isTbd ? '' : ev.city,
    state: isTbd ? '' : ev.state,
    producerName: ev.producerName,
    producerDescription: ev.producerDescription,
  }

  const initialTickets = (ev.tickets ?? []).map((t) => ({
    title: t.title,
    quantity: t.quantity,
    receiveAmount: t.receiveAmount,
    salesStartDate: t.salesStartDate,
    salesEndDate: t.salesEndDate,
    description: t.description ?? '',
  }))

  const handleUpdate = async (data: EventSubmitData) => {
    try {
      await ticketEventsApi.update(ev.id, data)
      toast.success('Evento atualizado!')
      onSaved()
    } catch (e) {
      toast.error(extractApiError(e))
    }
  }

  return (
    <EventForm
      initialData={initialData}
      initialTickets={initialTickets}
      onCancel={() => onSaved()}
      onSubmit={handleUpdate}
      submitLabel="Salvar alterações"
      isEditing
    />
  )
}

// ─────────────── Página ───────────────

export function Manager({ id, isAdmin = false }: { id: string; isAdmin?: boolean }) {
  const [tab, setTab] = useState<Tab>('overview')

  const evQuery = useQuery({
    queryKey: ['ticket-event', id, isAdmin],
    queryFn: async () => (await (isAdmin ? adminTicketEventsApi.get(id) : ticketEventsApi.get(id))).data,
    retry: false,
  })
  const statsQuery = useQuery({
    queryKey: ['ticket-event-stats', id, isAdmin],
    queryFn: async () => (await (isAdmin ? adminTicketEventsApi.stats(id) : ticketManagementApi.stats(id))).data,
    refetchInterval: 15_000,
    retry: false,
  })

  if (evQuery.isLoading || statsQuery.isLoading) {
    return <div className="flex flex-1 items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }
  if (evQuery.isError || statsQuery.isError || !evQuery.data || !statsQuery.data) {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
        <h1 className="text-xl font-bold">Não foi possível abrir este evento</h1>
        <p className="text-sm text-muted-foreground">{extractApiError(evQuery.error ?? statsQuery.error)}</p>
        <Button asChild variant="outline"><Link to={isAdmin ? "/admin/ingressos" : "/eventos"}>{isAdmin ? 'Voltar' : 'Voltar para meus eventos'}</Link></Button>
      </div>
    )
  }

  const ev = evQuery.data
  const stats = statsQuery.data

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <Link to={isAdmin ? "/admin/ingressos" : "/eventos"} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {isAdmin ? 'Todos os eventos' : 'Meus eventos'}
      </Link>

      <div className="space-y-1">
        <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{ev.category}</span>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{ev.name}</h1>
        <p className="text-sm text-muted-foreground">
          {formatDate(ev.startDate)} às {formatTime(ev.startTime)} · {ev.venue} · {ev.city}/{ev.state}
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border/50 bg-card/40 p-1">
        {(isAdmin ? TABS.filter(t => t.id !== 'edit') : TABS).map(({ id: tid, label, icon: Icon }) => (
          <button
            key={tid}
            type="button"
            onClick={() => setTab(tid)}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === tid ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview stats={stats} ev={ev} />}
      {tab === 'orders' && <OrdersTab eventId={id} eventName={ev.name} isAdmin={isAdmin} />}
      {tab === 'checkin' && <CheckInTab eventId={id} stats={stats} isAdmin={isAdmin} />}
      {tab === 'gates' && <GatesTab eventId={id} isAdmin={isAdmin} />}
      {tab === 'edit' && !isAdmin && <EditTab ev={ev} onSaved={() => { void evQuery.refetch(); void statsQuery.refetch(); setTab('overview') }} />}
    </main>
  )
}

/** Gerenciar evento (produtor): visão geral, pedidos, check-in e acessos de portaria. */
export function TicketEventManagePage() {
  const { id } = useParams<{ id: string }>()
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return <div className="flex flex-1 items-center justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
  }
  if (!isAuthenticated || !user) return <TicketsLogin />
  if (!user.perfilCompleto && user.role !== 'Admin') return <Navigate to="/completar-perfil" replace />
  if (!id) return <Navigate to="/eventos" replace />
  return <Manager id={id} isAdmin={false} />
}
