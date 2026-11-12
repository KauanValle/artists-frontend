import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { CheckCircle2, Clock, XCircle, Wallet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface WithdrawalRequest {
  id: string
  artistId: string
  artistName: string
  amount: number
  taxaPercentual: number
  taxaValor: number
  valorBruto: number
  status: string
  adminNotes: string | null
  createdAt: string
  processedAt: string | null
}

function currency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function StatusBadge({ status }: { status: string }) {
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

function ProcessModal({ request, onClose }: { request: WithdrawalRequest; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [notes, setNotes] = useState('')

  const mutation = useMutation({
    mutationFn: (approve: boolean) =>
      api.post(`/admin/withdrawals/${request.id}/process`, { approve, notes: notes || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card rounded-xl border shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">Processar solicitação de saque</h3>

        <div className="space-y-3 mb-5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Artista</span>
            <span className="font-medium">{request.artistName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Valor bruto</span>
            <span>{currency(request.valorBruto)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taxa ({request.taxaPercentual}%)</span>
            <span className="text-orange-600 dark:text-orange-400">- {currency(request.taxaValor)}</span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2">
            <span className="font-medium">Valor líquido</span>
            <span className="font-bold text-green-600 dark:text-green-400">{currency(request.amount)}</span>
          </div>
        </div>

        <div className="mb-5">
          <label className="text-sm font-medium mb-1.5 block">Observação (opcional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Ex: Transferência PIX realizada..."
            className="w-full rounded-lg border bg-background p-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => mutation.mutate(true)}
            disabled={mutation.isPending}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 mr-2" /> Aprovar</>}
          </Button>
          <Button
            onClick={() => mutation.mutate(false)}
            disabled={mutation.isPending}
            variant="destructive"
            className="flex-1"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="h-4 w-4 mr-2" /> Rejeitar</>}
          </Button>
        </div>

        <Button variant="ghost" onClick={onClose} className="w-full mt-2" disabled={mutation.isPending}>
          Cancelar
        </Button>

        {mutation.isError && (
          <p className="text-sm text-red-500 mt-2 text-center">
            {(mutation.error as any)?.response?.data?.message ?? 'Erro ao processar. Tente novamente.'}
          </p>
        )}
      </div>
    </div>
  )
}

export function AdminWithdrawalsPage() {
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null)

  const { data: requests, isLoading } = useQuery<WithdrawalRequest[]>({
    queryKey: ['admin-withdrawals'],
    queryFn: () => api.get<WithdrawalRequest[]>('/admin/withdrawals').then(r => r.data),
  })

  const pending = requests?.filter(r => r.status === 'Pending') ?? []
  const processed = requests?.filter(r => r.status !== 'Pending') ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Solicitações de Saque</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie as solicitações de saque dos artistas.
        </p>
      </div>

      {/* Pending */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-500" />
          Pendentes ({pending.length})
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}
          </div>
        ) : !pending.length ? (
          <div className="rounded-xl border bg-card p-6 text-center">
            <Wallet className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-muted-foreground">Nenhuma solicitação pendente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(req => (
              <div key={req.id} className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold">{req.artistName}</p>
                      <StatusBadge status={req.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Solicitado em {new Date(req.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Valor líquido</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">{currency(req.amount)}</p>
                    </div>
                    <Button onClick={() => setSelectedRequest(req)} size="sm">
                      Processar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Processed */}
      {processed.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Histórico</h2>
          <div className="space-y-3">
            {processed.map(req => (
              <div key={req.id} className="rounded-xl border bg-card p-4 shadow-sm opacity-80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <p className="font-medium">{req.artistName}</p>
                      <StatusBadge status={req.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(req.createdAt).toLocaleDateString('pt-BR')}
                      {req.processedAt && ` → ${new Date(req.processedAt).toLocaleDateString('pt-BR')}`}
                    </p>
                    {req.adminNotes && <p className="text-sm text-muted-foreground italic">Obs: {req.adminNotes}</p>}
                  </div>
                  <p className="font-medium">{currency(req.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedRequest && (
        <ProcessModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />
      )}
    </div>
  )
}
