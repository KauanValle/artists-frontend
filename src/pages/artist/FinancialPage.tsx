import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { endOfMonth, endOfYear, startOfMonth, startOfYear } from 'date-fns'
import { Plus, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { eventsApi, financialApi } from '@/services'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState, TransactionStatusBadge } from '@/components/badges'
import { StatCard } from '@/pages/artist/ArtistDashboardPage'
import { formatDate, formatMoney } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import type { TransactionType } from '@/types'

type Period = 'month' | 'year' | 'all' | 'custom'

export function FinancialPage() {
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

  const fmt = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : undefined)

  const { data: summary } = useQuery({
    queryKey: ['financial-summary', from?.toISOString(), to?.toISOString()],
    queryFn: async () => (await financialApi.summary(fmt(from), fmt(to))).data,
  })

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', from?.toISOString(), to?.toISOString()],
    queryFn: async () => (await financialApi.list({ from: fmt(from), to: fmt(to), pageSize: 100 })).data,
  })

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
            <TabsList>
              <TabsTrigger value="month">Mês</TabsTrigger>
              <TabsTrigger value="year">Ano</TabsTrigger>
              <TabsTrigger value="all">Tudo</TabsTrigger>
              <TabsTrigger value="custom">Período</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus /> Nova transação
          </Button>
        </div>
      </div>

      {period === 'custom' && (
        <div className="flex gap-3">
          <Input type="date" className="w-40" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          <Input type="date" className="w-40" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Receita prevista" value={formatMoney(summary?.incomeExpected)} hint="Inclui pendentes" />
        <StatCard title="Recebido" value={formatMoney(summary?.incomeReceived)} />
        <StatCard title="Despesas" value={formatMoney(summary?.expenseTotal)} hint={`Pagas: ${formatMoney(summary?.expensePaid)}`} />
        <StatCard title="Contas a receber" value={formatMoney(summary?.accountsReceivable)} hint="Pendentes + atrasadas" />
        <StatCard title="Resultado" value={formatMoney(summary?.result)} hint="Recebido − pago" />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-10 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : (transactions?.items.length ?? 0) === 0 ? (
            <div className="p-6">
              <EmptyState title="Nenhuma transação no período" icon={<Wallet />} />
            </div>
          ) : (
            <div className="overflow-x-auto">
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
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
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
