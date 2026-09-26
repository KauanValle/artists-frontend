import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Megaphone } from 'lucide-react'
import { bookingsApi } from '@/services'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookingStatusBadge, EmptyState } from '@/components/badges'
import type { BookingStatus } from '@/types'
import { useDebounce } from '@/hooks/useDebounce'

const tabs: { value: string; label: string; status?: BookingStatus }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'proposal', label: 'Orçamento/Proposta', status: 'Proposed' },
  { value: 'negotiating', label: 'Em negociação', status: 'Negotiating' },
  { value: 'confirmed', label: 'Confirmados', status: 'Confirmed' },
  { value: 'completed', label: 'Concluídos', status: 'Completed' },
  { value: 'cancelled', label: 'Cancelados', status: 'Cancelled' },
]

export function ShowsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const status = tabs.find((t) => t.value === tab)?.status

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', status ?? 'all', debouncedSearch],
    queryFn: async () => (await bookingsApi.list(status, 1, 50)).data,
    placeholderData: keepPreviousData,
  })

  const items = (data?.items ?? []).filter((b) => {
    if (!debouncedSearch) return true
    const term = debouncedSearch.toLowerCase()
    return b.contractorName.toLowerCase().includes(term) || b.location.toLowerCase().includes(term)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shows</h1>
        <p className="text-sm text-muted-foreground">
          {user?.role === 'Artist' ? 'Solicitações recebidas e negociações em andamento' : 'Suas solicitações de contratação'}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <input
          className="h-9 w-56 rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Buscar por contratante/local..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <EmptyState title="Nada por aqui" description="As contratações aparecem nesta lista conforme o ciclo avança." icon={<Megaphone />} />
      ) : (
        <div className="space-y-2">
          {items.map((booking) => (
            <Link key={booking.id} to={`/artist/shows/${booking.id}`}>
              <Card className="mb-2 transition-shadow hover:shadow-md">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {user?.role === 'Artist' ? booking.contractorName : booking.artistName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(booking.eventDate + 'T00:00:00').toLocaleDateString('pt-BR')} •{' '}
                      {booking.startTime.slice(0, 5)}–{booking.endTime.slice(0, 5)} • {booking.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {booking.budget !== null && (
                      <span className="text-sm font-medium">
                        Orçamento: R$ {booking.budget.toLocaleString('pt-BR')}
                      </span>
                    )}
                    <BookingStatusBadge status={booking.status} />
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
