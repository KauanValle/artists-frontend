import { useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Music,
  Star,
  Users,
  UserCircle,
} from 'lucide-react'
import { artistsApi, bookingsApi } from '@/services'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/badges'
import { cn, formatMoney } from '@/lib/utils'
import type { ArtistCard } from '@/types'

type UserTab = 'artists' | 'contractors'

const PER_PAGE = 10

export function UsersPage() {
  const [activeTab, setActiveTab] = useState<UserTab>('artists')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usuários</h1>
        <p className="text-sm text-muted-foreground">Visualização de todos os usuários da plataforma</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as UserTab)}>
        <TabsList>
          <TabsTrigger value="artists" className="gap-1.5">
            <Music className="h-4 w-4" /> Artistas
          </TabsTrigger>
          <TabsTrigger value="contractors" className="gap-1.5">
            <Users className="h-4 w-4" /> Contratantes
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === 'artists' ? <ArtistsList /> : <ContractorsList />}
    </div>
  )
}

/* ═══════════════════════════ Lista de Artistas ═══════════════════════════ */

function ArtistsList() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-artists', search, page],
    queryFn: async () =>
      (await artistsApi.search({ search: search || undefined, page, pageSize: PER_PAGE })).data,
    placeholderData: keepPreviousData,
  })

  const items = data?.items ?? []
  const total = data?.totalCount ?? items.length
  const totalPaginas = Math.max(1, Math.ceil(total / PER_PAGE))

  const paginas: (number | '…')[] = useMemo(() => {
    if (totalPaginas <= 7) return Array.from({ length: totalPaginas }, (_, i) => i + 1)
    const janela = Math.min(Math.max(page - 2, 2), totalPaginas - 3)
    return [1, '…', janela, janela + 1, janela + 2, '…', totalPaginas]
  }, [page, totalPaginas])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          className="h-9 w-full sm:w-64 rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Buscar artista..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        <span className="text-sm text-muted-foreground">
          {total} artista{total !== 1 ? 's' : ''} cadastrado{total !== 1 ? 's' : ''}
        </span>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhum artista encontrado"
          description={search ? 'Tente outro termo de busca.' : 'Nenhum artista cadastrado na plataforma.'}
          icon={<Music />}
        />
      ) : (
        <div className={cn('space-y-2 transition-opacity', isFetching && 'opacity-60')}>
          {items.map((artist) => (
            <ArtistRow key={artist.id} artist={artist} />
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex flex-col items-center gap-2 pt-2 sm:flex-row sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Página {page} de {totalPaginas}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isFetching}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {paginas.map((p, i) =>
              p === '…' ? (
                <span key={`e-${i}`} className="px-1 text-muted-foreground">…</span>
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
              ),
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
              disabled={page >= totalPaginas || isFetching}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ArtistRow({ artist }: { artist: ArtistCard }) {
  return (
    <Link to={`/artist/${artist.slug}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="flex items-center gap-4 p-4">
          {/* Avatar */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {artist.profilePhotoUrl ? (
              <img
                src={artist.profilePhotoUrl}
                alt={artist.artisticName}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <Music className="h-5 w-5" />
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{artist.artisticName}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{artist.categoryName}</span>
              {artist.city && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" />
                  {artist.city}, {artist.state}
                </span>
              )}
              {artist.averageRating !== null && (
                <span className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {artist.averageRating.toFixed(1)} ({artist.reviewCount})
                </span>
              )}
            </div>
          </div>

          {/* Preço */}
          <div className="shrink-0 text-right">
            {artist.startingPrice !== null && (
              <p className="text-sm font-medium">
                A partir de {formatMoney(artist.startingPrice)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

/* ═══════════════════════════ Lista de Contratantes ═══════════════════════════ */

interface ContractorInfo {
  id: string
  name: string
  totalBookings: number
  confirmedBookings: number
  totalSpent: number
}

function ContractorsList() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  /* Busca todos os bookings e agrupa por contratante */
  const { data: allBookingsData, isLoading } = useQuery({
    queryKey: ['admin-all-bookings-for-contractors'],
    queryFn: async () => (await bookingsApi.list(undefined, 1, 500)).data,
  })

  const contractors = useMemo(() => {
    const items = allBookingsData?.items ?? []
    const map = new Map<string, ContractorInfo>()

    for (const b of items) {
      const key = b.contractorId ?? b.contractorName
      if (!key) continue

      const existing = map.get(key)
      if (existing) {
        existing.totalBookings += 1
        if (b.status === 'Confirmed' || b.status === 'Completed') {
          existing.confirmedBookings += 1
          existing.totalSpent += b.budget ?? 0
        }
      } else {
        const isConfirmed = b.status === 'Confirmed' || b.status === 'Completed'
        map.set(key, {
          id: b.contractorId ?? key,
          name: b.contractorName,
          totalBookings: 1,
          confirmedBookings: isConfirmed ? 1 : 0,
          totalSpent: isConfirmed ? (b.budget ?? 0) : 0,
        })
      }
    }

    let list = Array.from(map.values()).sort((a, b) => b.totalBookings - a.totalBookings)

    if (search) {
      const q = search.toLowerCase()
      list = list.filter((c) => c.name.toLowerCase().includes(q))
    }

    return list
  }, [allBookingsData, search])

  const total = contractors.length
  const totalPaginas = Math.max(1, Math.ceil(total / PER_PAGE))
  const paginatedItems = useMemo(
    () => contractors.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [contractors, page],
  )

  const paginas: (number | '…')[] = useMemo(() => {
    if (totalPaginas <= 7) return Array.from({ length: totalPaginas }, (_, i) => i + 1)
    const janela = Math.min(Math.max(page - 2, 2), totalPaginas - 3)
    return [1, '…', janela, janela + 1, janela + 2, '…', totalPaginas]
  }, [page, totalPaginas])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          className="h-9 w-full sm:w-64 rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Buscar contratante..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        <span className="text-sm text-muted-foreground">
          {total} contratante{total !== 1 ? 's' : ''}
        </span>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : paginatedItems.length === 0 ? (
        <EmptyState
          title="Nenhum contratante encontrado"
          description={search ? 'Tente outro termo de busca.' : 'Nenhum contratante com solicitações na plataforma.'}
          icon={<Users />}
        />
      ) : (
        <div className="space-y-2">
          {paginatedItems.map((contractor) => (
            <ContractorRow key={contractor.id} contractor={contractor} />
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex flex-col items-center gap-2 pt-2 sm:flex-row sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Página {page} de {totalPaginas}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {paginas.map((p, i) =>
              p === '…' ? (
                <span key={`e-${i}`} className="px-1 text-muted-foreground">…</span>
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
              ),
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
              disabled={page >= totalPaginas}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ContractorRow({ contractor }: { contractor: ContractorInfo }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="flex items-center gap-4 p-4">
        {/* Avatar */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <UserCircle className="h-6 w-6" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{contractor.name}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{contractor.totalBookings} solicitaç{contractor.totalBookings !== 1 ? 'ões' : 'ão'}</span>
            <span>{contractor.confirmedBookings} confirmada{contractor.confirmedBookings !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Valor gasto */}
        <div className="shrink-0 text-right">
          {contractor.totalSpent > 0 && (
            <p className="text-sm font-medium">{formatMoney(contractor.totalSpent)}</p>
          )}
          <p className="text-xs text-muted-foreground">em shows</p>
        </div>
      </CardContent>
    </Card>
  )
}
