import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { MapPin, MicVocal, Search } from 'lucide-react'
import { artistsApi } from '@/services'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RatingStars } from '@/components/ui/rating-stars'
import { EmptyState } from '@/components/badges'
import { formatMoney } from '@/lib/utils'

/**
 * Listagem pública de artistas (rota aberta, sem cadastro).
 * O visitante navega pelos perfis e solicita a contratação direto na página do artista.
 */
export function ArtistsDirectoryPage() {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [city, setCity] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['public-artists', { search, categoryId, city }],
    queryFn: async () =>
      (
        await artistsApi.search({
          search: search || undefined,
          categoryId: categoryId || undefined,
          city: city || undefined,
          pageSize: 24,
        })
      ).data,
    placeholderData: keepPreviousData,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await artistsApi.categories()).data,
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">Encontre o artista ideal para o seu evento</h1>
        <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
          Cantores, bandas, DJs e muito mais. Sem cadastro: escolha o artista, veja todos os detalhes e envie sua
          proposta — o responsável entra em contato pelo WhatsApp.
        </p>
      </section>

      <Card className="mt-8">
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
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Buscando artistas...</p>
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="Nenhum artista encontrado"
          description="Ajuste os filtros para ampliar a busca."
          icon={<MicVocal className="h-10 w-10" />}
        />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data!.items.map((artist) => (
            <Link key={artist.id} to={`/artistas/${artist.slug}`} className="group">
              <Card className="h-full transition-shadow group-hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar src={artist.profilePhotoUrl} alt={artist.artisticName} className="h-14 w-14 text-lg" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{artist.artisticName}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {artist.city}, {artist.state}
                      </p>
                      {artist.averageRating !== null && (
                        <div className="mt-1 flex items-center gap-1.5">
                          <RatingStars value={artist.averageRating} />
                          <span className="text-xs text-muted-foreground">({artist.reviewCount})</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="outline">{artist.categoryName}</Badge>
                    <span className="text-sm text-muted-foreground">
                      A partir de{' '}
                      <span className="font-bold text-foreground">{formatMoney(artist.startingPrice)}</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Quer gerenciar suas contratações, favoritos e conversas?{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Crie sua conta de contratante
        </Link>
        .
      </p>
    </div>
  )
}
