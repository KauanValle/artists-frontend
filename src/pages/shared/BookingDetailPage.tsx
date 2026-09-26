import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, MessageSquare, Send, X } from 'lucide-react'
import { toast } from 'sonner'
import { bookingsApi, conversationsApi, proposalsApi } from '@/services'
import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { BookingStatusBadge, eventTypeLabel, proposalStatusLabel } from '@/components/badges'
import { cn, formatDate, formatDateTime, formatMoney, formatTime } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import type { CreateProposalPayload, Proposal } from '@/types'

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [proposalOpen, setProposalOpen] = useState(false)

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: async () => (await bookingsApi.get(id!)).data,
    enabled: !!id,
  })

  const [acceptOpen, setAcceptOpen] = useState(false)

  const acceptDirect = useMutation({
    mutationFn: () => bookingsApi.accept(id!),
    onSuccess: () => {
      toast.success('Solicitação aceita! Evento confirmado e receita pendente criada.')
      setAcceptOpen(false)
      invalidate()
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals', id],
    queryFn: async () => (await proposalsApi.listForBooking(id!)).data,
    enabled: !!id,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['booking', id] })
    queryClient.invalidateQueries({ queryKey: ['proposals', id] })
    queryClient.invalidateQueries({ queryKey: ['bookings'] })
  }

  const act = useMutation({
    mutationFn: async ({ action }: { action: 'negotiate' | 'reject' | 'cancel' }) => {
      if (action === 'negotiate') return bookingsApi.negotiate(id!)
      if (action === 'reject') return bookingsApi.reject(id!)
      return bookingsApi.cancel(id!)
    },
    onSuccess: invalidate,
    onError: (e) => toast.error(extractApiError(e)),
  })

  const accept = useMutation({
    mutationFn: (proposalId: string) => proposalsApi.accept(proposalId),
    onSuccess: () => {
      toast.success('Proposta aceita! Evento confirmado e agenda bloqueada.')
      invalidate()
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const rejectProposal = useMutation({
    mutationFn: (proposalId: string) => proposalsApi.reject(proposalId),
    onSuccess: () => {
      toast.info('Proposta recusada. A negociação continua aberta.')
      invalidate()
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  if (isLoading || !booking) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>
  }

  const isArtist = user?.role === 'Artist'
  const canAct = booking.status === 'Requested' || booking.status === 'Negotiating' || booking.status === 'Proposed'
  const canAcceptDirectly = isArtist && (booking.status === 'Requested' || booking.status === 'Negotiating')
  const pendingProposal = proposals.find((p) => p.status === 'Pending')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold">
              Contratação — {isArtist ? booking.contractorName : booking.artistName}
            </h1>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDate(booking.eventDate)} • {formatTime(booking.startTime)}–{formatTime(booking.endTime)} • {booking.location}
          </p>
        </div>
        {canAcceptDirectly && booking.budget !== null && (
          <Button onClick={() => setAcceptOpen(true)} disabled={acceptDirect.isPending}>
            <Check /> Aceitar diretamente
          </Button>
        )}
        {isArtist && booking.status === 'Requested' && (
          <Button variant="outline" onClick={() => act.mutate({ action: 'negotiate' })} disabled={act.isPending}>
            Iniciar negociação
          </Button>
        )}
        {isArtist && (booking.status === 'Requested' || booking.status === 'Negotiating') && (
          <Button variant="destructive" onClick={() => act.mutate({ action: 'reject' })} disabled={act.isPending}>
            Recusar
          </Button>
        )}
        {canAct && (
          <Button variant="outline" onClick={() => act.mutate({ action: 'cancel' })} disabled={act.isPending}>
            <X /> Cancelar
          </Button>
        )}
      </div>

      <Dialog open={acceptOpen} onOpenChange={(o) => !o && setAcceptOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aceitar solicitação diretamente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Confirma o show de <strong className="text-foreground">{booking.contractorName}</strong> em{' '}
              <strong className="text-foreground">{formatDate(booking.eventDate)}</strong> às{' '}
              <strong className="text-foreground">{formatTime(booking.startTime)}</strong> ({booking.location})?
            </p>
            <p>
              Valor acordado: <strong className="text-foreground">{formatMoney(booking.budget)}</strong> (orçamento
              informado pelo contratante, sem proposta formal).
            </p>
            <p>
              Ao confirmar, o evento entra na agenda como <strong className="text-foreground">Confirmado</strong>, o
              horário é bloqueado e uma receita pendente é criada no seu financeiro.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptOpen(false)}>
              Voltar
            </Button>
            <Button onClick={() => acceptDirect.mutate()} disabled={acceptDirect.isPending}>
              {acceptDirect.isPending ? 'Confirmando...' : 'Confirmar aceite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="resumo">
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="chat" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> Chat
          </TabsTrigger>
          <TabsTrigger value="docs">Equipe/Equip./Docs</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo">
          <Card>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
              <Field label="Tipo de evento" value={eventTypeLabel[booking.eventType]} />
              <Field label="Público estimado" value={booking.estimatedAudience?.toLocaleString('pt-BR') ?? '—'} />
              <Field label="Orçamento informado" value={booking.budget !== null ? formatMoney(booking.budget) : '—'} />
              <Field label="Data do evento" value={`${formatDate(booking.eventDate)} às ${formatTime(booking.startTime)}`} />
              <div className="sm:col-span-2">
                <p className="text-sm font-medium">Mensagem do contratante</p>
                <p className="mt-1 text-sm text-muted-foreground">{booking.message || '—'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financeiro" className="space-y-4">
          {isArtist && !pendingProposal && canAct && (
            <Button onClick={() => setProposalOpen(true)}>Enviar proposta</Button>
          )}
          {proposals.length === 0 && (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                {isArtist ? 'Envie uma proposta formal com itens, deslocamento e equipamentos.' : 'Aguardando a proposta do artista.'}
              </CardContent>
            </Card>
          )}
          {proposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              isContractor={!isArtist}
              onAccept={() => accept.mutate(proposal.id)}
              onReject={() => rejectProposal.mutate(proposal.id)}
              busy={accept.isPending || rejectProposal.isPending}
            />
          ))}
        </TabsContent>

        <TabsContent value="chat">
          {booking.conversationId ? (
            <ChatPanel conversationId={booking.conversationId} />
          ) : (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">Conversa não disponível.</CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="docs">
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              <p>
                Equipe, equipamentos e documentos do evento são gerenciados pelo artista na{' '}
                <Link to="/artist/agenda" className="text-primary hover:underline">
                  agenda
                </Link>{' '}
                (checklist por evento) e nas páginas de{' '}
                <Link to="/artist/equipe" className="text-primary hover:underline">
                  equipe
                </Link>{' '}
                e{' '}
                <Link to="/artist/equipamentos" className="text-primary hover:underline">
                  equipamentos
                </Link>
                . Documentos digitais ficam fora do MVP.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateProposalDialog
        open={proposalOpen}
        onClose={() => setProposalOpen(false)}
        bookingId={booking.id}
        onCreated={invalidate}
      />
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{value}</p>
    </div>
  )
}

function ProposalCard({
  proposal,
  isContractor,
  onAccept,
  onReject,
  busy,
}: {
  proposal: Proposal
  isContractor: boolean
  onAccept: () => void
  onReject: () => void
  busy: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Proposta — {formatMoney(proposal.finalAmount)}</CardTitle>
        <Badge
          variant={
            proposal.status === 'Accepted'
              ? 'success'
              : proposal.status === 'Rejected' || proposal.status === 'Expired'
                ? 'destructive'
                : 'warning'
          }
        >
          {proposalStatusLabel[proposal.status]}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5 text-sm">
          {proposal.items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span className="text-muted-foreground">{item.description}</span>
              <span>{formatMoney(item.amount)}</span>
            </div>
          ))}
          {proposal.travelCost > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deslocamento</span>
              <span>{formatMoney(proposal.travelCost)}</span>
            </div>
          )}
          {proposal.equipmentCost > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Equipamento</span>
              <span>{formatMoney(proposal.equipmentCost)}</span>
            </div>
          )}
          {proposal.discount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Desconto</span>
              <span>-{formatMoney(proposal.discount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 font-bold">
            <span>Valor final</span>
            <span>{formatMoney(proposal.finalAmount)}</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Válida até {formatDateTime(proposal.validUntil)}
          {proposal.notes ? ` • ${proposal.notes}` : ''}
        </p>
        {isContractor && proposal.status === 'Pending' && (
          <div className="mt-4 flex gap-2">
            <Button onClick={onAccept} disabled={busy}>
              Aceitar proposta
            </Button>
            <Button variant="outline" onClick={onReject} disabled={busy}>
              Recusar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function CreateProposalDialog({
  open,
  onClose,
  bookingId,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  bookingId: string
  onCreated?: () => void
}) {
  const queryClient = useQueryClient()
  const [items, setItems] = useState([{ description: '', amount: '' }])
  const [travelCost, setTravelCost] = useState('')
  const [equipmentCost, setEquipmentCost] = useState('')
  const [discount, setDiscount] = useState('')
  const [validityDays, setValidityDays] = useState('7')
  const [notes, setNotes] = useState('')

  const total =
    items.reduce((sum, i) => sum + (Number(i.amount.replace(',', '.')) || 0), 0) +
    (Number(travelCost.replace(',', '.')) || 0) +
    (Number(equipmentCost.replace(',', '.')) || 0) -
    (Number(discount.replace(',', '.')) || 0)

  const create = useMutation({
    mutationFn: (payload: CreateProposalPayload) => proposalsApi.create(payload),
    onSuccess: () => {
      toast.success('Proposta enviada ao contratante!')
      queryClient.invalidateQueries()
      onClose()
      onCreated?.()
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Enviar proposta</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate({
              bookingRequestId: bookingId,
              items: items
                .filter((i) => i.description)
                .map((i) => ({ description: i.description, amount: Number(i.amount.replace(',', '.')) || 0 })),
              travelCost: Number(travelCost.replace(',', '.')) || 0,
              equipmentCost: Number(equipmentCost.replace(',', '.')) || 0,
              discount: Number(discount.replace(',', '.')) || 0,
              validityDays: Number(validityDays) || 7,
              notes,
            })
          }}
        >
          <div className="space-y-2">
            <Label>Itens / serviços</Label>
            {items.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`Ex.: Show ${index + 1}`}
                  value={item.description}
                  onChange={(e) =>
                    setItems(items.map((it, i) => (i === index ? { ...it, description: e.target.value } : it)))
                  }
                  required={index === 0}
                />
                <Input
                  className="w-32"
                  placeholder="R$ 0,00"
                  value={item.amount}
                  onChange={(e) => setItems(items.map((it, i) => (i === index ? { ...it, amount: e.target.value } : it)))}
                />
                {items.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== index))}>
                    <X />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { description: '', amount: '' }])}>
              <Plus /> Adicionar item
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Deslocamento</Label>
              <Input value={travelCost} onChange={(e) => setTravelCost(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Equipamento</Label>
              <Input value={equipmentCost} onChange={(e) => setEquipmentCost(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Desconto</Label>
              <Input value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Validade (dias)</Label>
              <Input type="number" min={1} value={validityDays} onChange={(e) => setValidityDays(e.target.value)} />
            </div>
            <div className="flex items-end justify-between rounded-md bg-accent px-3 py-2">
              <span className="text-sm font-medium">Valor final</span>
              <span className="font-bold">{formatMoney(total)}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Condições, horários de montagem, etc." />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Enviando...' : 'Enviar proposta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Plus() {
  return <span aria-hidden>+</span>
}

export function ChatPanel({ conversationId }: { conversationId: string }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => (await conversationsApi.get(conversationId)).data,
    refetchInterval: 5000,
  })

  const send = useMutation({
    mutationFn: (content: string) => conversationsApi.send(conversationId, content),
    onSuccess: () => {
      setText('')
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] })
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.messages.length])

  return (
    <Card className="flex h-[480px] flex-col">
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-base">Conversa</CardTitle>
      </CardHeader>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {(data?.messages.length ?? 0) === 0 && (
          <p className="pt-10 text-center text-sm text-muted-foreground">
            Nenhuma mensagem ainda. Combine os detalhes da contratação por aqui.
          </p>
        )}
        {data?.messages.map((message) => {
          const mine = message.senderUserId === user?.id
          return (
            <div key={message.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[70%] rounded-lg px-3 py-2 text-sm',
                  mine ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}
              >
                <p className="whitespace-pre-line">{message.content}</p>
                <p className={cn('mt-1 text-[10px]', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                  {formatDateTime(message.sentAt)}
                  {mine && (message.isRead ? ' • lida' : ' • enviada')}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <form
        className="flex gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (text.trim()) send.mutate(text.trim())
        }}
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva uma mensagem..." />
        <Button type="submit" size="icon" disabled={send.isPending || !text.trim()}>
          <Send />
        </Button>
      </form>
    </Card>
  )
}
