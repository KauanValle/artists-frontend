import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ClipboardList, CreditCard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { bookingsApi } from '@/services'
import { extractApiError } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookingStatusBadge, EmptyState } from '@/components/badges'
import { formatDate, formatMoney, formatTime } from '@/lib/utils'
import type { BookingStatus } from '@/types'

const tabs: { value: string; label: string; status?: BookingStatus }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'requested', label: 'Enviadas', status: 'Requested' },
  { value: 'negotiating', label: 'Em negociação', status: 'Negotiating' },
  { value: 'proposed', label: 'Com proposta', status: 'Proposed' },
  { value: 'awaitingPayment', label: 'Aguardando pagamento', status: 'AwaitingPayment' },
  { value: 'confirmed', label: 'Confirmadas', status: 'Confirmed' },
  { value: 'completed', label: 'Concluídas', status: 'Completed' },
  { value: 'cancelled', label: 'Canceladas', status: 'Cancelled' },
]

const PER_PAGE = 8

export function ContractorBookingsPage() {
  const [tab, setTab] = useState('all')
  const [page, setPage] = useState(1)
  const [pagandoId, setPagandoId] = useState<string | null>(null)
  const status = tabs.find((t) => t.value === tab)?.status

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['bookings-contractor', status ?? 'all', page],
    queryFn: async () => (await bookingsApi.list(status, page, PER_PAGE)).data,
    placeholderData: keepPreviousData,
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPaginas = Math.max(1, Math.ceil(total / PER_PAGE))

  const paginas: (number | '…')[] = useMemo(() => {
    if (totalPaginas <= 7) return Array.from({ length: totalPaginas }, (_, i) => i + 1)
    const janela = Math.min(Math.max(page - 2, 2), totalPaginas - 3)
    return [1, '…', janela, janela + 1, janela + 2, '…', totalPaginas]
  }, [page, totalPaginas])

  useEffect(() => setPage(1), [tab])

  // Gera o checkout no InfinityPay e leva o contratante para pagar.
  const realizarPagamento = async (id: string) => {
    setPagandoId(id)
    try {
      const { data } = await bookingsApi.startPayment(id)
      toast.success('Checkout gerado — redirecionando para o InfinityPay...')
      window.location.href = data.checkoutUrl
    } catch (err) {
      toast.error(extractApiError(err))
      setPagandoId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Solicitações</h1>
        <p className="text-sm text-muted-foreground">Acompanhe o ciclo de cada contratação</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start overflow-x-auto scrollbar-none flex-nowrap">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="shrink-0 px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhuma solicitação"
          description="Busque artistas e envie solicitações de contratação."
          icon={<ClipboardList />}
        />
      ) : (
        <div className="space-y-2">
          {items.map((booking) => (
            <Link key={booking.id} to={`/contractor/solicitacoes/${booking.id}`} className="block">
              <Card className="mb-2 hover:shadow-md">
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{booking.artistName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(booking.eventDate)} • {formatTime(booking.startTime)}–{formatTime(booking.endTime)} • {booking.location}
                      </p>
                    </div>
                    <BookingStatusBadge status={booking.status} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {booking.budget !== null && (
                      <span className="text-sm text-muted-foreground">
                        Orçamento: {formatMoney(booking.budget)}
                      </span>
                    )}
                    {booking.status === 'AwaitingPayment' && (
                      <Button
                        size="sm"
                        className="text-xs sm:text-sm"
                        onClick={(e) => {
                          e.preventDefault()
                          void realizarPagamento(booking.id)
                        }}
                        disabled={pagandoId !== null}
                      >
                        {pagandoId === booking.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CreditCard className="h-4 w-4" />
                        )}
                        Realizar pagamento
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* Paginação */}
          <div className="flex flex-col items-center gap-2 pt-2 sm:flex-row sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Total de {total} solicitaç{total !== 1 ? 'ões' : 'ão'}
            </p>
            {totalPaginas > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isFetching}
                  title="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {paginas.map((p, i) =>
                  p === '…' ? (
                    <span key={`elipse-${i}`} className="px-1 text-muted-foreground">…</span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === page ? 'default' : 'outline'}
                      size="icon"
                      className="h-8 w-8 text-xs"
                      onClick={() => setPage(p as number)}
                    >
                      {p}
                    </Button>
                  )
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
                  disabled={page >= totalPaginas || isFetching}
                  title="Próxima página"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
