import { useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { addDays } from 'date-fns'
import { CalendarDays, CalendarPlus, Check, CheckCircle2, ChevronRight, Heart, Images, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { addonsApi, artistsApi, availabilityApi, bookingsApi, favoritesApi, publicBookingsApi } from '@/services'
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
import type { AddonItemType, BookingAddonItem, EventType } from '@/types'

export function ArtistPublicPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const isContractor = isAuthenticated && user?.role === 'Contractor'
  const [requestOpen, setRequestOpen] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)

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
        : { start: a.startTime.slice(0, 5), end: a.endTime.slice(0, 5) }
      map[a.date] = [...(map[a.date] ?? []), win]
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

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6">
      {/* Trilha de navegação */}
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/artistas" className="hover:text-foreground hover:underline">
          Artistas
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate font-medium text-foreground">{artist.artisticName}</span>
      </nav>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Coluna principal */}
        <div className="min-w-0 space-y-6">
          {/* Cartão de perfil */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-5 sm:flex-row">
                <Avatar
                  src={artist.profilePhotoUrl}
                  alt={artist.artisticName}
                  className="h-32 w-32 shrink-0 border bg-background text-3xl shadow-sm sm:h-36 sm:w-36"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h1 className="text-3xl font-bold">{artist.artisticName}</h1>
                    {artist.startingPrice != null && (
                      <p className="text-right">
                        <span className="block text-xs text-muted-foreground">A partir de</span>
                        <span className="text-xl font-bold">{formatMoney(artist.startingPrice)}</span>
                        <span className="text-xs text-muted-foreground"> /apresentação</span>
                      </p>
                    )}
                  </div>
                  <p className="mt-1 font-semibold">
                    {artist.categoryName} · {tipo}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {artist.reviewCount > 0 && (
                      <span className="flex items-center gap-1.5">
                        <RatingStars value={artist.averageRating ?? 0} />
                        <span className="font-medium text-foreground">
                          {artist.averageRating != null ? artist.averageRating.toFixed(1) : '—'}
                        </span>
                        <span>({artist.reviewCount})</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> {artist.city}, {artist.state}
                    </span>
                  </div>

                  <div className="my-4 h-px bg-border" />

                  {artist.styles.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm text-muted-foreground">Habilidades principais</p>
                      <div className="flex flex-wrap gap-2">
                        {artist.styles.map((s) => (
                          <Badge key={s} variant="secondary" className="rounded-full px-3 py-1">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {artist.specialties.length > 0 && (
                    <div className={artist.styles.length > 0 ? 'mt-4' : ''}>
                      <p className="mb-2 text-sm text-muted-foreground">Especialidades</p>
                      <div className="flex flex-wrap gap-2">
                        {artist.specialties.map((s) => (
                          <Badge key={s} variant="outline" className="rounded-full px-3 py-1">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CTA visível no mobile — no desktop fica na coluna lateral */}
                  <Button size="lg" className="mt-5 w-full lg:hidden" onClick={() => setRequestOpen(true)}>
                    <CalendarPlus /> Solicitar contratação
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sobre */}
          <Card>
            <CardHeader>
              <CardTitle>Sobre o artista</CardTitle>
            </CardHeader>
            <CardContent>
              {artist.eventTypes.length > 0 && (
                <div className="mb-4">
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
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {artist.description || 'Este artista ainda não escreveu uma descrição.'}
              </p>
            </CardContent>
          </Card>

          {/* Fotos e vídeos */}
          {(artist.galleryUrls.length > 0 || artist.videoUrls.length > 0) && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Fotos e vídeos</CardTitle>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {artist.galleryUrls.length + artist.videoUrls.length}
                </span>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {artist.galleryUrls.map((url) => (
                    <figure key={url} className="group overflow-hidden rounded-lg border bg-muted">
                      <img
                        src={url}
                        alt={`Foto de ${artist.artisticName}`}
                        loading="lazy"
                        className="aspect-video w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    </figure>
                  ))}
                  {artist.videoUrls.map((url) => (
                    <video key={url} src={url} controls preload="metadata" className="aspect-video w-full rounded-lg border bg-black" />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cachês em tabela */}
          <Card>
            <CardHeader>
              <CardTitle>Cachês</CardTitle>
            </CardHeader>
            <CardContent>
              {artist.fees.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sob consulta — defina o valor na sua proposta.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-primary/5 text-left">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Duração</th>
                        <th className="px-4 py-2.5 font-semibold">Detalhes</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {artist.fees.map((fee) => (
                        <tr key={fee.id} className="border-t">
                          <td className="px-4 py-2.5 font-medium">{minutesToLabel(fee.durationMinutes)}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{fee.description || '—'}</td>
                          <td className="px-4 py-2.5 text-right font-semibold">{formatMoney(fee.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">Valores de referência — o preço final é definido pela proposta.</p>
            </CardContent>
          </Card>

          {/* Avaliações */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Avaliações</CardTitle>
              {artist.reviewCount > 0 && (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {artist.reviewCount}
                </span>
              )}
            </CardHeader>
            <CardContent>
              {artist.reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda sem avaliações — seja o primeiro a contratar e avaliar.</p>
              ) : (
                <div className="space-y-3">
                  {artist.reviews.map((review) => (
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
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna lateral — contratação */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardContent className="p-5">
              <div className="flex gap-2">
                {isContractor && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    onClick={() => addFavorite.mutate()}
                    disabled={isFavorite}
                    title="Favoritar"
                  >
                    <Heart className={isFavorite ? 'fill-destructive text-destructive' : ''} />
                  </Button>
                )}
                <Button size="lg" className="flex-1" onClick={() => setRequestOpen(true)}>
                  <CalendarPlus /> Solicitar contratação
                </Button>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Sem cadastro necessário — resposta direto com o artista.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <InfoRow label="Tipo" value={tipo} />
              <InfoRow label="Categoria" value={artist.categoryName} />
              <InfoRow label="Atende em" value={`${artist.city}, ${artist.state}`} />
              <InfoRow
                label="Avaliação"
                value={artist.averageRating != null ? `${artist.averageRating.toFixed(1)} / 5` : '—'}
              />
              <InfoRow label="Avaliações recebidas" value={String(artist.reviewCount)} />
              <InfoRow label="Datas disponíveis" value={String(availableDates.length)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4 text-muted-foreground" /> Datas disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {availableDates.length === 0 && (
                <p className="text-sm text-muted-foreground">Consulte a disponibilidade pela solicitação.</p>
              )}
              {availableDates.slice(0, 8).map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{new Date(a.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                  <span className="text-muted-foreground">
                    {a.isAllDay ? 'Dia inteiro' : `${a.startTime.slice(0, 5)} – ${a.endTime.slice(0, 5)}`}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>

      {isContractor ? (
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
        />
      ) : (
        <GuestBookingDialog
          artistId={artist.id}
          artistName={artist.artisticName}
          startingPrice={artist.startingPrice}
          open={requestOpen}
          onClose={() => setRequestOpen(false)}
          fullyBlockedDates={fullyBlockedDates}
          partialDates={partialDates}
          blockedTimesByDate={blockedTimesByDate}
          softTimesByDate={softTimesByDate}
          workingWeekdays={workingWeekdays}
          workingTimesByDate={workingTimesByDate}
        />
      )}
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
}) {
  const [eventDate, setEventDate] = useState('')
  const [startTime, setStartTime] = useState<string | null>(null)
  const [endTime, setEndTime] = useState<string | null>(null)

  const dateOutsideWorkingDays =
    workingWeekdays.length > 0 &&
    eventDate !== '' &&
    !workingWeekdays.includes(new Date(`${eventDate}T00:00:00`).getDay())
  const [location, setLocation] = useState('')
  const [eventType, setEventType] = useState<EventType>('Show')
  const [estimatedAudience, setEstimatedAudience] = useState('')
  const [budget, setBudget] = useState('')
  const [message, setMessage] = useState('')

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
      }),
    onSuccess: ({ data }) => {
      toast.success('Solicitação enviada! Aguarde o retorno do artista.')
      onClose()
      onCreated?.((data as { id: string }).id)
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar contratação — {artistName}</DialogTitle>
        </DialogHeader>
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
              onChange={(s, e) => {
                setStartTime(s)
                setEndTime(e)
              }}
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Local</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Endereço do evento" required />
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Público estimado</Label>
              <Input type="number" min={0} value={estimatedAudience} onChange={(e) => setEstimatedAudience(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Orçamento (R$)</Label>
              <Input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Mensagem</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Conte os detalhes do evento..." />
          </div>
          <Button type="submit" className="w-full" disabled={create.isPending}>
            {create.isPending ? 'Enviando...' : 'Enviar solicitação'}
          </Button>
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
      if (!startTime || !endTime) {
        toast.warning('Selecione o horário de início e término do evento')
        return
      }
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
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="(11) 98765-4321"
                      inputMode="tel"
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
                  <Label>Público estimado</Label>
                  <Input
                    type="number"
                    min={0}
                    value={estimatedAudience}
                    onChange={(e) => setEstimatedAudience(e.target.value)}
                  />
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
