import {useEffect, useState} from 'react'
import {ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Copy, Link2, Megaphone, MessageCircle} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {artistsApi, bookingsApi} from '@/services'
import { Link } from 'react-router-dom'
import { BookingStatusBadge, EmptyState, eventTypeLabel } from '@/components/badges'
import { formatDate, formatMoney, formatTime } from '@/lib/utils'
import type {ArtistCard, Booking, BookingStatus} from '@/types'
import {StatCard} from "@/pages/artist/ArtistDashboardPage.tsx";
import {useDebounce} from "@/hooks/useDebounce.ts";
import {Tabs, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";

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

/**
 * Painel do administrador.
 * Seção principal: Solicitações Anônimas — shows confirmados contratados por
 * visitantes (sem cadastro), com contato direto pelo WhatsApp informado.
 */
export function UsersPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-2xl font-bold">Painel de controle de usuarios</h1>
            <p className="text-sm text-muted-foreground">Visualização de todos os usuarios</p>
        </div>
      <ArtistsSection />
    </div>
  )
}

/** Lista de shows confirmados contratados por visitantes (sem cadastro). */
function ArtistsSection() {
    const { data, isLoading } = useQuery({
        queryKey: ['admin-total-artists'],
        queryFn: async () => (await artistsApi.search({})).data,
        placeholderData: keepPreviousData,
    })
    const artists = data?.items ?? []

    // @ts-ignore
    // @ts-ignore
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Dashboard de artistas</CardTitle>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  Artistas cadastrados: {artists.length}
                </span>
            </CardHeader>
            <CardContent className="space-y-6">
                {isLoading ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
                ) : artists.length === 0 ? (
                    <EmptyState
                        title="Nenhum evento cadastrado no sistema."
                        description="Eventos confirmados no sistema aparecem aqui."
                    />
                ) : (
                    <ArtistsPage/>
                )}
            </CardContent>
        </Card>
    );
}

export function ArtistsPage() {
    const { user } = useAuth()
    const [tab, setTab] = useState('all')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [ordenar, setOrdenar] = useState('recentes')
    const [decrescente, setDecrescente] = useState(true)
    const debouncedSearch = useDebounce(search)
    const status = tabs.find((t) => t.value === tab)?.status
    const [expandedId, setExpandedId] = useState<string | null>(null)

    // Busca, ordenação e paginação no servidor (a lista cresce — 50 por vez não escala).
    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['artists', status ?? 'all', debouncedSearch, page, ordenar, decrescente],
        queryFn: async () => (await artistsApi.search({})).data,
    })

    const items = data?.items ?? []

    // Filtros mudaram → volta para a primeira página.
    useEffect(() => setPage(1), [tab, debouncedSearch, ordenar, decrescente])

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
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
                        {items.map((artist) => (
                            <Link key={artist.id} to={``}>
                                <Card className="mb-2 transition-shadow hover:shadow-md">
                                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                                        <div className="flex flex-row items-center justify-between">
                                            <p className="font-medium">
                                                {artist.artisticName}
                                            </p>
                                            <span className="px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                              <ArtistInformationsCard
                                                  key={artist.id}
                                                  artist={artist}
                                                  expanded={expandedId === artist.id}
                                                  onToggle={() => setExpandedId(expandedId === artist.id ? null : artist.id)}
                                              />
                                            </span>
                                            
                                            {/*<p className="text-sm text-muted-foreground">*/}
                                            {/*    {new Date(booking.eventDate + 'T00:00:00').toLocaleDateString('pt-BR')} •{' '}*/}
                                            {/*    {booking.startTime.slice(0, 5)}–{booking.endTime.slice(0, 5)} • {booking.location}*/}
                                            {/*</p>*/}
                                        </div>
                                        {/*<div className="flex items-center gap-3">*/}
                                        {/*    {artist.budget !== null && (*/}
                                        {/*        <span className="text-sm font-medium">*/}
                                        {/*          Orçamento: R$ {booking.budget.toLocaleString('pt-BR')}*/}
                                        {/*        </span>*/}
                                        {/*    )}*/}
                                        {/*    <BookingStatusBadge status={booking.status} />*/}
                                        {/*</div>*/}
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>

                    {/*/!* Paginação *!/*/}
                    {/*<div className="flex flex-wrap items-center justify-between gap-3">*/}
                    {/*    <p className="text-sm text-muted-foreground">*/}
                    {/*        {total} {total === 1 ? 'show' : 'shows'} • página {page} de {totalPaginas}*/}
                    {/*    </p>*/}
                    {/*    {totalPaginas > 1 && (*/}
                    {/*        <div className="flex items-center gap-2">*/}
                    {/*            <Button*/}
                    {/*                variant="outline"*/}
                    {/*                size="sm"*/}
                    {/*                onClick={() => setPage((p) => Math.max(1, p - 1))}*/}
                    {/*                disabled={page <= 1 || isFetching}*/}
                    {/*            >*/}
                    {/*                <ChevronLeft className="h-4 w-4" /> Anterior*/}
                    {/*            </Button>*/}
                    {/*            <Button*/}
                    {/*                variant="outline"*/}
                    {/*                size="sm"*/}
                    {/*                onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}*/}
                    {/*                disabled={page >= totalPaginas || isFetching}*/}
                    {/*            >*/}
                    {/*                Próxima <ChevronRight className="h-4 w-4" />*/}
                    {/*            </Button>*/}
                    {/*        </div>*/}
                    {/*    )}*/}
                    {/*</div>*/}
                </>
            )}
        </div>
    )
}

// @ts-ignore
function ArtistInformationsCard({
                                  artist,
                                  expanded,
                                  onToggle,
                              }: {
    artist: ArtistCard
    expanded: boolean
    onToggle: () => void
}) {

    return (
        <div className="">
            <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="ghost" onClick={onToggle}>
                    {expanded ? 'Ocultar informações' : 'Ver informações do artista'}
                </Button>
            </div>

            {expanded && (
                <div className="mt-4 grid gap-3 rounded-lg bg-muted/40 p-4 text-sm sm:grid-cols-2">
                    <InfoRow label="Nome" value={eventTypeLabel[artist.artisticName]} />
                    {/*<div className="sm:col-span-2">*/}
                    {/*    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mensagem</p>*/}
                    {/*    <p className="mt-1 text-muted-foreground">{booking.message || '—'}</p>*/}
                    {/*</div>*/}
                </div>
            )}
        </div>
    )
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{label}</span>
            <span className="max-w-56 truncate text-right font-medium">{value}</span>
        </div>
    )
}