import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Heart, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { favoritesApi } from '@/services'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/badges'
import { extractApiError } from '@/services/api'

export function FavoritesPage() {
  const queryClient = useQueryClient()

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => (await favoritesApi.list()).data,
  })

  const remove = useMutation({
    mutationFn: (artistId: string) => favoritesApi.remove(artistId),
    onSuccess: () => {
      toast.success('Removido dos favoritos.')
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Favoritos</h1>
        <p className="text-sm text-muted-foreground">Artistas salvos para contratações futuras</p>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : favorites.length === 0 ? (
        <EmptyState
          title="Nenhum favorito ainda"
          description="Toque no coração no perfil de um artista para salvar aqui."
          icon={<Heart />}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {favorites.map((favorite) => (
            <Card key={favorite.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <Avatar src={favorite.artistPhotoUrl} alt={favorite.artistName} className="h-12 w-12" />
                <div className="min-w-0 flex-1">
                  <Link to={`/artistas/${favorite.slug}`} className="truncate font-semibold hover:underline">
                    {favorite.artistName}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {favorite.categoryName} • {favorite.city}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(favorite.artistId)}>
                  <Trash2 className="text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
