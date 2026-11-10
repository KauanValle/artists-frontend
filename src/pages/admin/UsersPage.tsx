import { useMemo, useState } from 'react'
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Ban,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  MapPin,
  MoreHorizontal,
  Music,
  RefreshCw,
  Star,
  Trash2,
  Users,
  UserCircle,
  X,
  CalendarDays,
  DollarSign,
  TrendingUp,
} from 'lucide-react'
import { artistsApi, adminUsersApi } from '@/services'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/badges'
import { cn, formatMoney } from '@/lib/utils'
import type { ArtistCard, AdminArtistStats, AdminContractorStats, AdminContractorList } from '@/types'

type UserTab = 'artists' | 'contractors'

const PER_PAGE = 10

export function UsersPage() {
  const [activeTab, setActiveTab] = useState<UserTab>('artists')

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Usuários</h1>
        <p className="text-sm text-muted-foreground">Gerenciamento de todos os usuários da plataforma</p>
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

/* ═══════════════════ Modal genérico ═══════════════════ */

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-3 top-3 p-1 rounded hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  )
}

/* ═══════════════════ Dropdown de ações ═══════════════════ */

function ActionMenu({ children, open, onToggle }: { children: React.ReactNode; open: boolean; onToggle: () => void }) {
  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle() }}>
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onToggle} />
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border bg-popover p-1 shadow-md">
            {children}
          </div>
        </>
      )}
    </div>
  )
}

function ActionItem({ icon: Icon, label, onClick, variant = 'default' }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  variant?: 'default' | 'destructive'
}) {
  return (
    <button
      className={cn(
        'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
        variant === 'destructive' && 'text-destructive hover:bg-destructive/10',
      )}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick() }}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

/* ═══════════════════ Stat card auxiliar ═══════════════════ */

function StatCard({ icon: Icon, label, value, sub }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

/* ═══════════════════════════ Lista de Artistas ═══════════════════════════ */

function ArtistsList() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<ArtistCard | null>(null)
  const [deactivateMsg, setDeactivateMsg] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ArtistCard | null>(null)
  const [statsTarget, setStatsTarget] = useState<string | null>(null)

  const queryClient = useQueryClient()

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

  /* Mutations */
  const unpublishMut = useMutation({
    mutationFn: (artistId: string) => adminUsersApi.unpublishArtist(artistId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-artists'] }) },
  })

  const publishMut = useMutation({
    mutationFn: (artistId: string) => adminUsersApi.publishArtist(artistId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-artists'] }) },
  })

  const deactivateMut = useMutation({
    mutationFn: async ({ artistId, message }: { artistId: string; message: string }) => {
      const { data: userData } = await adminUsersApi.getArtistUserId(artistId)
      return adminUsersApi.deactivateUser(userData.userId, message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-artists'] })
      setDeactivateTarget(null)
      setDeactivateMsg('')
    },
  })

  const deleteMut = useMutation({
    mutationFn: async (artistId: string) => {
      const { data: userData } = await adminUsersApi.getArtistUserId(artistId)
      return adminUsersApi.deleteUser(userData.userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-artists'] })
      setDeleteTarget(null)
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          className="h-9 w-full sm:w-64 rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Buscar artista..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
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
            <Card key={artist.id} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 p-4">
                {/* Avatar */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {artist.profilePhotoUrl ? (
                    <img src={artist.profilePhotoUrl} alt={artist.artisticName} className="h-12 w-12 rounded-full object-cover" />
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
                        <MapPin className="h-3 w-3" /> {artist.city}, {artist.state}
                      </span>
                    )}
                    {artist.averageRating != null && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {Number(artist.averageRating).toFixed(1)} ({artist.reviewCount})
                      </span>
                    )}
                  </div>
                </div>

                {/* Preço */}
                <div className="hidden sm:block shrink-0 text-right">
                  {artist.startingPrice !== null && artist.startingPrice !== undefined && (
                    <p className="text-sm font-medium">A partir de {formatMoney(artist.startingPrice)}</p>
                  )}
                </div>

                {/* Ações */}
                <ActionMenu open={menuOpen === artist.id} onToggle={() => setMenuOpen(menuOpen === artist.id ? null : artist.id)}>
                  <ActionItem icon={Eye} label="Ver perfil / stats" onClick={() => { setStatsTarget(artist.id); setMenuOpen(null) }} />
                  <ActionItem icon={EyeOff} label="Despublicar perfil" onClick={() => { unpublishMut.mutate(artist.id); setMenuOpen(null) }} />
                  <ActionItem icon={RefreshCw} label="Republicar perfil" onClick={() => { publishMut.mutate(artist.id); setMenuOpen(null) }} />
                  <ActionItem icon={Ban} label="Desativar conta" onClick={() => { setDeactivateTarget(artist); setMenuOpen(null) }} />
                  <ActionItem icon={Trash2} label="Excluir perfil" onClick={() => { setDeleteTarget(artist); setMenuOpen(null) }} variant="destructive" />
                </ActionMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex flex-col items-center gap-2 pt-2 sm:flex-row sm:justify-between">
          <p className="text-xs text-muted-foreground">Página {page} de {totalPaginas}</p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || isFetching}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {paginas.map((p, i) =>
              p === '…' ? (
                <span key={`e-${i}`} className="px-1 text-muted-foreground">…</span>
              ) : (
                <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" className="h-8 w-8 text-xs" onClick={() => setPage(p as number)}>
                  {p}
                </Button>
              ),
            )}
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))} disabled={page >= totalPaginas || isFetching}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal: desativar artista */}
      <Modal open={!!deactivateTarget} onClose={() => { setDeactivateTarget(null); setDeactivateMsg('') }}>
        <h2 className="text-lg font-semibold mb-2">Desativar conta</h2>
        <p className="text-sm text-muted-foreground mb-4">
          A conta do artista <strong>{deactivateTarget?.artisticName}</strong> será desativada. Ele verá a mensagem abaixo ao tentar acessar o painel.
        </p>
        <textarea
          className="w-full rounded-md border border-input bg-transparent p-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          rows={3}
          placeholder="Mensagem personalizada para o artista..."
          value={deactivateMsg}
          onChange={(e) => setDeactivateMsg(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => { setDeactivateTarget(null); setDeactivateMsg('') }}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={!deactivateMsg.trim() || deactivateMut.isPending}
            onClick={() => deactivateTarget && deactivateMut.mutate({ artistId: deactivateTarget.id, message: deactivateMsg })}
          >
            {deactivateMut.isPending ? 'Desativando...' : 'Desativar'}
          </Button>
        </div>
      </Modal>

      {/* Modal: excluir artista */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <div className="flex items-center gap-2 text-destructive mb-4">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Excluir perfil</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Tem certeza que deseja excluir permanentemente o perfil de <strong>{deleteTarget?.artisticName}</strong>?
          Esta ação não pode ser desfeita e todos os dados associados serão removidos.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
          <Button variant="destructive" disabled={deleteMut.isPending} onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}>
            {deleteMut.isPending ? 'Excluindo...' : 'Excluir permanentemente'}
          </Button>
        </div>
      </Modal>

      {/* Modal: stats do artista */}
      <Modal open={!!statsTarget} onClose={() => setStatsTarget(null)}>
        {statsTarget && <ArtistStatsView artistId={statsTarget} />}
      </Modal>
    </div>
  )
}

/* ═══════════════════ View de stats do artista ═══════════════════ */

function ArtistStatsView({ artistId }: { artistId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-artist-stats', artistId],
    queryFn: async () => (await adminUsersApi.getArtistStats(artistId)).data,
  })

  if (isLoading) return <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
  if (!data) return <p className="py-8 text-center text-sm text-muted-foreground">Erro ao carregar dados.</p>

  const s = data as AdminArtistStats

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {s.profilePhotoUrl ? (
            <img src={s.profilePhotoUrl} alt={s.artisticName} className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <Music className="h-6 w-6" />
          )}
        </div>
        <div>
          <h2 className="text-lg font-bold">{s.artisticName}</h2>
          <p className="text-sm text-muted-foreground">{s.name} · {s.categoryName}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <MapPin className="h-3 w-3" /> {s.city}, {s.state}
            {s.averageRating != null && (
              <span className="flex items-center gap-0.5 ml-2">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {s.averageRating.toFixed(1)} ({s.reviewCount})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex gap-2 flex-wrap">
        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', s.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
          {s.isPublished ? 'Publicado' : 'Despublicado'}
        </span>
        {s.isDeactivated && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Desativado</span>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={CalendarDays} label="Shows (total)" value={s.totalShows} />
        <StatCard icon={CalendarDays} label="Shows (mês)" value={s.monthShows} />
        <StatCard icon={CalendarDays} label="Shows (ano)" value={s.yearShows} />
        <StatCard icon={DollarSign} label="Valor confirmados + concluídos" value={formatMoney(s.valorConfirmadosConcluidos)} />
        <StatCard icon={TrendingUp} label="Taxa administrativa" value={formatMoney(s.taxaAdministrativa)} />
      </div>
    </div>
  )
}

/* ═══════════════════════════ Lista de Contratantes ═══════════════════════════ */

function ContractorsList() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<AdminContractorList | null>(null)
  const [deactivateMsg, setDeactivateMsg] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AdminContractorList | null>(null)
  const [statsTarget, setStatsTarget] = useState<string | null>(null)

  const queryClient = useQueryClient()

  const { data: contractorsData, isLoading } = useQuery({
    queryKey: ['admin-contractors'],
    queryFn: async () => (await adminUsersApi.listContractors()).data,
  })

  const contractors = useMemo(() => {
    let list = contractorsData ?? []
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((c) => c.name.toLowerCase().includes(q) || (c.companyName && c.companyName.toLowerCase().includes(q)))
    }
    return list.sort((a, b) => b.totalBookings - a.totalBookings)
  }, [contractorsData, search])

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

  /* Mutations */
  const deactivateMut = useMutation({
    mutationFn: async ({ userId, message }: { userId: string; message: string }) =>
      adminUsersApi.deactivateUser(userId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contractors'] })
      setDeactivateTarget(null)
      setDeactivateMsg('')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (userId: string) => adminUsersApi.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contractors'] })
      setDeleteTarget(null)
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          className="h-9 w-full sm:w-64 rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Buscar contratante..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
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
          description={search ? 'Tente outro termo de busca.' : 'Nenhum contratante cadastrado na plataforma.'}
          icon={<Users />}
        />
      ) : (
        <div className="space-y-2">
          {paginatedItems.map((contractor) => (
            <Card key={contractor.contractorId} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 p-4">
                {/* Avatar */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <UserCircle className="h-6 w-6" />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{contractor.name}</p>
                    {contractor.isDeactivated && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">Desativado</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {contractor.companyName && <span>{contractor.companyName}</span>}
                    {contractor.city && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" /> {contractor.city}, {contractor.state}
                      </span>
                    )}
                    <span>{contractor.totalBookings} solicitaç{contractor.totalBookings !== 1 ? 'ões' : 'ão'}</span>
                    <span>{contractor.confirmedBookings} confirmada{contractor.confirmedBookings !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Valor gasto */}
                <div className="hidden sm:block shrink-0 text-right">
                  {contractor.totalSpent > 0 && <p className="text-sm font-medium">{formatMoney(contractor.totalSpent)}</p>}
                </div>

                {/* Ações */}
                <ActionMenu open={menuOpen === contractor.contractorId} onToggle={() => setMenuOpen(menuOpen === contractor.contractorId ? null : contractor.contractorId)}>
                  <ActionItem icon={Eye} label="Ver perfil / stats" onClick={() => { setStatsTarget(contractor.contractorId); setMenuOpen(null) }} />
                  <ActionItem icon={Ban} label="Desativar conta" onClick={() => { setDeactivateTarget(contractor); setMenuOpen(null) }} />
                  <ActionItem icon={Trash2} label="Excluir perfil" onClick={() => { setDeleteTarget(contractor); setMenuOpen(null) }} variant="destructive" />
                </ActionMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex flex-col items-center gap-2 pt-2 sm:flex-row sm:justify-between">
          <p className="text-xs text-muted-foreground">Página {page} de {totalPaginas}</p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {paginas.map((p, i) =>
              p === '…' ? (
                <span key={`e-${i}`} className="px-1 text-muted-foreground">…</span>
              ) : (
                <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" className="h-8 w-8 text-xs" onClick={() => setPage(p as number)}>
                  {p}
                </Button>
              ),
            )}
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))} disabled={page >= totalPaginas}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal: desativar contratante */}
      <Modal open={!!deactivateTarget} onClose={() => { setDeactivateTarget(null); setDeactivateMsg('') }}>
        <h2 className="text-lg font-semibold mb-2">Desativar conta</h2>
        <p className="text-sm text-muted-foreground mb-4">
          A conta do contratante <strong>{deactivateTarget?.name}</strong> será desativada. Ele verá a mensagem abaixo ao tentar acessar o painel.
        </p>
        <textarea
          className="w-full rounded-md border border-input bg-transparent p-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          rows={3}
          placeholder="Mensagem personalizada para o contratante..."
          value={deactivateMsg}
          onChange={(e) => setDeactivateMsg(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => { setDeactivateTarget(null); setDeactivateMsg('') }}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={!deactivateMsg.trim() || deactivateMut.isPending}
            onClick={() => deactivateTarget && deactivateMut.mutate({ userId: deactivateTarget.userId, message: deactivateMsg })}
          >
            {deactivateMut.isPending ? 'Desativando...' : 'Desativar'}
          </Button>
        </div>
      </Modal>

      {/* Modal: excluir contratante */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <div className="flex items-center gap-2 text-destructive mb-4">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Excluir perfil</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Tem certeza que deseja excluir permanentemente o perfil de <strong>{deleteTarget?.name}</strong>?
          Esta ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
          <Button variant="destructive" disabled={deleteMut.isPending} onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.userId)}>
            {deleteMut.isPending ? 'Excluindo...' : 'Excluir permanentemente'}
          </Button>
        </div>
      </Modal>

      {/* Modal: stats do contratante */}
      <Modal open={!!statsTarget} onClose={() => setStatsTarget(null)}>
        {statsTarget && <ContractorStatsView contractorId={statsTarget} />}
      </Modal>
    </div>
  )
}

/* ═══════════════════ View de stats do contratante ═══════════════════ */

function ContractorStatsView({ contractorId }: { contractorId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-contractor-stats', contractorId],
    queryFn: async () => (await adminUsersApi.getContractorStats(contractorId)).data,
  })

  if (isLoading) return <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
  if (!data) return <p className="py-8 text-center text-sm text-muted-foreground">Erro ao carregar dados.</p>

  const s = data as AdminContractorStats

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <UserCircle className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-lg font-bold">{s.name}</h2>
          {s.companyName && <p className="text-sm text-muted-foreground">{s.companyName}</p>}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <MapPin className="h-3 w-3" /> {s.city}, {s.state}
            {s.phone && <span>· {s.phone}</span>}
          </div>
        </div>
      </div>

      {/* Status */}
      {s.isDeactivated && (
        <div className="flex gap-2">
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Desativado</span>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={CalendarDays} label="Contratados (total)" value={s.totalContratados} />
        <StatCard icon={CalendarDays} label="Contratados (mês)" value={s.monthContratados} />
        <StatCard icon={CalendarDays} label="Contratados (ano)" value={s.yearContratados} />
        <StatCard icon={TrendingUp} label="Taxas pagas" value={formatMoney(s.taxasPagas)} />
      </div>
    </div>
  )
}
