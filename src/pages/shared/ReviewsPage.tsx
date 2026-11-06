import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Camera, ChevronLeft, ChevronRight, ImagePlus, MapPin, Star, X } from 'lucide-react'
import { toast } from 'sonner'
import { reviewsApi, uploadsApi } from '@/services'
import { extractApiError } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/badges'
import { RatingStars, StarRatingInput } from '@/components/ui/rating-stars'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import type { PendingReview, Review } from '@/types'

const MAX_FOTOS = 6
const POR_PAGINA = 5

function paginasWindow(page: number, totalPaginas: number): (number | '…')[] {
  if (totalPaginas <= 7) return Array.from({ length: totalPaginas }, (_, i) => i + 1)
  const janela = Math.min(Math.max(page - 2, 2), totalPaginas - 3)
  return [1, '…', janela, janela + 1, janela + 2, '…', totalPaginas]
}

/// <summary>Rodapé de listagem: total + paginação numerada (mesmo padrão da ShowsPage).</summary>
function PaginacaoRodape({
  total,
  substantivoSingular,
  substantivoPlural,
  page,
  setPage,
  disabled,
}: {
  total: number
  substantivoSingular: string
  substantivoPlural: string
  page: number
  setPage: React.Dispatch<React.SetStateAction<number>>
  disabled?: boolean
}) {
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const paginas = useMemo(() => paginasWindow(page, totalPaginas), [page, totalPaginas])
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-1 pt-4">
      <p className="text-sm text-muted-foreground">
        Total de {total} {total === 1 ? substantivoSingular : substantivoPlural}
      </p>
      {totalPaginas > 1 && (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || disabled}
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
                disabled={disabled}
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
            disabled={page >= totalPaginas || disabled}
            title="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar alt={review.contractorName} className="h-10 w-10" />
            <div>
              <p className="text-sm font-semibold">{review.contractorName}</p>
              <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
            </div>
          </div>
          <RatingStars value={review.overallRating} />
        </div>
        {review.comment && (
          <p className="mt-3 text-sm leading-relaxed text-foreground/90">{review.comment}</p>
        )}
        {review.photos.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {review.photos.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-md border">
                <img src={url} alt={`Foto ${i + 1} da avaliação`} className="aspect-square w-full object-cover transition-transform group-hover:scale-105" />
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AvaliarDialog({ pending, onClose }: { pending: PendingReview; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [nota, setNota] = useState(0)
  const [comentario, setComentario] = useState('')
  const [fotos, setFotos] = useState<string[]>([])
  const [subindo, setSubindo] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const criar = useMutation({
    mutationFn: async () =>
      (await reviewsApi.create({
        eventId: pending.eventId,
        overallRating: nota,
        comment: comentario,
        photos: fotos,
      })).data,
    onSuccess: () => {
      toast.success('Avaliação enviada! O artista foi notificado.')
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      onClose()
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const subirFotos = async (files: FileList) => {
    const vagas = MAX_FOTOS - fotos.length
    if (vagas <= 0) {
      toast.error(`Máximo de ${MAX_FOTOS} fotos.`)
      return
    }
    const selecionados = Array.from(files).slice(0, vagas)
    if (selecionados.length < files.length) toast.warning(`Máximo de ${MAX_FOTOS} fotos — ${files.length - vagas} ignorada(s).`)
    setSubindo(true)
    try {
      for (const file of selecionados) {
        const url = (await uploadsApi.upload(file)).data.url
        setFotos((prev) => (prev.length >= MAX_FOTOS ? prev : [...prev, url]))
      }
    } catch (e) {
      toast.error(extractApiError(e))
    } finally {
      setSubindo(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Avaliar show</DialogTitle>
          <DialogDescription>
            {pending.artistName} • {formatDate(pending.eventDate)} • {pending.location}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-sm font-medium">Sua nota *</p>
            <StarRatingInput value={nota} onChange={setNota} size="lg" />
          </div>

          <div>
            <label htmlFor="avaliacao-comentario" className="mb-1.5 block text-sm font-medium">
              Descrição
            </label>
            <Textarea
              id="avaliacao-comentario"
              placeholder="Conte como foi o show, a pontualidade, a apresentação…"
              rows={4}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              maxLength={1500}
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium">Fotos</p>
            <div className="flex flex-wrap items-center gap-2">
              {fotos.map((url, i) => (
                <div key={url} className="relative h-16 w-16 overflow-hidden rounded-md border">
                  <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFotos((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                    title="Remover foto"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {fotos.length < MAX_FOTOS && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={subindo}
                  className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground hover:bg-accent disabled:opacity-50"
                  title="Adicionar fotos"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[10px]">{subindo ? 'Enviando…' : 'Adicionar'}</span>
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && e.target.files.length > 0 && subirFotos(e.target.files)}
            />
            <p className="mt-1 text-xs text-muted-foreground">Até {MAX_FOTOS} fotos (JPG/PNG).</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={criar.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => criar.mutate()} disabled={criar.isPending || nota === 0}>
            Enviar avaliação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PendentesContratante() {
  const [page, setPage] = useState(1)
  const [avaliando, setAvaliando] = useState<PendingReview | null>(null)
  const { data: pendentes = [], isLoading } = useQuery({
    queryKey: ['reviews', 'pending'],
    queryFn: async () => (await reviewsApi.pending()).data,
  })

  // Lista encolheu (ex.: avaliação enviada) → mantém a página dentro do limite.
  const totalPaginas = Math.max(1, Math.ceil(pendentes.length / POR_PAGINA))
  useEffect(() => {
    if (page > totalPaginas) setPage(totalPaginas)
  }, [page, totalPaginas])

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (pendentes.length === 0) {
    return (
      <EmptyState
        title="Nenhuma avaliação pendente"
        description="Quando um show for concluído por você e pelo artista, ele aparece aqui para você avaliar."
        icon={<Star className="h-8 w-8" />}
      />
    )
  }

  const daPagina = pendentes.slice((page - 1) * POR_PAGINA, page * POR_PAGINA)

  return (
    <>
      <div className="space-y-3">
        {daPagina.map((p) => (
          <Card key={p.eventId}>
            <CardContent className="flex flex-wrap items-center gap-4 p-5">
              <Avatar alt={p.artistName} className="h-12 w-12" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.artistName}</p>
                <p className="truncate text-sm text-muted-foreground">{p.eventTitle}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" /> {formatDateTime(p.eventDate)}
                  </span>
                  {p.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {p.location}
                    </span>
                  )}
                </div>
              </div>
              <Button onClick={() => setAvaliando(p)}>Avaliar</Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <PaginacaoRodape
        total={pendentes.length}
        substantivoSingular="show aguardando avaliação"
        substantivoPlural="shows aguardando avaliação"
        page={page}
        setPage={setPage}
      />
      {avaliando && <AvaliarDialog pending={avaliando} onClose={() => setAvaliando(null)} />}
    </>
  )
}

function RecebidasArtista() {
  const [page, setPage] = useState(1)
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['reviews', 'received'],
    queryFn: async () => (await reviewsApi.received()).data,
  })

  const totalPaginas = Math.max(1, Math.ceil(reviews.length / POR_PAGINA))
  useEffect(() => {
    if (page > totalPaginas) setPage(totalPaginas)
  }, [page, totalPaginas])

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <EmptyState
        title="Nenhuma avaliação recebida"
        description="Quando um contratante avaliar um show seu, a avaliação aparece aqui."
        icon={<Star className="h-8 w-8" />}
      />
    )
  }

  const media = reviews.reduce((acc, r) => acc + r.overallRating, 0) / reviews.length
  const daPagina = reviews.slice((page - 1) * POR_PAGINA, page * POR_PAGINA)
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border bg-background p-4">
        <Camera className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Média de <strong className="text-foreground">{media.toFixed(1)}</strong> estrelas em {reviews.length}{' '}
          {reviews.length === 1 ? 'avaliação' : 'avaliações'}
        </span>
        <RatingStars value={media} className="ml-auto" />
      </div>
      {daPagina.map((r) => (
        <ReviewCard key={r.id} review={r} />
      ))}
      <PaginacaoRodape
        total={reviews.length}
        substantivoSingular="avaliação"
        substantivoPlural="avaliações"
        page={page}
        setPage={setPage}
      />
    </div>
  )
}

export function ReviewsPage() {
  const { user } = useAuth()
  const ehArtista = user?.role === 'Artist'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Avaliações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {ehArtista
            ? 'Veja as avaliações que os contratantes deixaram sobre os seus shows.'
            : 'Avalie os shows concluídos — sua nota ajuda outros contratantes e o artista a melhorar.'}
        </p>
      </div>
      {ehArtista ? <RecebidasArtista /> : <PendentesContratante />}
    </div>
  )
}
