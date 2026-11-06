import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  MapPin,
  Megaphone,
  Ticket,
} from 'lucide-react'
import { bookingsApi } from '@/services'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookingStatusBadge, EmptyState, eventTypeLabel } from '@/components/badges'
import type { BookingStatus } from '@/types'
import { useDebounce } from '@/hooks/useDebounce'
import { cn, formatMoney } from '@/lib/utils'

const tabs: { value: string; label: string; status?: BookingStatus }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'proposal', label: 'Orçamento/Proposta', status: 'Proposed' },
  { value: 'awaitingPayment', label: 'Aguardando pagamento', status: 'AwaitingPayment' },
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

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function ShowsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [ordenar, setOrdenar] = useState('recentes')
  const [decrescente, setDecrescente] = useState(true)
  const debouncedSearch = useDebounce(search)
  const status = tabs.find((t) => t.value === tab)?.status
  const ehArtista = user?.role === 'Artist'

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
  const orcamentosPagina = items.reduce((soma, b) => soma + (b.budget ?? 0), 0)

  // Botões numerados: janela deslizante ao redor da página atual (com primeira e última).
  const paginas: (number | '…')[] = useMemo(() => {
    if (totalPaginas <= 7) return Array.from({ length: totalPaginas }, (_, i) => i + 1)
    const janela = Math.min(Math.max(page - 2, 2), totalPaginas - 3)
    return [1, '…', janela, janela + 1, janela + 2, '…', totalPaginas]
  }, [page, totalPaginas])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shows</h1>
        <p className="text-sm text-muted-foreground">
          {ehArtista ? 'Solicitações recebidas e negociações em andamento' : 'Suas solicitações de contratação'}
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
        <Card>
          <CardContent className="p-0">
            <div className={cn('overflow-x-auto transition-opacity', isFetching && 'opacity-60')}>
              <table className="w-full min-w-[52rem] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground bg-muted/50">
                    <th className="p-4 py-6 font-medium">Data e Horário</th>
                    <th className="p-4 font-medium">{ehArtista ? 'Contratante' : 'Artista'}</th>
                    <th className="p-4 font-medium">Local</th>
                    <th className="p-4 font-medium text-right">Orçamento</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((booking) => {
                    const data = new Date(booking.eventDate + 'T00:00:00')
                    const nome = ehArtista ? booking.contractorName : booking.artistName
                    return (
                      <tr
                        key={booking.id}
                        className="border-b last:border-0 transition-colors hover:bg-accent/50"
                      >
                        {/* Data e Horário */}
                        <td className="p-4 align-middle relative
                                      after:absolute after:right-0 after:top-1/2
                                      after:-translate-y-1/2 after:h-8
                                      after:w-px after:bg-foreground/10">
                          <div className="flex items-center gap-3">
                            <div className="text-center leading-tight h-full">
                              <p className="text-lg font-bold text-foreground">
                                {String(data.getDate()).padStart(2, '0')}
                              </p>
                              <p className="text-xs font-medium text-muted-foreground">
                                {MESES_CURTOS[data.getMonth()]}
                              </p>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {booking.startTime.slice(0, 5)} – {booking.endTime.slice(0, 5)}
                            </span>
                          </div>
                        </td>
                        {/* Contratante / Artista */}
                        <td className="max-w-52 p-4 align-middle p-4 align-middle relative
                                      after:absolute after:right-0 after:top-1/2
                                      after:-translate-y-1/2 after:h-8
                                      after:w-px after:bg-foreground/10">
                            <div className="flex items-center gap-3">
                                <p className="truncate font-medium">{nome}</p>
                                <p className="text-xs text-muted-foreground">
                                    {eventTypeLabel[booking.eventType] ?? booking.eventType}
                                </p>
                            </div>
                        </td>
                        {/* Local */}
                        <td className="max-w-52 p-4 align-middle relative
                                      after:absolute after:right-0 after:top-1/2
                                      after:-translate-y-1/2 after:h-8
                                      after:w-px after:bg-foreground/10">
                            <div className="">
                              <p className="flex items-center gap-1.5 text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{booking.location}</span>
                              </p>
                            </div>
                        </td>
                        {/* Orçamento */}
                        <td className="p-4 text-right font-medium align-middle relative
                                      after:absolute after:right-0 after:top-1/2
                                      after:-translate-y-1/2 after:h-8
                                      after:w-px after:bg-foreground/10">
                            <div className="">
                          {booking.budget !== null ? `R$ ${booking.budget.toLocaleString('pt-BR')}` : '—'}
                            </div>
                        </td>
                        {/* Status */}
                        <td className="p-4 align-middle relative
                                      after:absolute after:right-0 after:top-1/2
                                      after:-translate-y-1/2 after:h-8
                                      after:w-px after:bg-foreground/10">
                          <BookingStatusBadge status={booking.status} />
                        </td>
                        {/* Ações */}
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-full"
                              title="Ver detalhes"
                              onClick={() => navigate(`/artist/shows/${booking.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-full"
                              title="Abrir contratação"
                              onClick={() => navigate(`/artist/shows/${booking.id}`)}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Rodapé: totais + paginação numerada */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <Ticket className="h-4 w-4" />
                </span>
                <p className="text-sm text-muted-foreground">
                  Total de {total} {total === 1 ? 'show' : 'shows'}
                  {orcamentosPagina > 0 && (
                    <>
                      {' • '}
                      <span className="font-medium text-foreground">
                        {formatMoney(orcamentosPagina)}
                      </span>{' '}
                      em orçamentos desta página
                    </>
                  )}
                </p>
              </div>
              {totalPaginas > 1 && (
                <div className="flex items-center gap-1.5">
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
                      <span key={`elipse-${i}`} className="px-1 text-muted-foreground">
                        …
                      </span>
                    ) : (
                      <Button
                        key={p}
                        variant={p === page ? 'default' : 'outline'}
                        size="icon"
                        className="h-8 w-8 text-xs"
                        onClick={() => setPage(p)}
                        disabled={isFetching}
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
            </CardContent>
          </Card>
        )}
    </div>
  )
}
