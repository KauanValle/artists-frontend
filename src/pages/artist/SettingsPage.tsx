import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function SettingsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

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
