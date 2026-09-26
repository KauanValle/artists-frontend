import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { CalendarPlus, Heart, MapPin, Star } from 'lucide-react'
import { toast } from 'sonner'
import { artistsApi, availabilityApi, bookingsApi, favoritesApi } from '@/services'
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
import { formatMoney, minutesToLabel } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import type { EventType } from '@/types'

export function ArtistPublicPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
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
    return <div className="mx-auto max-w-5xl px-4 py-16">Carregando...</div>
  }

  if (!artist) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <EmptyState title="Artista não encontrado" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Cabeçalho */}
      <Card className="overflow-hidden">
        <div className="h-40 bg-gradient-to-r from-primary/80 to-primary/40" />
        <CardContent className="relative pb-6">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end">
            <Avatar
              src={artist.profilePhotoUrl}
              alt={artist.artisticName}
              className="h-24 w-24 border-4 border-background text-2xl"
            />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{artist.artisticName}</h1>
                <Badge variant="secondary">{artist.artistType === 'Band' ? 'Banda/Grupo' : 'Solo'}</Badge>
                <Badge variant="outline">{artist.categoryName}</Badge>
              </div>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" /> {artist.city}, {artist.state}
              </p>
              {artist.reviewCount > 0 && (
                <div className="mt-1 flex items-center gap-2">
                  <RatingStars value={artist.averageRating ?? 0} />
                  <span className="text-sm font-medium">{artist.averageRating?.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({artist.reviewCount} avaliações)</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => addFavorite.mutate()} disabled={isFavorite}>
                <Heart className={isFavorite ? 'fill-destructive text-destructive' : ''} />
              </Button>
              <Button onClick={() => setRequestOpen(true)}>
                <CalendarPlus /> Solicitar contratação
              </Button>
            </div>
          </div>
          {artist.startingPrice !== null && (
            <p className="mt-4 text-sm text-muted-foreground">
              A partir de <span className="text-lg font-bold text-foreground">{formatMoney(artist.startingPrice)}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Sobre</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm text-muted-foreground">{artist.description || 'Sem descrição.'}</p>
              {(artist.styles.length > 0 || artist.specialties.length > 0) && (
                <div className="mt-4 space-y-2">
                  {artist.styles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {artist.styles.map((s) => (
                        <Badge key={s} variant="secondary">{s}</Badge>
                      ))}
                    </div>
                  )}
                  {artist.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {artist.specialties.map((s) => (
                        <Badge key={s} variant="outline">{s}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {(artist.galleryUrls.length > 0 || artist.videoUrls.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Fotos e vídeos</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {artist.galleryUrls.map((url) => (
                  <img key={url} src={url} alt="" className="aspect-video w-full rounded-md object-cover" />
                ))}
                {artist.videoUrls.map((url) => (
                  <video key={url} src={url} controls className="aspect-video w-full rounded-md" />
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Avaliações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {artist.reviews.length === 0 && (
                <p className="text-sm text-muted-foreground">Ainda sem avaliações.</p>
              )}
              {artist.reviews.map((review) => (
                <div key={review.id} className="border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{review.contractorName}</span>
                    <RatingStars value={review.overallRating} />
                  </div>
                  {review.comment && <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cachês (referência)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {artist.fees.length === 0 && <p className="text-sm text-muted-foreground">Sob consulta.</p>}
              {artist.fees.map((fee) => (
                <div key={fee.id} className="flex items-center justify-between text-sm">
                  <span>{minutesToLabel(fee.durationMinutes)}</span>
                  <span className="font-semibold">{formatMoney(fee.price)}</span>
                </div>
              ))}
              <p className="pt-2 text-xs text-muted-foreground">
                Valores de referência — o preço final é definido pela proposta.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-4 w-4" /> Disponibilidade recente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {availabilities.length === 0 && (
                <p className="text-sm text-muted-foreground">Consulte a disponibilidade pela solicitação.</p>
              )}
              {availabilities.slice(0, 10).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span>{new Date(a.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                  <span className="text-muted-foreground">
                    {a.isAllDay ? 'Dia inteiro' : `${a.startTime.slice(0, 5)} – ${a.endTime.slice(0, 5)}`}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <BookingRequestDialog
        artistId={artist.id}
        artistName={artist.artisticName}
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        onCreated={(id) => navigate(`/contractor/solicitacoes/${id}`)}
      />
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
