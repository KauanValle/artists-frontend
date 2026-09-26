import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { MapPin, Search, Star } from 'lucide-react'
import { artistsApi } from '@/services'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RatingStars } from '@/components/ui/rating-stars'
import { EmptyState } from '@/components/badges'
import { formatMoney } from '@/lib/utils'

export function MarketplacePage() {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [city, setCity] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [minRating, setMinRating] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace', { search, categoryId, city, date, startTime, durationMinutes, minRating, maxPrice }],
    queryFn: async () =>
      (
        await artistsApi.search({
          search: search || undefined,
          categoryId: categoryId || undefined,
          city: city || undefined,
          date: date || undefined,
          startTime: startTime ? `${startTime}:00` : undefined,
          durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
          minRating: minRating ? Number(minRating) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
          pageSize: 24,
        })
      ).data,
    placeholderData: keepPreviousData,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await artistsApi.categories()).data,
  })

  const hasSlotFilter = !!date && !!startTime && !!durationMinutes

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Buscar artistas</h1>
        <p className="text-sm text-muted-foreground">
          Encontre profissionais por categoria, localização, data, horário, duração e preço
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Busca</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Nome do artista ou estilo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Cidade</Label>
            <Input placeholder="Ex.: São Paulo" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Horário</Label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Duração</Label>
            <Select value={durationMinutes} onValueChange={setDurationMinutes}>
              <SelectTrigger>
                <SelectValue placeholder="Qualquer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Qualquer</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="120">2 horas</SelectItem>
                <SelectItem value="180">3 horas</SelectItem>
                <SelectItem value="240">4 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Avaliação mínima</Label>
            <Select value={minRating} onValueChange={setMinRating}>
              <SelectTrigger>
                <SelectValue placeholder="Qualquer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Qualquer</SelectItem>
                <SelectItem value="3">3+ estrelas</SelectItem>
                <SelectItem value="4">4+ estrelas</SelectItem>
                <SelectItem value="4.5">4.5+ estrelas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Preço máximo (cachê inicial)</Label>
            <Input
              type="number"
              min={0}
              placeholder="Ex.: 2000"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Buscando artistas...</p>
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="Nenhum artista encontrado"
          description="Ajuste os filtros para ampliar a busca."
          icon={<Search className="h-10 w-10" />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data!.items.map((artist) => (
            <Link key={artist.id} to={`/artistas/${artist.slug}`} className="group">
              <Card className="h-full transition-shadow group-hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar src={artist.profilePhotoUrl} alt={artist.artisticName} className="h-12 w-12" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{artist.artisticName}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {artist.city}, {artist.state}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="outline">{artist.categoryName}</Badge>
                    {/* {artist.averageRating !== null && (
                      <span className="flex items-center gap-1 text-xs font-medium">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {artist.averageRating.toFixed(1)} ({artist.reviewCount})
                      </span>
                    )} */}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      A partir de{' '}
                      <span className="font-bold text-foreground">{formatMoney(artist.startingPrice)}</span>
                    </span>
                    {hasSlotFilter && (
                      <Badge variant={artist.isAvailableForRequestedSlot ? 'success' : 'destructive'}>
                        {artist.isAvailableForRequestedSlot ? 'Disponível' : 'Ocupado'}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {hasSlotFilter && (
        <p className="text-center text-xs text-muted-foreground">
          Disponibilidade validada para o intervalo exato solicitado (data + horário + duração).
        </p>
      )}
    </div>
  )
}
