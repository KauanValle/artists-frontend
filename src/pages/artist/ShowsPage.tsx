import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Megaphone } from 'lucide-react'
import { bookingsApi } from '@/services'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookingStatusBadge, EmptyState } from '@/components/badges'
import type { BookingStatus } from '@/types'
import { useDebounce } from '@/hooks/useDebounce'

const tabs: { value: string; label: string; status?: BookingStatus }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'proposal', label: 'Orçamento/Proposta', status: 'Proposed' },
  { value: 'awaitingAccount', label: 'Aguardando Conta', status: 'AwaitingAccount' },
  { value: 'negotiating', label: 'Em negociação', status: 'Negotiating' },
  { value: 'confirmed', label: 'Confirmados', status: 'Confirmed' },
  { value: 'completed', label: 'Concluídos', status: 'Completed' },
  { value: 'cancelled', label: 'Cancelados', status: 'Cancelled' },
]

const PER_PAGE = 8

const opcoesOrdenacao = [
  { value: 'recentes', label: 'Mais recentes' },
  { value: 'data', label: 'Data do show' },
  { value: 'valor', label: 'Valor' },
  { value: 'contratante', label: 'Contratante' },
]

export function ShowsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [ordenar, setOrdenar] = useState('recentes')
  const [decrescente, setDecrescente] = useState(true)
  const debouncedSearch = useDebounce(search)
  const status = tabs.find((t) => t.value === tab)?.status

  // Busca, ordenação e paginação no servidor (a lista cresce — 50 por vez não escala).
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['bookings', status ?? 'all', debouncedSearch, page, ordenar, decrescente],
    queryFn: async () =>
      (
        await bookingsApi.list(
          status,
          page,
          PER_PAGE,
          undefined,
          debouncedSearch || undefined,
          ordenar === 'recentes' ? undefined : ordenar,
          ordenar === 'recentes' ? undefined : decrescente ? 'desc' : 'asc'
        )
      ).data,
    placeholderData: keepPreviousData,
  })

  // Filtros mudaram → volta para a primeira página.
  useEffect(() => setPage(1), [tab, debouncedSearch, ordenar, decrescente])

  const items = data?.items ?? []
  const total = data?.totalCount ?? 0
  const totalPaginas = Math.max(1, Math.ceil(total / PER_PAGE))

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

      {/* Ordenação */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Ordenar por</span>
        <Select value={ordenar} onValueChange={setOrdenar}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {opcoesOrdenacao.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {ordenar !== 'recentes' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDecrescente((d) => !d)}
            title={decrescente ? 'Ordem decrescente' : 'Ordem crescente'}
          >
            {decrescente ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
            {decrescente ? 'Decrescente' : 'Crescente'}
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="Nada por aqui"
          description={
            debouncedSearch
              ? 'Nenhum show encontrado para essa busca.'
              : 'As contratações aparecem nesta lista conforme o ciclo avança.'
          }
          icon={<Megaphone />}
        />
      ) : (
        <>
          <div className={`space-y-2 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
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

          {/* Paginação */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {total} {total === 1 ? 'show' : 'shows'} • página {page} de {totalPaginas}
            </p>
            {totalPaginas > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isFetching}
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
                  disabled={page >= totalPaginas || isFetching}
                >
                  Próxima <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
