import { useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, CalendarPlus, CheckCircle2, ChevronRight, Heart, Images, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { artistsApi, availabilityApi, bookingsApi, favoritesApi, publicBookingsApi } from '@/services'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RatingStars } from '@/components/ui/rating-stars'
import { EmptyState, eventTypeLabel } from '@/components/badges'
import { formatDate, formatMoney, minutesToLabel } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import type { EventType } from '@/types'

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
              <InfoRow label="Datas disponíveis" value={String(availabilities.length)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4 text-muted-foreground" /> Datas disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {availabilities.length === 0 && (
                <p className="text-sm text-muted-foreground">Consulte a disponibilidade pela solicitação.</p>
              )}
              {availabilities.slice(0, 8).map((a) => (
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
        />
      ) : (
        <GuestBookingDialog
          artistId={artist.id}
          artistName={artist.artisticName}
          startingPrice={artist.startingPrice}
          open={requestOpen}
          onClose={() => setRequestOpen(false)}
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

export function BookingRequestDialog({
  artistId,
  artistName,
  open,
  onClose,
  onCreated,
}: {
  artistId: string
  artistName: string
  open: boolean
  onClose: () => void
  onCreated?: (bookingId: string) => void
}) {
  const [eventDate, setEventDate] = useState('')
  const [startTime, setStartTime] = useState('20:00')
  const [endTime, setEndTime] = useState('23:00')
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
            create.mutate()
          }}
        >
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Início</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Fim</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </div>
          </div>
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
}: {
  artistId: string
  artistName: string
  startingPrice: number | null
  open: boolean
  onClose: () => void
}) {
  const [guestName, setGuestName] = useState('')
  const [guestCompanyName, setGuestCompanyName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [budget, setBudget] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [startTime, setStartTime] = useState('20:00')
  const [endTime, setEndTime] = useState('23:00')
  const [location, setLocation] = useState('')
  const [eventType, setEventType] = useState<EventType>('Show')
  const [estimatedAudience, setEstimatedAudience] = useState('')
  const [message, setMessage] = useState('')
  const [created, setCreated] = useState(false)

  const reset = () => {
    setGuestName('')
    setGuestCompanyName('')
    setGuestPhone('')
    setBudget('')
    setEventDate('')
    setStartTime('20:00')
    setEndTime('23:00')
    setLocation('')
    setEventType('Show')
    setEstimatedAudience('')
    setMessage('')
    setCreated(false)
  }

  const create = useMutation({
    mutationFn: () =>
      publicBookingsApi.create({
        artistId,
        guestName,
        guestCompanyName: guestCompanyName || null,
        guestPhone: guestPhone.replace(/\D/g, ''),
        budget: Number(budget.replace(',', '.')),
        eventDate,
        startTime: `${startTime}:00`,
        endTime: `${endTime}:00`,
        location,
        eventType,
        estimatedAudience: estimatedAudience ? Number(estimatedAudience) : null,
        message,
      }),
    onSuccess: () => setCreated(true),
    onError: (e) => toast.error(extractApiError(e)),
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {created ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <DialogHeader>
              <DialogTitle>Solicitação enviada!</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {artistName} recebeu sua proposta de <strong className="text-foreground">{formatMoney(Number(budget.replace(',', '.')))}</strong> e
              vai entrar em contato pelo WhatsApp <strong className="text-foreground">{guestPhone}</strong>.
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
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                if (!isValidWhatsapp(guestPhone)) {
                  toast.error('Informe um WhatsApp válido com DDD (ex.: (11) 98765-4321).')
                  return
                }
                create.mutate()
              }}
            >
              <div>
                <p className="mb-2 text-sm font-semibold">Seus dados</p>
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Nome do responsável *</Label>
                      <Input
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Quem vai acompanhar o evento"
                        required
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
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Valor da proposta (R$) *</Label>
                      <Input
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        placeholder={startingPrice != null ? `A partir de ${formatMoney(startingPrice)}` : 'Ex.: 1500'}
                        inputMode="decimal"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Detalhes do evento</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label>Data *</Label>
                      <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Início</Label>
                      <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Fim</Label>
                      <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Local *</Label>
                      <Input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Endereço do evento"
                        required
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
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Sem cadastro necessário: o artista recebe sua solicitação com esses dados e responde pelo WhatsApp
                informado.
              </p>
              <Button type="submit" className="w-full" disabled={create.isPending}>
                {create.isPending ? 'Enviando...' : 'Enviar solicitação'}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
