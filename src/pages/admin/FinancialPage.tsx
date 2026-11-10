import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { endOfMonth, endOfYear, startOfMonth, startOfYear } from 'date-fns'
import { BadgeDollarSign, CircleDollarSign, Clock, Plus, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { bookingsApi, brandingApi, eventsApi, financialApi } from '@/services'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState, TransactionStatusBadge } from '@/components/badges'
import { StatCard } from '@/pages/artist/ArtistDashboardPage'
import { formatDate, formatMoney, toDateInput } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import type { TransactionType } from '@/types'

type Period = 'month' | 'year' | 'all' | 'custom'

export function FinancialAdminPage() {
  const queryClient = useQueryClient()
  const [period, setPeriod] = useState<Period>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const { from, to } = useMemo(() => {
    const now = new Date()
    if (period === 'month') return { from: startOfMonth(now), to: endOfMonth(now) }
    if (period === 'year') return { from: startOfYear(now), to: endOfYear(now) }
    if (period === 'custom' && customFrom && customTo)
      return { from: new Date(customFrom + 'T00:00:00'), to: new Date(customTo + 'T00:00:00') }
    return { from: null, to: null }
  }, [period, customFrom, customTo])

  const fmt = (d: Date | null) => (d ? toDateInput(d) : undefined)

  /* ── Dados financeiros existentes ── */
  const { data: summary } = useQuery({
    queryKey: ['financial-summary', from?.toISOString(), to?.toISOString()],
    queryFn: async () => (await financialApi.summary(fmt(from), fmt(to))).data,
  })

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', from?.toISOString(), to?.toISOString()],
    queryFn: async () => (await financialApi.list({ from: fmt(from), to: fmt(to), pageSize: 100 })).data,
  })

  /* ── Dados de bookings para os cards de negócio ── */
  const { data: confirmedBookings } = useQuery({
    queryKey: ['admin-bookings-confirmed'],
    queryFn: async () => (await bookingsApi.list('Confirmed', 1, 200)).data,
  })

  const { data: awaitingPaymentBookings } = useQuery({
    queryKey: ['admin-bookings-awaiting-payment'],
    queryFn: async () => (await bookingsApi.list('AwaitingPayment', 1, 200)).data,
  })

  const { data: taxaData } = useQuery({
    queryKey: ['admin-taxa'],
    queryFn: async () => (await brandingApi.getTaxaAdministrativa()).data,
  })

  const taxaPct = taxaData?.percentual ?? 0

  /* ── Cálculos de negócio ── */
  const businessMetrics = useMemo(() => {
    const confirmed = confirmedBookings?.items ?? []
    const awaiting = awaitingPaymentBookings?.items ?? []

    // Valor total dos shows confirmados (budget de cada booking confirmado)
    const valorShowsConfirmados = confirmed.reduce((acc, b) => acc + (b.budget ?? 0), 0)

    // Taxa administrativa sobre os shows confirmados
    const taxaShowsConfirmados = valorShowsConfirmados * (taxaPct / 100)

    // Valor dos shows pendentes de pagamento
    const valorPendentePagamento = awaiting.reduce((acc, b) => acc + (b.budget ?? 0), 0)

    return { valorShowsConfirmados, taxaShowsConfirmados, valorPendentePagamento }
  }, [confirmedBookings, awaitingPaymentBookings, taxaPct])

  const settle = useMutation({
    mutationFn: (id: string) => financialApi.settle(id),
    onSuccess: () => {
      toast.success('Transação atualizada!')
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] })
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Receitas, despesas, resultado e contas a receber</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="w-full justify-start overflow-x-auto scrollbar-none flex-nowrap">
              <TabsTrigger value="month" className="shrink-0 px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm">Mês</TabsTrigger>
              <TabsTrigger value="year" className="shrink-0 px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm">Ano</TabsTrigger>
              <TabsTrigger value="all" className="shrink-0 px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm">Tudo</TabsTrigger>
              <TabsTrigger value="custom" className="shrink-0 px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm">Período</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="h-4 w-4" /> Nova transação
          </Button>
        </div>
      </div>

      {period === 'custom' && (
        <div className="flex gap-3">
          <Input type="date" className="w-40" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          <Input type="date" className="w-40" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
        </div>
      )}

      {/* ═══ Cards de regra de negócio (bookings) ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resumo de Shows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              title="Shows confirmados"
              value={formatMoney(businessMetrics.valorShowsConfirmados)}
              hint={`${confirmedBookings?.items?.length ?? 0} show(s)`}
              icon={<CircleDollarSign className="h-4 w-4 text-emerald-600" />}
            />
            <StatCard
              title="Taxas administrativas"
              value={formatMoney(businessMetrics.taxaShowsConfirmados)}
              hint={`${taxaPct}% sobre confirmados`}
              icon={<BadgeDollarSign className="h-4 w-4 text-blue-600" />}
            />
            <StatCard
              title="Pendente de pagamento"
              value={formatMoney(businessMetrics.valorPendentePagamento)}
              hint={`${awaitingPaymentBookings?.items?.length ?? 0} show(s)`}
              icon={<Clock className="h-4 w-4 text-amber-600" />}
            />
          </div>
        </CardContent>
      </Card>

      {/* ═══ Cards financeiros existentes ═══ */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        <StatCard title="Receita prevista" value={formatMoney(summary?.incomeExpected)} hint="Inclui pendentes" />
        <StatCard title="Recebido" value={formatMoney(summary?.incomeReceived)} />
        <StatCard title="Despesas" value={formatMoney(summary?.expenseTotal)} hint={`Pagas: ${formatMoney(summary?.expensePaid)}`} />
        <StatCard title="Contas a receber" value={formatMoney(summary?.accountsReceivable)} hint="Pendentes + atrasadas" />
        <StatCard title="Resultado" value={formatMoney(summary?.result)} hint="Recebido − pago" />
      </div>

      {/* ═══ Tabela de transações ═══ */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-10 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : (transactions?.items.length ?? 0) === 0 ? (
            <div className="p-6">
              <EmptyState title="Nenhuma transação no período" icon={<Wallet />} />
            </div>
          ) : (
            <>
            {/* Mobile card list */}
            <div className="sm:hidden divide-y">
              {transactions!.items.map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${t.type === 'Income' ? 'text-emerald-600' : 'text-destructive'}`}>
                        {t.type === 'Income' ? 'Receita' : 'Despesa'}
                      </span>
                      <TransactionStatusBadge status={t.status} />
                    </div>
                    <p className="mt-1 font-medium">{t.category}</p>
                    {t.eventTitle && <p className="text-xs text-muted-foreground">{t.eventTitle}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">Venc. {formatDate(t.dueDate)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-medium">{formatMoney(t.amount)}</p>
                    {(t.status === 'Pending' || t.status === 'Overdue') && (
                      <Button variant="outline" size="sm" className="mt-2 text-xs h-7" onClick={() => settle.mutate(t.id)}>
                        {t.type === 'Income' ? 'Recebida' : 'Paga'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3 font-medium">Descrição</th>
                  <th className="p-3 font-medium">Tipo</th>
                  <th className="p-3 font-medium">Vencimento</th>
                  <th className="p-3 font-medium text-right">Valor</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {transactions!.items.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-accent/50">
                    <td className="p-3">
                      <p className="font-medium">{t.category}</p>
                      {t.eventTitle && <p className="text-xs text-muted-foreground">{t.eventTitle}</p>}
                    </td>
                    <td className="p-3">
                      <span className={t.type === 'Income' ? 'text-emerald-600' : 'text-destructive'}>
                        {t.type === 'Income' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className="p-3">{formatDate(t.dueDate)}</td>
                    <td className="p-3 text-right font-medium">{formatMoney(t.amount)}</td>
                    <td className="p-3">
                      <TransactionStatusBadge status={t.status} />
                    </td>
                    <td className="p-3 text-right">
                      {(t.status === 'Pending' || t.status === 'Overdue') && (
                        <Button variant="outline" size="sm" onClick={() => settle.mutate(t.id)}>
                          {t.type === 'Income' ? 'Marcar recebida' : 'Marcar paga'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <CreateTransactionDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['transactions'] })
          queryClient.invalidateQueries({ queryKey: ['financial-summary'] })
        }}
      />
    </div>
  )
}

function CreateTransactionDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated?: () => void
}) {
  const [type, setType] = useState<TransactionType>('Income')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [eventId, setEventId] = useState('')

  const { data: events = [] } = useQuery({
    queryKey: ['events-all-for-financial'],
    queryFn: async () => (await eventsApi.list({})).data,
    enabled: open,
  })

  const create = useMutation({
    mutationFn: () =>
      financialApi.create({
        type,
        category,
        amount: Number(amount.replace(',', '.')),
        dueDate: dueDate || null,
        eventId: eventId || null,
        notes,
      }),
    onSuccess: () => {
      toast.success('Transação criada!')
      onCreated?.()
      onClose()
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova transação</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate()
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as TransactionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Income">Receita</SelectItem>
                  <SelectItem value="Expense">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex.: Show, Transporte, Som" required />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Data prevista</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Evento vinculado</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhum</SelectItem>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
