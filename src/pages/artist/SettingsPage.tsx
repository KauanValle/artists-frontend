import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Instagram } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { artistsApi, socialLinksApi } from '@/services'
import { extractApiError } from '@/services/api'

export function SettingsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: artist } = useQuery({
    queryKey: ['my-artist'],
    queryFn: async () => (await artistsApi.getMy()).data,
  })

  // Redes sociais — por enquanto apenas o Instagram (@ do perfil).
  const { data: instagram } = useQuery({
    queryKey: ['social-links', artist?.id],
    queryFn: async () => {
      const links = (await socialLinksApi.list(artist!.id)).data
      return links.find((l) => l.platform === 'Instagram') ?? null
    },
    enabled: !!artist?.id,
  })

  const [instagramHandle, setInstagramHandle] = useState('')
  useEffect(() => {
    setInstagramHandle(instagram?.handle ?? '')
  }, [instagram])

  const saveInstagram = useMutation({
    mutationFn: async () => (await socialLinksApi.save({ platform: 'Instagram', handle: instagramHandle })).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['social-links'] })
      toast.success(data ? 'Instagram salvo! Ele já aparece na sua página pública.' : 'Instagram removido da página pública.')
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Conta e sessão</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="font-medium">Usuário:</span> {user?.displayName}
          </p>
          <p>
            <span className="font-medium">E-mail:</span> {user?.email}
          </p>
          <p>
            <span className="font-medium">Perfil:</span> Artista
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="h-4 w-4" /> Redes Sociais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="instagram">Instagram</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  @
                </span>
                <Input
                  id="instagram"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                  placeholder="seuusuario"
                  className="pl-7"
                  autoComplete="off"
                />
              </div>
              <Button onClick={() => saveInstagram.mutate()} disabled={saveInstagram.isPending}>
                {saveInstagram.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Seu @ aparece na sua página pública com link direto para o Instagram. Deixe vazio e salve para remover.
            </p>
          </div>
          {instagram && (
            <a
              href={instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Instagram className="h-4 w-4" /> @{instagram.handle}
            </a>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Senha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Para redefinir sua senha, use o fluxo de recuperação por e-mail.
          </p>
          <Button variant="outline" asChild onClick={() => logout()}>
            <a href="/forgot-password">Redefinir senha</a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sessão</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            Encerrar sessão
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
