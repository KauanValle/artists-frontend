import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Wallet, TrendingUp, Percent, ArrowDownRight, CalendarDays, MapPin, Music } from 'lucide-react'

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

function currency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function SaquePage() {
  const { data, isLoading } = useQuery<WithdrawalSummary>({
    queryKey: ['withdrawal-summary'],
    queryFn: () => api.get<WithdrawalSummary>('/artist/withdrawals/summary').then(r => r.data),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Saque</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Valores dos shows concluídos disponíveis para saque, já com o desconto da taxa administrativa.
        </p>
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
