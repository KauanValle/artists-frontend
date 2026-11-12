import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Wallet, TrendingUp, Percent, ArrowDownRight, CalendarDays, MapPin, Music, Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface WithdrawalShow {
  bookingId: string
  eventType: string
  eventDate: string
  location: string
  showAmount: number
  taxaPercentual: number
  taxaValor: number
  valorLiquido: number
  confirmedAt: string | null
}

interface WithdrawalSummary {
  totalBruto: number
  totalTaxa: number
  totalLiquido: number
  taxaPercentual: number
  shows: WithdrawalShow[]
}

interface WithdrawalRequest {
  id: string
  amount: number
  status: string
  createdAt: string
  processedAt: string | null
  adminNotes: string | null
}

function currency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function WithdrawalStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; icon: typeof Clock; className: string }> = {
    Pending: { label: 'Pendente', icon: Clock, className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
    Approved: { label: 'Aprovado', icon: CheckCircle2, className: 'bg-green-500/10 text-green-600 dark:text-green-400' },
    Rejected: { label: 'Rejeitado', icon: XCircle, className: 'bg-red-500/10 text-red-600 dark:text-red-400' },
    Paid: { label: 'Pago', icon: CheckCircle2, className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  }
  const c = config[status] ?? config.Pending
  const Icon = c.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${c.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {c.label}
    </span>
  )
}

export function SaquePage() {
  const queryClient = useQueryClient()
  const [showConfirm, setShowConfirm] = useState(false)

  const { data, isLoading } = useQuery<WithdrawalSummary>({
    queryKey: ['withdrawal-summary'],
    queryFn: () => api.get<WithdrawalSummary>('/artist/withdrawals/summary').then(r => r.data),
  })

  const { data: requests } = useQuery<WithdrawalRequest[]>({
    queryKey: ['my-withdrawal-requests'],
    queryFn: () => api.get<WithdrawalRequest[]>('/artist/withdrawals/my-requests').then(r => r.data),
  })

  const withdrawMutation = useMutation({
    mutationFn: () => api.post('/artist/withdrawals/request'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawal-summary'] })
      queryClient.invalidateQueries({ queryKey: ['my-withdrawal-requests'] })
      setShowConfirm(false)
    },
  })

  const hasPending = requests?.some(r => r.status === 'Pending')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Saque</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Valores dos shows concluídos disponíveis para saque, já com o desconto da taxa administrativa.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <Wallet className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Disponível para saque</span>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {isLoading ? '...' : currency(data?.totalLiquido ?? 0)}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Total bruto</span>
          </div>
          <p className="text-2xl font-bold">
            {isLoading ? '...' : currency(data?.totalBruto ?? 0)}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
              <Percent className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Taxa administrativa ({data?.taxaPercentual ?? 0}%)</span>
          </div>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {isLoading ? '...' : `- ${currency(data?.totalTaxa ?? 0)}`}
          </p>
        </div>
      </div>

      {/* Withdrawal Button */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        {hasPending ? (
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="font-medium">Solicitação de saque pendente</p>
              <p className="text-sm text-muted-foreground">Aguardando aprovação do administrador.</p>
            </div>
          </div>
        ) : !showConfirm ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium">Solicitar saque</p>
              <p className="text-sm text-muted-foreground">
                Envie uma solicitação para receber o valor disponível.
              </p>
            </div>
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={(data?.totalLiquido ?? 0) <= 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Wallet className="h-4 w-4 mr-2" />
              Solicitar saque
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="font-medium">Confirmar solicitação de saque?</p>
            <p className="text-sm text-muted-foreground">
              Você está solicitando o saque de <strong className="text-green-600 dark:text-green-400">{currency(data?.totalLiquido ?? 0)}</strong>.
              A equipe administrativa será notificada e processará sua solicitação.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => withdrawMutation.mutate()}
                disabled={withdrawMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {withdrawMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                ) : (
                  'Confirmar saque'
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={withdrawMutation.isPending}>
                Cancelar
              </Button>
            </div>
            {withdrawMutation.isError && (
              <p className="text-sm text-red-500">
                {(withdrawMutation.error as any)?.response?.data?.message ?? 'Erro ao solicitar saque. Tente novamente.'}
              </p>
            )}
            {withdrawMutation.isSuccess && (
              <p className="text-sm text-green-600">Solicitação enviada com sucesso!</p>
            )}
          </div>
        )}
      </div>

      {/* Withdrawal History */}
      {requests && requests.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Histórico de solicitações</h2>
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="rounded-xl border bg-card p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <p className="font-medium">{currency(req.amount)}</p>
                    <WithdrawalStatusBadge status={req.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Solicitado em {new Date(req.createdAt).toLocaleDateString('pt-BR')}
                    {req.processedAt && ` · Processado em ${new Date(req.processedAt).toLocaleDateString('pt-BR')}`}
                  </p>
                  {req.adminNotes && (
                    <p className="text-sm text-muted-foreground italic">Obs: {req.adminNotes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shows List */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Shows concluídos</h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : !data?.shows.length ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <Music className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Nenhum show concluído com pagamento confirmado ainda.</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Quando seus shows forem concluídos e pagos, eles aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.shows.map((show) => (
              <div
                key={show.bookingId}
                className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{show.eventType}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {new Date(show.eventDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {show.location}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6 sm:text-right">
                    <div>
                      <p className="text-xs text-muted-foreground">Cachê</p>
                      <p className="font-medium">{currency(show.showAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <ArrowDownRight className="h-3 w-3 text-orange-500" />
                        Taxa ({show.taxaPercentual}%)
                      </p>
                      <p className="font-medium text-orange-600 dark:text-orange-400">
                        - {currency(show.taxaValor)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Líquido</p>
                      <p className="font-bold text-green-600 dark:text-green-400">
                        {currency(show.valorLiquido)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
