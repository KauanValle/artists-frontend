import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ClipboardList, CreditCard, Loader2 } from 'lucide-react'
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

export function ContractorBookingsPage() {
  const [tab, setTab] = useState('all')
  const [pagandoId, setPagandoId] = useState<string | null>(null)
  const status = tabs.find((t) => t.value === tab)?.status

  const { data, isLoading } = useQuery({
    queryKey: ['bookings-contractor', status ?? 'all'],
    queryFn: async () => (await bookingsApi.list(status, 1, 50)).data,
    placeholderData: keepPreviousData,
  })

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
        <TabsList className="h-auto flex-wrap">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="Nenhuma solicitação"
          description="Busque artistas e envie solicitações de contratação."
          icon={<ClipboardList />}
        />
      ) : (
        <div className="space-y-2">
          {data!.items.map((booking) => (
            <Link key={booking.id} to={`/contractor/solicitacoes/${booking.id}`} className="block">
              <Card className="mb-2 hover:shadow-md">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium">{booking.artistName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(booking.eventDate)} • {formatTime(booking.startTime)}–{formatTime(booking.endTime)} • {booking.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {booking.budget !== null && (
                      <span className="text-sm text-muted-foreground">
                        Orçamento: {formatMoney(booking.budget)}
                      </span>
                    )}
                    <BookingStatusBadge status={booking.status} />
                    {booking.status === 'AwaitingPayment' && (
                      <Button
                        size="sm"
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
        </div>
      )}
    </div>
  )
}
