import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'

export function AdminDashboardPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Painel do administrador</h1>
        <p className="text-sm text-muted-foreground">Acesso administrativo da Artist Platform</p>
      </div>

      <Card>
        <CardContent className="flex items-center gap-4">
          <Avatar alt={user?.displayName} className="h-12 w-12" />
          <div className="min-w-0">
            <p className="font-medium">{user?.displayName}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        As funções administrativas (moderação, gestão de usuários e financeiro global) ainda não fazem
        parte do MVP. Para operar a plataforma, use as contas de artista e de contratante — o fluxo
        completo vai do cadastro à confirmação do evento no marketplace.
      </p>
    </div>
  )
}
