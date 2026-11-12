import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { addDays, addMonths, endOfMonth, eachDayOfInterval, format, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BadgeCheck, CalendarDays, CalendarPlus, Check, CheckCircle2, ChevronRight, Coins, Heart, House, Images, Info, Instagram, MapPin, Music2, Share2, Star } from 'lucide-react'
import { toast } from 'sonner'
import {
    addonsApi, artistsApi, availabilityApi, bookingsApi, brandingApi, epkApi, favoritesApi, publicBookingsApi, socialLinksApi,
    viaCepApi
} from '@/services'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePickerCalendar } from '@/components/ui/date-picker-calendar'
import { TimeRangePicker, type TimeInterval } from '@/components/ui/time-range-picker'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RatingStars } from '@/components/ui/rating-stars'
import { EmptyState, eventTypeLabel } from '@/components/badges'
import { cn, formatDate, formatMoney, minutesToLabel, toDateInput } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import {AddonItemType, BookingAddonItem, EventType, Fee, LocationCompleteItem} from '@/types'

export function ArtistPublicPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const isContractor = isAuthenticated && user?.role === 'Contractor'
  const [requestOpen, setRequestOpen] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const location = useLocation()

  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: async () => (await brandingApi.get()).data,
    staleTime: 60_000,
  })

  // A contratação exige cadastro de contratante: sem conta, redireciona para o registro
  // (que devolve para esta página depois de concluir o cadastro).
  const abrirContratacao = () => {
    if (isContractor) {
      setRequestOpen(true)
      return
    }
    if (isAuthenticated) toast.info('Apenas contratantes podem solicitar contratação — entre com a conta certa.')
    else toast.info('Crie sua conta de contratante para solicitar a contratação.')
    navigate('/register', { state: { from: { pathname: location.pathname } } })
  }

  const { data: artist, isLoading } = useQuery({
    queryKey: ['artist-slug', slug],
    queryFn: async () => (await artistsApi.getBySlug(slug!)).data,
    enabled: !!slug,
  })

  const { data: availabilities = [] } = useQuery({
    queryKey: ['artist-availability', artist?.id],
    queryFn: async () => (await availabilityApi.listByArtist(artist!.id)).data,
    enabled: !!artist?.id,
  })

  // Eventos agendados/confirmados ocupam a agenda do artista na contratação (janela de 6 meses).
  const busyFrom = toDateInput()
  const busyTo = toDateInput(addDays(new Date(), 180))
  const { data: busySlots = [] } = useQuery({
    queryKey: ['artist-busy-slots', artist?.id, busyFrom, busyTo],
    queryFn: async () => (await availabilityApi.busySlots(artist!.id, busyFrom, busyTo)).data,
    enabled: !!artist?.id,
  })

  // Redes sociais (Instagram) exibidas ao lado das habilidades.
  const { data: socialLinks = [] } = useQuery({
    queryKey: ['artist-social-links', artist?.id],
    queryFn: async () => (await socialLinksApi.list(artist!.id)).data,
    enabled: !!artist?.id,
  })
  const instagram = socialLinks.find((l) => l.platform === 'Instagram')

  const [cursorMes, setCursorMes] = useState(new Date())

  // Mídia real: fotos/vídeos/músicas publicados no EPK do artista.
  const { data: epk } = useQuery({
    queryKey: ['epk-publico', artist?.id],
    queryFn: async () => (await epkApi.get(artist!.id)).data,
    enabled: !!artist?.id,
  })
  const fotosMidia = useMemo(
    () => Array.from(new Set([...(artist?.galleryUrls ?? []), ...(epk?.photoUrls ?? [])])),
    [artist?.galleryUrls, epk?.photoUrls]
  )
  const videosMidia = useMemo(
    () => Array.from(new Set([...(artist?.videoUrls ?? []), ...(epk?.videoUrls ?? [])])),
    [artist?.videoUrls, epk?.videoUrls]
  )
  const musicasMidia = epk?.songs ?? []
  const diasDoMes = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(cursorMes), end: endOfMonth(cursorMes) }),
    [cursorMes]
  )

  // O endpoint devolve datas livres E bloqueios; o card "Datas disponíveis" mostra só as livres.
  const availableDates = availabilities.filter((a) => a.status === 'Available')
  // Dias da semana em que o artista atende (distintos das disponibilidades livres) —
  // dias fora deles ficam bloqueados na agenda da contratação.
  const workingWeekdays = useMemo(
    () =>
      [
        ...new Set(
          availabilities
            .filter((a) => a.status === 'Available')
            .map((a) => new Date(`${a.date}T00:00:00`).getDay())
        ),
      ].sort((x, y) => x - y),
    [availabilities]
  )

  // Janelas de atendimento por dia (disponibilidades "Available" salvas no perfil):
  // a contratação oferece apenas esses horários no seletor. Dia todo = 06:00–24:00.
  const workingTimesByDate = useMemo(() => {
    const map: Record<string, TimeInterval[]> = {}
    for (const a of availabilities) {
      if (a.status !== 'Available' && (a.startTime !== null && a.endTime !== null)) continue
      const win: TimeInterval = a.isAllDay
        ? { start: '00:00', end: '24:00' }
        : a.endTime > a.startTime
        ? { start: a.startTime.slice(0, 5), end: a.endTime.slice(0, 5) }
        : { start: a.startTime.slice(0, 5), end: '24:00' }

      if (a.endTime <= a.startTime && !a.isAllDay) {
        map[a.date] = [...(map[a.date] ?? []), win, { start: '00:00', end: a.endTime.slice(0, 5) }]
      } else {
        map[a.date] = [...(map[a.date] ?? []), win]
      }
    }
    return map
  }, [availabilities])

  // Janelas bloqueadas por dia: indisponibilidades declaradas + eventos, em HH:mm,
  // separadas por força — Confirmed/Scheduled travam; PreReserved é soft (com alerta).
  const { blockedTimesByDate, softTimesByDate } = useMemo(() => {
    const hard: Record<string, { start: string; end: string }[]> = {}
    const soft: Record<string, { start: string; end: string }[]> = {}
    const add = (map: typeof hard, key: string, start: string, end: string) => {
      map[key] = [...(map[key] ?? []), { start: start.slice(0, 5), end: end.slice(0, 5) }]
    }
    for (const a of availabilities.filter((a) => a.status !== 'Available'))
      add(hard, a.date, a.startTime, a.isAllDay ? '24:00' : a.endTime)
    for (const slot of busySlots) {
      // Pré-reservado (aceite de visitante) é soft: avisa, mas não trava a agenda
      add(slot.status === 'PreReserved' ? soft : hard, slot.date, slot.startTime, slot.endTime)
    }
    return { blockedTimesByDate: hard, softTimesByDate: soft }
  }, [availabilities, busySlots])

  // Dia inteiro bloqueado (janela 06:00–24:00 coberta) → desabilitado no calendário;
  // bloqueio parcial → dia continua selecionável (bolinha amarela) e os horários bloqueados
  // são desabilitados nos seletores de hora.
  const { fullyBlockedDates, partialDates } = useMemo(() => {
    const full: string[] = []
    const partial: string[] = []
    for (const [date, intervals] of Object.entries(blockedTimesByDate)) {
      const sorted = [...intervals].sort((a, b) => a.start.localeCompare(b.start))
      let cursor = '06:00'
      let covered = true
      for (const interval of sorted) {
        if (interval.start > cursor) {
          covered = false
          break
        }
        if (interval.end > cursor) cursor = interval.end
      }
      if (covered && cursor >= '23:59') full.push(date)
      else partial.push(date)
    }
    return { fullyBlockedDates: full, partialDates: partial }
  }, [blockedTimesByDate])

  const addFavorite = useMutation({
    mutationFn: () => favoritesApi.add(artist!.id),
    onSuccess: () => {
      setIsFavorite(true)
      toast.success('Adicionado aos favoritos!')
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const [aba, setAba] = useState<'geral' | 'agenda' | 'caches' | 'midia' | 'avaliacoes'>('geral')
  const [estilosExpandidos, setEstilosExpandidos] = useState(false)
  const [sobreExpandido, setSobreExpandido] = useState(false)


  const agendaAgrupada = useMemo(() => {
    const porData = new Map<string, TimeInterval[]>()
    for (const a of availableDates) {
      const janelas = workingTimesByDate[a.date] ?? []
      if (janelas.length > 0) porData.set(a.date, janelas)
    }
    return Array.from(porData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, janelas]) => ({ date, horario: resumirJanelas(janelas) }))
  }, [availableDates, workingTimesByDate])

  // Datas ocupadas por status: Confirmado = fechado; Scheduled/PreReserved = marcado (laranja).
  const ocupadasPorData = useMemo(() => {
    const prioridade: Record<string, number> = { Confirmed: 3, Scheduled: 2, PreReserved: 1 }
    const mapa: Record<string, { status: string; horario: string }> = {}
    for (const slot of busySlots) {
      const atual = mapa[slot.date]
      if (!atual || (prioridade[slot.status] ?? 0) > (prioridade[atual.status] ?? 0)) {
        mapa[slot.date] = { status: slot.status, horario: `${slot.startTime.slice(0, 5)} – ${slot.endTime.slice(0, 5)}` }
      }
    }
    return mapa
  }, [busySlots])

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!artist) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <EmptyState title="Artista não encontrado" />
      </div>
    )
  }

  const tipo = artist.artistType === 'Band' ? 'Banda/Grupo' : 'Solo'

  const ehDono = isAuthenticated && user?.role === 'Artist' && user.artistId === artist.id
  const chips = [...artist.styles, ...artist.specialties]
  const chipsVisiveis = estilosExpandidos ? chips : chips.slice(0, 6)
  const primeiraLinha = (artist.description || '').split('\n')[0] ?? ''
  const tagline = primeiraLinha.length > 120 ? `${primeiraLinha.slice(0, 117)}…` : primeiraLinha
  const descricaoLonga = (artist.description || '').length > 200

  const abas = [
    { id: 'geral', label: 'Visão Geral', icon: House },
    { id: 'agenda', label: 'Agenda', icon: CalendarDays },
    { id: 'caches', label: 'Cachês', icon: Coins },
    { id: 'midia', label: 'Mídia', icon: Images },
    { id: 'avaliacoes', label: 'Avaliações', icon: Star },
  ] as const

  const compartilhar = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: `${artist.artisticName} no Reprissa`, url })
        return
      }
    } catch {
      /* compartilhamento nativo indisponível ou cancelado — segue para o clipboard */
    }
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const area = document.createElement('textarea')
      area.value = url
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
    toast.success('Link copiado para a área de transferência!')
  }

  // ── blocos reutilizados entre as abas ──
  const cachêsCard = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-primary" /> Cachês
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_190px]">
        <div>
          {artist.fees.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sob consulta — defina o valor na sua proposta.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-primary/5 text-left">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Duração</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {artist.fees.map((fee, i) => (
                    <tr key={fee.id} className="border-t">
                      <td className="px-4 py-2.5 font-medium">{minutesToLabel(fee.durationMinutes)}{i === 0 ? ' ¹' : ''}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{formatMoney(fee.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">¹ Valores de referência — o preço final é definido pela proposta.</p>
        </div>
        {artist.aceitaNegociarPropostas && (
          <div className="flex flex-col items-center justify-center gap-3 self-start rounded-lg border bg-secondary/40 p-4 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Info className="h-5 w-5" />
            </span>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Valores de referência — o preço final é definido pela proposta.
            </p>
            <Button variant="outline" size="sm" className="rounded-full" onClick={abrirContratacao}>
              Solicitar proposta
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const avaliacoesCard = (mostrarTodas: boolean) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> Avaliações
        </CardTitle>
        {!mostrarTodas && artist.reviewCount > 0 && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {artist.reviewCount}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {artist.reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda sem avaliações — seja o primeiro a contratar e avaliar.</p>
        ) : (
          <>
            <div className="space-y-3">
              {(mostrarTodas ? artist.reviews : artist.reviews.slice(0, 1)).map((review) => (
                <article key={review.id} className="rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                      {review.contractorName.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{review.contractorName}</p>
                      <div className="flex items-center gap-2">
                        <RatingStars value={review.overallRating} />
                        <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  {review.comment && <p className="mt-3 text-sm text-muted-foreground">{review.comment}</p>}
                </article>
              ))}
            </div>
            {!mostrarTodas && (
              <Button variant="outline" className="mt-4 w-full" onClick={() => setAba('avaliacoes')}>
                Ver todas as avaliações <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="mx-auto w-full min-h-[65vh] max-w-6xl px-4 pb-16 pt-6">
      {/* Trilha de navegação */}
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/artistas" className="hover:text-foreground hover:underline">
          Artistas
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate font-medium text-foreground">{artist.artisticName}</span>
      </nav>

      {/* Cartão principal (hero) */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Identidade */}
            <div className="flex min-w-0 flex-1 gap-5">
              <Avatar
                src={artist.profilePhotoUrl}
                alt={artist.artisticName}
                className="h-24 w-24 shrink-0 border bg-background text-3xl shadow-sm sm:h-32 sm:w-32"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold sm:text-3xl">{artist.artisticName}</h1>
                  {artist.reviewCount > 0 && (
                    <span title="Perfil com avaliações de contratantes">
                      <BadgeCheck className="h-5 w-5 shrink-0 text-sky-400" />
                    </span>
                  )}
                </div>
                <p className="mt-0.5 font-semibold">
                  {artist.categoryName} · {tipo}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {artist.reviewCount > 0 && (
                    <span className="flex items-center gap-1.5">
                      <RatingStars value={artist.averageRating ?? 0} />
                      <span className="font-medium text-foreground">
                        {artist.averageRating != null ? artist.averageRating.toFixed(1) : '—'}
                      </span>
                      <span>({artist.reviewCount} avaliação{artist.reviewCount > 1 ? 'es' : ''})</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> {artist.city}, {artist.state}
                  </span>
                </div>

                {tagline && (
                  <p className="mt-3 text-sm text-muted-foreground">{tagline}</p>
                )}

                {chips.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {chipsVisiveis.map((s) => (
                      <Badge key={s} variant="secondary" className="rounded-full px-3 py-1">
                        {s}
                      </Badge>
                    ))}
                    {chips.length > 6 && (
                      <button
                        type="button"
                        onClick={() => setEstilosExpandidos((v) => !v)}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {estilosExpandidos ? 'Ver menos' : '+Ver mais'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Preço + ações */}
            <div className="flex shrink-0 flex-col gap-3 lg:w-60 lg:border-l lg:border-border/60 lg:pl-6">
              {artist.startingPrice != null && (
                <p className="text-center lg:text-right">
                  <span className="block text-xs text-muted-foreground">A partir de</span>
                  <span className="text-2xl font-bold">{formatMoney(artist.startingPrice)}</span>
                  <span className="block text-xs text-muted-foreground">/apresentação</span>
                </p>
              )}
              <Button size="lg" onClick={abrirContratacao}>
                <CalendarPlus /> Solicitar contratação
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={compartilhar}>
                  <Share2 /> Compartilhar perfil
                </Button>
                {isContractor && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={() => addFavorite.mutate()}
                    disabled={isFavorite}
                    title="Favoritar"
                  >
                    <Heart className={isFavorite ? 'fill-destructive text-destructive' : ''} />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Abas */}
      <div className="mt-4 flex gap-1 overflow-x-auto rounded-xl border bg-card p-1.5">
        {abas.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setAba(t.id)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              aba === t.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Conteúdo das abas */}
      <div className="mt-4">
        {aba === 'geral' && (
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* Coluna principal */}
            <div className="min-w-0 space-y-4">
              {/* Sobre o artista */}
              <Card className="relative overflow-hidden">
                {artist.galleryUrls[0] && (
                  <>
                    <img
                      src={artist.galleryUrls[0]}
                      alt=""
                      className="absolute inset-y-0 right-0 h-full w-1/2 object-cover opacity-70"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-card via-card/85 to-card/20" />
                  </>
                )}
                <CardContent className="relative p-5">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Music2 className="h-4 w-4 text-primary" /> Sobre o artista
                  </CardTitle>
                  <p
                    className={cn(
                      'mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground',
                      !sobreExpandido && descricaoLonga && 'line-clamp-3'
                    )}
                  >
                    {artist.description || 'Este artista ainda não escreveu uma descrição.'}
                  </p>
                  {artist.eventTypes.length > 0 && sobreExpandido && (
                    <div className="mt-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ideal para</p>
                      <div className="flex flex-wrap gap-2">
                        {artist.eventTypes.map((type) => (
                          <Badge key={type} variant="secondary" className="rounded-full px-3 py-1">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {descricaoLonga && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 rounded-full"
                      onClick={() => setSobreExpandido((v) => !v)}
                    >
                      {sobreExpandido ? 'Ver menos' : 'Ver mais sobre'} <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Cachês */}
              {cachêsCard}

              {/* Avaliações (prévia) */}
              {avaliacoesCard(false)}
            </div>

            {/* Coluna lateral */}
            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Info className="h-4 w-4 text-primary" /> Informações principais
                  </CardTitle>
                  {ehDono && (
                    <Link to="/artist/perfil" className="text-xs font-medium text-primary hover:underline">
                      Editar
                    </Link>
                  )}
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm">
                  <InfoRow label="Tipo" value={tipo} />
                  <InfoRow label="Categoria" value={artist.categoryName} />
                  <InfoRow label="Atende em" value={`${artist.city}, ${artist.state}`} />
                  <InfoRow
                    label="Avaliação"
                    value={
                      artist.averageRating != null ? (
                        <span className="flex items-center gap-1.5">
                          <RatingStars value={artist.averageRating} /> {artist.averageRating.toFixed(1)} / 5
                        </span>
                      ) : (
                        '—'
                      )
                    }
                  />
                  <InfoRow label="Avaliações recebidas" value={String(artist.reviewCount)} />
                  <InfoRow label="Datas disponíveis" value={String(availableDates.length)} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">Agenda disponível</CardTitle>
                  <button
                    type="button"
                    onClick={() => setAba('agenda')}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Ver agenda <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {agendaAgrupada.length === 0 && (
                    <p className="text-sm text-muted-foreground">Consulte a disponibilidade pela solicitação.</p>
                  )}
                  {agendaAgrupada.slice(0, 6).map((a) => (
                    <div key={a.date} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span>{new Date(a.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      <span className="text-muted-foreground">{a.horario}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </aside>
          </div>
        )}

        {aba === 'agenda' && (
          <div className="space-y-4">
            {/* Calendário mensal */}
            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCursorMes(addMonths(cursorMes, -1))}
                    aria-label="Mês anterior"
                  >
                    <ChevronRight className="h-4 w-4 rotate-180" />
                  </Button>
                  <p className="text-sm font-medium capitalize">
                    {format(cursorMes, 'MMMM yyyy', { locale: ptBR })}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCursorMes(addMonths(cursorMes, 1))}
                    aria-label="Próximo mês"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-7 gap-px text-center text-xs font-medium text-muted-foreground">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                    <div key={d} className="py-1.5">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-px">
                  {diasDoMes.map((day) => {
                    const key = format(day, 'yyyy-MM-dd')
                    const janelas = workingTimesByDate[key] ?? []
                    const ocupacao = ocupadasPorData[key]
                    const passado = key < toDateInput(new Date())
                    const disponivel = janelas.length > 0 && !passado && !ocupacao
                    const ehHoje = key === toDateInput(new Date())
                    return (
                      <div
                        key={key}
                        className={cn(
                          'min-h-14 sm:min-h-20 rounded-md border p-1.5 text-left',
                          ehHoje && 'border-primary',
                          passado && 'opacity-40',
                          ocupacao && !disponivel && 'bg-amber-500/5'
                        )}
                      >
                        <span className={cn('text-xs', ehHoje && 'font-bold text-primary', !disponivel && !ocupacao && 'text-muted-foreground/60')}>
                          {format(day, 'd')}
                        </span>
                        <div className="mt-1 space-y-0.5">
                          {disponivel && (
                            <p className="truncate rounded bg-emerald-100 px-1 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                              {resumirJanelas(janelas)}
                            </p>
                          )}
                          {ocupacao && !disponivel && (
                            <p
                              className={cn(
                                'truncate rounded px-1 py-0.5 text-[10px] font-medium',
                                ocupacao.status === 'Confirmed'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                              )}
                            >
                              {ocupacao.status === 'Confirmed' ? 'Ocupado' : ocupacao.status === 'Scheduled' ? 'Reservado' : 'Pré-reserva'}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Livre para shows
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400" /> Reservado (não fechado)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-400" /> Ocupado (confirmado)
                  </span>
                </div>
              </CardContent>
            </Card>

            {Object.keys(ocupadasPorData).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Datas com shows agendados</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(ocupadasPorData)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([date, info]) => (
                      <div key={date} className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <p className="text-sm font-medium">
                            {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
                              weekday: 'short',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">{info.horario}</p>
                        </div>
                        {info.status === 'Confirmed' ? (
                          <Badge variant="destructive">Ocupado</Badge>
                        ) : (
                          <Badge variant="warning">{info.status === 'Scheduled' ? 'Reservado' : 'Pré-reservado'}</Badge>
                        )}
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {aba === 'caches' && cachêsCard}

        {aba === 'midia' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Images className="h-4 w-4 text-primary" /> Fotos ({fotosMidia.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {fotosMidia.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma foto publicada ainda.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {fotosMidia.map((url) => (
                      <figure key={url} className="group overflow-hidden rounded-lg border bg-muted">
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={url}
                            alt={`Foto de ${artist.artisticName}`}
                            loading="lazy"
                            className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        </a>
                      </figure>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Images className="h-4 w-4 text-primary" /> Vídeos ({videosMidia.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {videosMidia.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum vídeo publicada ainda.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {videosMidia.map((url) => (
                      <video key={url} src={url} controls preload="metadata" className="aspect-video w-full rounded-lg border bg-black" />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music2 className="h-4 w-4 text-primary" /> Músicas e streams
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(musicasMidia.length === 0 && !epk?.spotifyUrl && !epk?.youTubeUrl && !epk?.soundCloudUrl) ? (
                  <p className="text-sm text-muted-foreground">Nenhuma música ou link de streaming publicado ainda.</p>
                ) : (
                  <>
                    {musicasMidia.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {musicasMidia.map((musica) => (
                          <span key={musica} className="rounded-full border bg-secondary/40 px-3 py-1 text-sm">
                            {musica}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {epk?.spotifyUrl && (
                        <a href={epk.spotifyUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">Ouvir no Spotify</Button>
                        </a>
                      )}
                      {epk?.youTubeUrl && (
                        <a href={epk.youTubeUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">Ver no YouTube</Button>
                        </a>
                      )}
                      {epk?.soundCloudUrl && (
                        <a href={epk.soundCloudUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">Ouvir no SoundCloud</Button>
                        </a>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {aba === 'avaliacoes' && avaliacoesCard(true)}
      </div>

      <BookingRequestDialog
        artistId={artist.id}
        artistName={artist.artisticName}
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        onCreated={(id) => navigate(`/contractor/solicitacoes/${id}`)}
        fullyBlockedDates={fullyBlockedDates}
        partialDates={partialDates}
        blockedTimesByDate={blockedTimesByDate}
        softTimesByDate={softTimesByDate}
        workingWeekdays={workingWeekdays}
        workingTimesByDate={workingTimesByDate}
        fees={artist.fees}
        aceitaNegociar={artist.aceitaNegociarPropostas}
      />
    </div>
  )
}

/** Linha rótulo: valor usada nos blocos de informações da coluna lateral. */
function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium">{value}</span>
    </div>
  )
}

/** Rótulo das janelas de atendimento do dia — ex.: "20:00–23:00". */
function workingTimesLabel(windows: TimeInterval[]) {
  return [...windows]
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((w) => `${w.start}–${w.end}`)
    .join(' e ')
}

/** Duração em minutos entre dois horários HH:mm; faixas que cruzam a meia-noite somam 24h. */
function duracaoEntre(inicio: string, fim: string): number {
  const [sh, sm] = inicio.split(':').map(Number)
  const [eh, em] = fim.split(':').map(Number)
  const minutos = eh * 60 + em - (sh * 60 + sm)
  return minutos > 0 ? minutos : minutos + 1440
}

/** 90 → "1h30"; 60 → "1h"; 45 → "45min". */
function formatarDuracao(minutos: number): string {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m}min`
  return m > 0 ? `${h}h${m}` : `${h}h`
}

/**
 * Resume as janelas do dia em um único período — faixas que cruzam a meia-noite
 * (ex.: 12:00–24:00 + 00:00–05:00) viram "12:00 – 05:00" em vez de "+1".
 */
function resumirJanelas(janelas: TimeInterval[]): string {
  if (janelas.length === 0) return ''
  const cruzaMeiaNoite = janelas.some((w) => w.start > '00:00')
  const chave = (start: string) => (cruzaMeiaNoite && start === '00:00' ? '24:00' : start)
  const ordenadas = [...janelas].sort((a, b) => chave(a.start).localeCompare(chave(b.start)))
  return `${ordenadas[0].start} – ${ordenadas[ordenadas.length - 1].end}`
}

export function BookingRequestDialog({
  artistId,
  artistName,
  open,
  onClose,
  onCreated,
  fullyBlockedDates = [],
  partialDates = [],
  blockedTimesByDate = {},
  softTimesByDate = {},
  workingWeekdays = [],
  workingTimesByDate = {},
  fees = [],
  aceitaNegociar = true,
}: {
  artistId: string
  artistName: string
  open: boolean
  onClose: () => void
  onCreated?: (bookingId: string) => void
  fullyBlockedDates?: string[]
  partialDates?: string[]
  blockedTimesByDate?: Record<string, TimeInterval[]>
  softTimesByDate?: Record<string, TimeInterval[]>
  workingWeekdays?: number[]
  workingTimesByDate?: Record<string, TimeInterval[]>
  fees?: Fee[]
  aceitaNegociar?: boolean
}) {
  const [eventDate, setEventDate] = useState('')
  const [startTime, setStartTime] = useState<string | null>(null)
  const [endTime, setEndTime] = useState<string | null>(null)

  const dateOutsideWorkingDays =
    workingWeekdays.length > 0 &&
    eventDate !== '' &&
    !workingWeekdays.includes(new Date(`${eventDate}T00:00:00`).getDay())
  const [location, setLocation] = useState('')
  const [locationComplete, setLocationComplete] = useState<LocationCompleteItem | null>(null)
  const [cep, setCep] = useState('')
  const [eventType, setEventType] = useState<EventType>('Show')
  const [estimatedAudience, setEstimatedAudience] = useState('')
  const [budget, setBudget] = useState('')
  const [message, setMessage] = useState('')
  const [selectedAddons, setSelectedAddons] = useState<BookingAddonItem[]>([])
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [addressNumber, setAddressNumber] = useState('')

  const { data: addons } = useQuery({
    queryKey: ['artist-addons', artistId],
    queryFn: async () => (await addonsApi.list(artistId)).data,
    enabled: open && !!artistId,
  })

    const STEP_TITLES = (addons?.equipment.length == 0 && addons?.teamMembers.length == 0) ? ['Detalhes do evento', 'Endereço', 'Orçamento', 'Confirmação'] : ['Detalhes do evento', 'Endereço', 'Orçamento & Adicionais', 'Confirmação']

    // Duração selecionada em minutos → cachê correspondente pré-preenche o orçamento.
  const duracaoMinutos = useMemo(
    () => (startTime && endTime ? duracaoEntre(startTime, endTime) : null),
    [startTime, endTime]
  )
  const feeDaDuracao = duracaoMinutos ? fees.find((f) => f.durationMinutes === duracaoMinutos) : undefined

  // Bloqueio por cachê: com cachês cadastrados, só vale faixa cuja duração bate com um deles.
  // Faixa inválida não é aceita — mantém o início marcado, descarta o fim e avisa o contratante.
  const handleHorario = (s: string | null, e: string | null) => {
    if (s && e && fees.length > 0 && !fees.some((f) => f.durationMinutes === duracaoEntre(s, e))) {
      const opcoes = [...new Set(fees.map((f) => f.durationMinutes))]
        .filter((m) => m > 0)
        .sort((a, b) => a - b)
        .map(formatarDuracao)
        .join(', ')
      toast.error(`O artista não faz shows nesse período selecionado. Cachês disponíveis: ${opcoes}.`)
      setStartTime(s)
      setEndTime(null)
      return
    }
    setStartTime(s)
    setEndTime(e)
  }

  useEffect(() => {
    if (feeDaDuracao) setBudget(String(feeDaDuracao.price))
  }, [feeDaDuracao])

  const baseBudget = Number(budget.replace(',', '.')) || 0
    
    const getLocation = async (cepCompleto: string) => {
      try {
          const data = await viaCepApi.getAddress({
              cep: cepCompleto
          }).then(result => {
              console.log(result.data)
              setLocationComplete(result.data)
              setLocation(result.data.logradouro)
          })
      }catch (e) {
          console.error('Error getLocation')
      }
    }


  // Prévia dos adicionais — mesma fórmula do servidor: percentual sobre a proposta, fixo somado.
  const addonDetails = useMemo(() => {
    const details: { itemType: AddonItemType; itemId: string; name: string; label: string; amount: number }[] = []
    for (const sel of selectedAddons) {
      if (sel.itemType === 'TeamMember') {
        const member = addons?.teamMembers.find((t) => t.id === sel.itemId)
        if (member) {
          const amount =
            member.shareType === 'Percentage'
              ? Math.round((baseBudget * member.shareValue) / 100 * 100) / 100
              : member.shareValue
          details.push({ itemType: sel.itemType, itemId: sel.itemId, name: member.name, label: member.role || 'Equipe externa', amount })
        }
      } else {
        const equipment = addons?.equipment.find((t) => t.id === sel.itemId)
        if (equipment) {
          const amount =
            equipment.shareType === 'Percentage'
              ? Math.round((baseBudget * equipment.shareValue) / 100 * 100) / 100
              : equipment.shareValue
          details.push({ itemType: sel.itemType, itemId: sel.itemId, name: equipment.name, label: equipment.category || 'Equipamento externo', amount })
        }
      }
    }
    return details
  }, [selectedAddons, addons, baseBudget])

  const addonsTotal = addonDetails.reduce((sum, a) => sum + a.amount, 0)

  const toggleAddon = (itemType: AddonItemType, itemId: string) => {
    setSelectedAddons((current) =>
      current.some((a) => a.itemType === itemType && a.itemId === itemId)
        ? current.filter((a) => !(a.itemType === itemType && a.itemId === itemId))
        : [...current, { itemType, itemId }]
    )
  }

  const create = useMutation({
    mutationFn: () =>
      bookingsApi.create({
        artistId,
        eventDate,
        startTime: `${startTime}:00`,
        endTime: `${endTime}:00`,
        location,
        eventType,
        estimatedAudience: estimatedAudience ? Number(estimatedAudience) : null,
        budget: budget ? Number(budget.replace(',', '.')) : null,
        message,
        addons: selectedAddons,
      }),
    onSuccess: ({ data }) => {
      toast.success('Solicitação enviada! Aguarde o retorno do artista.')
      onClose()
      onCreated?.((data as { id: string }).id)
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const handleContinue = () => {
    if (step === 0) {
      if (!eventDate) {
        toast.warning('Escolha o dia na agenda')
        return
      }
      if (!startTime || !endTime) {
        toast.warning('Selecione o horário de início e fim do evento')
        return
      }
    }
    if(step === 1) {
        if (!location.trim()) {
            toast.warning('Informe o local do evento')
            return
        }
    }
    setStep((s) => s + 1)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) {
        setSelectedAddons([])
        setStep(0)
      }
      onClose()
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar contratação — {artistName}</DialogTitle>
        </DialogHeader>

        {/* Indicador de passos */}
        <ol className="flex items-center gap-2">
          {STEP_TITLES.map((title, index) => {
            const done = index < step
            const active = index === step
            return (
              <li key={title} className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold',
                    active && 'border-primary bg-primary text-primary-foreground',
                    done && 'border-primary/40 bg-primary/10 text-primary',
                    !active && !done && 'bg-muted text-muted-foreground'
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                <span className={cn('hidden text-xs sm:block', active ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                  {title}
                </span>
                {index < STEP_TITLES.length - 1 && <span className="h-px w-4 bg-border" />}
              </li>
            )
          })}
        </ol>
        <p className="-mt-2 text-center text-xs text-muted-foreground">
          Passo {step + 1} de {STEP_TITLES.length} — {STEP_TITLES[step]}
        </p>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (fullyBlockedDates.includes(eventDate)) {
              toast.warning('O artista está indisponível nessa data. Escolha outro dia na agenda.')
              return
            }
            if (!startTime || !endTime) {
              toast.warning('Selecione o horário de início e fim do evento')
              return
            }
            create.mutate()
          }}
        >
          {/* Passo 1 — Detalhes do evento */}
          {step === 0 && (
          <>
          <div className="space-y-1.5">
            <Label>Data *</Label>
            <DatePickerCalendar
              value={eventDate || undefined}
              onChange={(d) => {
                setEventDate(d)
                setStartTime(null)
                setEndTime(null)
              }}
              mode="weekly"
              minDate={toDateInput()}
              disabledDates={fullyBlockedDates}
              partialDates={partialDates}
              workingWeekdays={workingWeekdays}
            />
            <p className="text-xs text-muted-foreground">
              {dateOutsideWorkingDays
                ? 'O artista não atende nesse dia da semana.'
                : !eventDate
                  ? 'Escolha o dia na agenda. Dias riscados estão fechados; bolinha amarela = bloqueio parcial.'
                  : `Selecionado: ${formatDate(eventDate)}`}
            </p>
          </div>
          {eventDate && (
            <TimeRangePicker
              start={startTime}
              end={endTime}
              onChange={handleHorario}
              blocked={blockedTimesByDate[eventDate] ?? []}
              soft={softTimesByDate[eventDate] ?? []}
              allowed={workingTimesByDate[eventDate]}
            />
          )}
          {eventDate && workingTimesByDate[eventDate]?.length ? (
                  <p className="text-xs text-muted-foreground">
                      Horários de atendimento de {artistName} neste dia:{' '}
                      {workingTimesLabel(workingTimesByDate[eventDate])}.
                  </p>
          ) : null}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            <div className="space-y-1.5">
              <Label>Tipo de evento</Label>
              <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(eventTypeLabel).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
              <div className="space-y-1.5">
                  <Label>Público estimado</Label>
                  <Input
                      type="number"
                      min={0}
                      value={estimatedAudience}
                      onChange={(e) => setEstimatedAudience(e.target.value)}
                  />
              </div>
          </div>
         
          <div className="space-y-1.5">
            <Label>Mensagem</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Conte os detalhes do evento..." />
          </div>
          </>
          )}

            {step === 1 && (
                <div className="space-y-3 rounded-xl border p-4 ">
                    <div>
                        <p className="text-sm font-semibold">Informações do endereço</p>
                        <p className="text-xs text-muted-foreground">
                            Preencha as informações de endereço do seu evento
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-1.5">
                            <Label>CEP</Label>
                            <Input
                                value={cep}
                                maxLength={8}
                                onChange={(e) => {
                                    setCep(e.target.value)
                                    if (e.target.value.replace(/\D/g, "").length === 8) {
                                        getLocation(e.target.value);
                                    }
                                }}
                                placeholder="CEP do evento"
                            />
                        </div>
                        
                        {locationComplete && locationComplete.logradouro != null && (
                            <div>
                                <div className="space-y-1.5">
                                    <Label>Número</Label>
                                    <Input value={addressNumber} onChange={(e) => (
                                        setAddressNumber(e.target.value),
                                        setLocation(`${locationComplete.logradouro}, ${e.target.value}`)
                                    )} placeholder="Endereço do evento" />
                                </div>
                                <div className="space-y-1.5 mt-2">
                                    <Label>Logradouro</Label>
                                    <Input value={location} onChange={(e) => setLocation(`${e.target.value}, ${addressNumber}`)} placeholder="Endereço do evento" readOnly={true} className="cursor-not-allowed bg-muted"/>
                                </div>
                                
                            </div>
                        )}
                    </div>
                </div>
            )}
          {/* Adicionais — equipe e equipamentos externos (percentual sobre o orçamento ou valor fixo) */}
          {(step === 2 && (
              <div>
                <div className="space-y-3 rounded-xl border p-4 mb-4">
                      <div>
                          <p className="text-sm font-semibold">Negociação do cache</p>
                          <p className="text-xs text-muted-foreground">
                              Profissionais e equipamentos extras oferecidos por {artistName}. O valor entra na proposta
                              (percentual sobre o orçamento ou valor fixo).
                          </p>
                          <div className="space-y-1.5 mt-4">
                              <Label>Valor da proposta de negociação (R$)</Label>
                              <Input
                                  value={budget}
                                  onChange={(e) => aceitaNegociar && setBudget(e.target.value)}
                                  placeholder="Valor da proposta de negociação"
                                  readOnly={!aceitaNegociar}
                                  className={cn(!aceitaNegociar && 'cursor-not-allowed bg-muted')}
                              />
                              {feeDaDuracao && (
                                  <p className="text-xs text-muted-foreground">
                                      {aceitaNegociar
                                          ? `Valor sugerido pelo cachê de ${minutesToLabel(duracaoMinutos!)} — você pode ajustar.`
                                          : `Valor fixo do cachê de ${minutesToLabel(duracaoMinutos!)} — não negociável.`}
                                  </p>
                              )}
                          </div>
                      </div>
                  </div>

                  {((addons?.teamMembers.length ?? 0) > 0 || (addons?.equipment.length ?? 0) > 0) && (
                <div className="space-y-3 rounded-xl border p-4">
                    
                  <div>
                    <p className="text-sm font-semibold">Adicionais para o seu evento</p>
                    <p className="text-xs text-muted-foreground">
                      Profissionais e equipamentos extras oferecidos por {artistName}. O valor entra na proposta
                      (percentual sobre o orçamento ou valor fixo).
                    </p>
                  </div>
                    
    
                  {addons!.teamMembers.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Equipe externa</p>
                      {addons!.teamMembers.map((member) => {
                        const selected = selectedAddons.some((a) => a.itemType === 'TeamMember' && a.itemId === member.id)
                        return (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => toggleAddon('TeamMember', member.id)}
                            className={cn(
                              'flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors',
                              selected ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={cn(
                                  'flex h-5 w-5 items-center justify-center rounded border',
                                  selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-background'
                                )}
                              >
                                {selected && <Check className="h-3.5 w-3.5" />}
                              </span>
                              <div>
                                <p className="text-sm font-medium">{member.name}</p>
                                <p className="text-xs text-muted-foreground">{member.role || 'Equipe externa'}</p>
                              </div>
                            </div>
                            <span className="text-sm font-semibold">
                              {member.shareType === 'Percentage'
                                ? '+ ' + member.shareValue + '%'
                                : '+ ' + formatMoney(member.shareValue)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
    
                  {addons!.equipment.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Equipamentos externos
                      </p>
                      {addons!.equipment.map((equipment) => {
                        const selected = selectedAddons.some((a) => a.itemType === 'Equipment' && a.itemId === equipment.id)
                        return (
                          <button
                            key={equipment.id}
                            type="button"
                            onClick={() => toggleAddon('Equipment', equipment.id)}
                            className={cn(
                              'flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors',
                              selected ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={cn(
                                  'flex h-5 w-5 items-center justify-center rounded border',
                                  selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-background'
                                )}
                              >
                                {selected && <Check className="h-3.5 w-3.5" />}
                              </span>
                              <div>
                                <p className="text-sm font-medium">{equipment.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {equipment.category || 'Equipamento'}
                                </p>
                              </div>
                            </div>
                            <span className="text-sm font-semibold">
                              {equipment.shareType === 'Percentage'
                                ? '+ ' + equipment.shareValue + '%'
                                : '+ ' + formatMoney(equipment.shareValue)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
    
                  {selectedAddons.length > 0 && (
                    <div className="rounded-lg bg-muted/50 p-3 text-sm">
                      {addonDetails.map((detail, i) => (
                        <p key={`${detail.itemType}-${detail.itemId}-${i}`} className="flex justify-between">
                          <span className="text-muted-foreground">
                            {detail.name} ({detail.label})
                          </span>
                          <span className="font-medium">{formatMoney(detail.amount)}</span>
                        </p>
                      ))}
                      {baseBudget > 0 && (
                        <p className="mt-2 flex justify-between border-t pt-2 font-semibold">
                          <span>Total com adicionais</span>
                          <span className="text-primary">{formatMoney(baseBudget + addonsTotal)}</span>
                        </p>
                      )}
                      {baseBudget <= 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Informe o orçamento acima para ver o cálculo dos adicionais em percentual.
                        </p>
                      )}
                    </div>
                  )}
                </div>
                  )}
                </div>
                      
          ))}



          {/* Passo 3 — Confirmação (revisão) */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="space-y-2 rounded-lg border p-3 text-sm">
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Artista</span>
                  <span className="font-medium">{artistName}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Data</span>
                  <span className="font-medium">{formatDate(eventDate)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Horário</span>
                  <span className="font-medium">{startTime}–{endTime}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Local</span>
                  <span className="font-medium">{location}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Tipo de evento</span>
                  <span className="font-medium">{eventTypeLabel[eventType]}</span>
                </p>
                {estimatedAudience && (
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Público estimado</span>
                    <span className="font-medium">{estimatedAudience} pessoas</span>
                  </p>
                )}
                {message && (
                  <p className="flex justify-between gap-6">
                    <span className="shrink-0 text-muted-foreground">Mensagem</span>
                    <span className="text-right">{message}</span>
                  </p>
                )}
              </div>

              <div className="rounded-lg border p-3 text-sm">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Valores
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">
                    Orçamento {feeDaDuracao ? `(cachê de ${minutesToLabel(duracaoMinutos!)})` : ''}
                  </span>
                  <span className="font-medium">{baseBudget > 0 ? formatMoney(baseBudget) : 'A combinar'}</span>
                </p>
                {addonDetails.map((detail, i) => (
                  <p key={`${detail.itemType}-${detail.itemId}-${i}`} className="flex justify-between">
                    <span className="text-muted-foreground">{detail.name} ({detail.label})</span>
                    <span className="font-medium">{formatMoney(detail.amount)}</span>
                  </p>
                ))}

                <p className="mt-2 flex justify-between border-t pt-2 font-semibold">
                  <span>Total a pagar</span>
                  <span className="text-primary">
                    {formatMoney(baseBudget + addonsTotal)}
                  </span>
                </p>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <p className="text-xs text-muted-foreground">
                Após o envio, o artista aciona o pagamento; você paga o valor acima pelo checkout
                seguro (InfinityPay) e o show é confirmado automaticamente.
              </p>
            </div>
          )}

          {/* Navegação dos passos */}
          {step < STEP_TITLES.length - 1 ? (
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep((s) => s - 1)}>
                  Voltar
                </Button>
              )}
              <Button type="button" className="flex-1" onClick={handleContinue}>
                Continuar
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep((s) => s - 1)}>
                Voltar
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={create.isPending}
                onClick={() => {
                  if (fullyBlockedDates.includes(eventDate)) {
                    toast.warning('O artista está indisponível nessa data. Escolha outro dia na agenda.')
                    return
                  }
                  create.mutate()
                }}
              >
                {create.isPending ? 'Enviando...' : 'Enviar solicitação'}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** WhatsApp com DDD: aceita 10–13 dígitos após remover máscara. */
function isValidWhatsapp(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 13
}

/**
 * Solicitação pela rota pública, sem cadastro: pede os dados básicos de contato do contratante
 * (nome do responsável, estabelecimento, WhatsApp e valor da proposta) + os detalhes do evento.
 * O acompanhamento acontece pelo WhatsApp informado — sem área logada.
 */
export function GuestBookingDialog({
  artistId,
  artistName,
  startingPrice,
  open,
  onClose,
  fullyBlockedDates = [],
  partialDates = [],
  blockedTimesByDate = {},
  softTimesByDate = {},
  workingWeekdays = [],
  workingTimesByDate = {},
}: {
  artistId: string
  artistName: string
  startingPrice: number | null
  open: boolean
  onClose: () => void
  fullyBlockedDates?: string[]
  partialDates?: string[]
  blockedTimesByDate?: Record<string, TimeInterval[]>
  softTimesByDate?: Record<string, TimeInterval[]>
  workingWeekdays?: number[]
  workingTimesByDate?: Record<string, TimeInterval[]>
}) {
  const [step, setStep] = useState(0)
  const [guestName, setGuestName] = useState('')
  const [guestCompanyName, setGuestCompanyName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [budget, setBudget] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [startTime, setStartTime] = useState<string | null>(null)
  const [endTime, setEndTime] = useState<string | null>(null)
  const [location, setLocation] = useState('')
  const [eventType, setEventType] = useState<EventType>('Show')
  const [estimatedAudience, setEstimatedAudience] = useState('')
  const [message, setMessage] = useState('')
  const [selectedAddons, setSelectedAddons] = useState<BookingAddonItem[]>([])
  const [created, setCreated] = useState(false)

  const today = toDateInput()

  const { data: addons } = useQuery({
    queryKey: ['artist-addons', artistId],
    queryFn: async () => (await addonsApi.list(artistId)).data,
    enabled: open && !!artistId,
  })

  const baseBudget = Number(budget.replace(',', '.')) || 0

  // Prévia dos adicionais selecionados — mesma fórmula do servidor:
  // percentual calculado sobre a proposta base, fixo somado diretamente.
  const addonDetails = useMemo(() => {
    const details: { itemType: AddonItemType; itemId: string; name: string; label: string; amount: number }[] = []
    for (const sel of selectedAddons) {
      if (sel.itemType === 'TeamMember') {
        const member = addons?.teamMembers.find((t) => t.id === sel.itemId)
        if (member) {
          const amount =
            member.shareType === 'Percentage'
              ? Math.round((baseBudget * member.shareValue) / 100 * 100) / 100
              : member.shareValue
          details.push({ itemType: sel.itemType, itemId: sel.itemId, name: member.name, label: member.role || 'Equipe externa', amount })
        }
      } else {
        const equipment = addons?.equipment.find((t) => t.id === sel.itemId)
        if (equipment) {
          const amount =
            equipment.shareType === 'Percentage'
              ? Math.round((baseBudget * equipment.shareValue) / 100 * 100) / 100
              : equipment.shareValue
          details.push({ itemType: sel.itemType, itemId: sel.itemId, name: equipment.name, label: equipment.category || 'Equipamento externo', amount })
        }
      }
    }
    return details
  }, [selectedAddons, addons, baseBudget])

  const addonsTotal = addonDetails.reduce((sum, a) => sum + a.amount, 0)
  const newTotal = baseBudget + addonsTotal

  const durationLabel = (() => {
    if (!startTime || !endTime) return null
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const minutes = eh * 60 + em - (sh * 60 + sm)
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    return rest === 0 ? String(hours) + 'h' : String(hours) + 'h' + String(rest).padStart(2, '0')
  })()

  const toggleAddon = (itemType: AddonItemType, itemId: string) => {
    setSelectedAddons((current) =>
      current.some((a) => a.itemType === itemType && a.itemId === itemId)
        ? current.filter((a) => !(a.itemType === itemType && a.itemId === itemId))
        : [...current, { itemType, itemId }]
    )
  }

  const reset = () => {
    setStep(0)
    setGuestName('')
    setGuestCompanyName('')
    setGuestPhone('')
    setBudget('')
    setEventDate('')
    setStartTime(null)
    setEndTime(null)
    setLocation('')
    setEventType('Show')
    setEstimatedAudience('')
    setMessage('')
    setSelectedAddons([])
    setCreated(false)
  }

  const dateOutsideWorkingDays =
    workingWeekdays.length > 0 &&
    eventDate !== '' &&
    !workingWeekdays.includes(new Date(eventDate + 'T00:00:00').getDay())

  const handleContinue = () => {
    if (step === 0) {
      if (!guestName.trim()) {
        toast.warning('Informe o nome do responsável')
        return
      }
      if (!isValidWhatsapp(guestPhone)) {
        toast.warning('Informe um WhatsApp válido com DDD (ex.: (11) 98765-4321).')
        return
      }
      if (!(Number(budget.replace(',', '.')) > 0)) {
        toast.warning('Informe o valor da proposta')
        return
      }
    }
    if (step === 1) {
      if (!eventDate) {
        toast.warning('Selecione a data do evento na agenda')
        return
      }
      if (fullyBlockedDates.includes(eventDate)) {
        toast.warning('O artista está indisponível nessa data. Escolha outro dia na agenda.')
        return
      }
      if (dateOutsideWorkingDays) {
        toast.warning('O artista não atende nesse dia da semana. Escolha outro dia.')
        return
      }
    }
    if(step === 2) {
        if (!location.trim()) {
            toast.warning('Informe o local do evento')
            return
        }
    }
    setStep((s) => s + 1)
  }

  const handleSubmitRequest = () => {
    if (!eventDate) {
      toast.warning('Selecione a data do evento na agenda')
      return
    }
    if (fullyBlockedDates.includes(eventDate)) {
      toast.warning('O artista está indisponível nessa data. Escolha outro dia na agenda.')
      return
    }
    if (dateOutsideWorkingDays) {
      toast.warning('O artista não atende nesse dia da semana. Escolha outro dia.')
      return
    }
    if (!startTime || !endTime) {
      toast.warning('Selecione o horário de início e término do evento')
      return
    }
    if (!location.trim()) {
      toast.warning('Informe o local do evento')
      return
    }
    create.mutate()
  }


  const create = useMutation({
    mutationFn: async () =>
      (
        await publicBookingsApi.create({
          artistId,
          guestName: guestName.trim(),
          guestCompanyName: guestCompanyName || null,
          guestPhone: guestPhone.replace(/\D/g, ''),
          budget: baseBudget,
          eventDate,
          startTime: (startTime ?? '20:00') + ':00',
          endTime: (endTime ?? '23:00') + ':00',
          location,
          eventType,
          estimatedAudience: estimatedAudience ? Number(estimatedAudience) : null,
          message,
          addons: selectedAddons,
        })
      ).data,
    onSuccess: () => setCreated(true),
    onError: (e) => toast.error(extractApiError(e)),
  })


  const STEP_TITLES = ['Seus dados', 'Detalhes do evento', 'Adicionais', 'Confirmação']

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
        {created ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <DialogHeader>
              <DialogTitle>Solicitação enviada!</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {artistName} recebeu sua proposta de{' '}
              <strong className="text-foreground">{formatMoney(newTotal)}</strong> e vai entrar em contato pelo
              WhatsApp <strong className="text-foreground">{guestPhone}</strong>.
            </p>
            <div className="mt-2 flex gap-2">
              <Button variant="outline" onClick={reset}>
                Enviar outra solicitação
              </Button>
              <Button
                onClick={() => {
                  reset()
                  onClose()
                }}
              >
                Concluir
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Solicitar contratação — {artistName}</DialogTitle>
            </DialogHeader>

            {/* Indicador de passos */}
            <ol className="flex items-center gap-2">
              {STEP_TITLES.map((title, index) => {
                const done = index < step
                const active = index === step
                return (
                  <li key={title} className="flex items-center gap-2">
                    <span
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold',
                        active && 'border-primary bg-primary text-primary-foreground',
                        done && 'border-primary/40 bg-primary/10 text-primary',
                        !active && !done && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {done ? <Check className="h-3 w-3" /> : index + 1}
                    </span>
                    <span
                      className={cn(
                        'hidden text-xs sm:block',
                        active ? 'font-semibold text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {title}
                    </span>
                    {index < STEP_TITLES.length - 1 && <span className="h-px w-4 bg-border" />}
                  </li>
                )
              })}
            </ol>
            <p className="-mt-2 text-center text-xs text-muted-foreground">
              Passo {step + 1} de {STEP_TITLES.length} — {STEP_TITLES[step]}
            </p>

            {/* Passo 0 — Seus dados */}
            {step === 0 && (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Nome do responsável *</Label>
                    <Input
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Quem vai acompanhar o evento"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nome do estabelecimento</Label>
                    <Input
                      value={guestCompanyName}
                      onChange={(e) => setGuestCompanyName(e.target.value)}
                      placeholder="Ex.: Bar do Carlos"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label>WhatsApp do responsável *</Label>
                        <Input
                            value={guestPhone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')} // Aplica a máscara ao exibir
                            onChange={(e) => {
                                const rawValue = e.target.value.replace(/\D/g, ''); // Remove caracteres não numéricos
                                if (rawValue.length <= 11) {
                                    setGuestPhone(rawValue); // Armazena o valor sem máscara
                                }
                            }}
                            placeholder="(41) 99999-9999"
                            inputMode="tel"
                            maxLength={15} // Limita o número de caracteres exibidos
                        />
                    </div>


                    <div className="space-y-1.5">
                    <Label>Valor da proposta (R$) *</Label>
                    <Input
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder={startingPrice != null ? 'A partir de ' + formatMoney(startingPrice) : 'Ex.: 1500'}
                      inputMode="decimal"
                    />
                  </div>
                </div>
                <Button type="button" className="w-full" onClick={handleContinue}>
                  Continuar
                </Button>
              </div>
            )}

            {/* Passo 1 — Detalhes do evento */}
            {step === 1 && (
              <div className="space-y-3">
                <div className="grid items-start gap-4 sm:grid-cols-1">
                  <div className="space-y-1.5">
                    <Label>Data do evento *</Label>
                    <DatePickerCalendar
                      value={eventDate || undefined}
                      onChange={(d) => {
                        setEventDate(d)
                        setStartTime(null)
                        setEndTime(null)
                      }}
                      mode="weekly"
                      minDate={today}
                      disabledDates={fullyBlockedDates}
                      partialDates={partialDates}
                      workingWeekdays={workingWeekdays}
                    />
                    <p className="text-xs text-muted-foreground">
                      {dateOutsideWorkingDays
                        ? 'O artista não atende nesse dia da semana.'
                        : !eventDate
                          ? 'Escolha o dia na agenda. Dias riscados estão fechados; bolinha amarela = bloqueio parcial.'
                          : 'Selecionado: ' + formatDate(eventDate)}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {eventDate && softTimesByDate[eventDate]?.length && (
                      <div className="rounded-md border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-xs text-amber-500 mb-4">
                        Atenção: já existe um show pré-reservado nesse dia e horário. A confirmação final pelo
                        artista poderá sofrer alterações.
                      </div>
                    )}
                    {eventDate ? (
                      <TimeRangePicker
                        start={startTime}
                        end={endTime}
                        previousBlocked={softTimesByDate[eventDate] ?? []}
                        onChange={(s, e) => {
                          setStartTime(s)
                          setEndTime(e)
                        }}
                        blocked={blockedTimesByDate[eventDate] ?? []}
                        soft={softTimesByDate[eventDate] ?? []}
                        allowed={workingTimesByDate[eventDate]}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Escolha a data para liberar os horários disponíveis.
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Local *</Label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Endereço do evento"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo de evento</Label>
                    <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(eventTypeLabel).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <Label>Mensagem</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Conte os detalhes do evento..."
                  />
                </div>
                <Button type="button" className="w-full" onClick={handleContinue}>
                  Continuar
                </Button>
              </div>
            )}

            {/* Passo 2 — Adicionais */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold">Adicionais para o seu evento</p>
                  <p className="text-xs text-muted-foreground">
                    Profissionais e equipamentos extras oferecidos por {artistName}. O valor entra na proposta
                    (percentual sobre a proposta ou valor fixo).
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Equipe externa</p>
                  {addons && addons.teamMembers.length > 0 ? (
                    addons.teamMembers.map((member) => {
                      const selected = selectedAddons.some((a) => a.itemType === 'TeamMember' && a.itemId === member.id)
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => toggleAddon('TeamMember', member.id)}
                          className={cn(
                            'flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors',
                            selected ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                'flex h-5 w-5 items-center justify-center rounded border',
                                selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-background'
                              )}
                            >
                              {selected && <Check className="h-3.5 w-3.5" />}
                            </span>
                            <div>
                              <p className="text-sm font-medium">{member.name}</p>
                              <p className="text-xs text-muted-foreground">{member.role || 'Equipe externa'}</p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold">
                            {member.shareType === 'Percentage'
                              ? '+ ' + member.shareValue + '%'
                              : '+ ' + formatMoney(member.shareValue)}
                          </span>
                        </button>
                      )
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">Este artista não oferece adicionais de equipe.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Equipamentos externos
                  </p>
                  {addons && addons.equipment.length > 0 ? (
                    addons.equipment.map((equipment) => {
                      const selected = selectedAddons.some((a) => a.itemType === 'Equipment' && a.itemId === equipment.id)
                      return (
                        <button
                          key={equipment.id}
                          type="button"
                          onClick={() => toggleAddon('Equipment', equipment.id)}
                          className={cn(
                            'flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors',
                            selected ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                'flex h-5 w-5 items-center justify-center rounded border',
                                selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-background'
                              )}
                            >
                              {selected && <Check className="h-3.5 w-3.5" />}
                            </span>
                            <div>
                              <p className="text-sm font-medium">{equipment.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {equipment.category || 'Equipamento'}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold">
                            {equipment.shareType === 'Percentage'
                              ? '+ ' + equipment.shareValue + '%'
                              : '+ ' + formatMoney(equipment.shareValue)}
                          </span>
                        </button>
                      )
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">Este artista não oferece equipamentos externos.</p>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg bg-accent px-4 py-3">
                  <span className="text-sm font-medium">Total com adicionais</span>
                  <span className="text-lg font-bold">{formatMoney(newTotal)}</span>
                </div>

                <Button type="button" className="w-full" onClick={handleContinue}>
                  Continuar
                </Button>
              </div>
            )}

            {/* Passo 3 — Confirmação */}
            {step === 3 && (
              <div className="space-y-4">
                <Card>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Proposta base</span>
                      <span className="font-medium">{formatMoney(baseBudget)}</span>
                    </div>
                    {addonDetails.map((addon) => (
                      <div
                        key={addon.itemType + '-' + addon.itemId}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          {addon.name} <span className="text-xs">({addon.label})</span>
                        </span>
                        <span>{formatMoney(addon.amount)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t pt-3">
                      <span className="font-semibold">Valor total da proposta</span>
                      <span className="text-lg font-bold text-primary">{formatMoney(newTotal)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="grid gap-3 p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Data</span>
                      <span className="font-medium">{formatDate(eventDate)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Duração do show</span>
                      <span className="font-medium">
                        {startTime} – {endTime}
                        {durationLabel ? ' (' + durationLabel + ')' : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Local</span>
                      <span className="max-w-56 truncate text-right font-medium">{location}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Responsável</span>
                      <span className="font-medium">{guestName}</span>
                    </div>
                  </CardContent>
                </Card>

                <p className="text-xs text-muted-foreground">
                  Sem cadastro necessário: o artista recebe sua solicitação com esses dados e responde pelo WhatsApp
                  informado.
                </p>
                <Button type="button" className="w-full" onClick={handleSubmitRequest} disabled={create.isPending}>
                  {create.isPending ? 'Enviando...' : 'Enviar solicitação'}
                </Button>
              </div>
            )}

            {/* Navegação */}
            <div className="flex items-center justify-between border-t pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                Voltar
              </Button>
              {step < STEP_TITLES.length - 1 ? (
                <Button type="button" onClick={handleContinue}>
                  Continuar
                </Button>
              ) : (
                <Button type="button" onClick={handleSubmitRequest} disabled={create.isPending}>
                  {create.isPending ? 'Enviando...' : 'Enviar solicitação'}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
