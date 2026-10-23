import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type CallbackOutcome = 'success' | 'cancel' | 'expired'

const CONTENT: Record<
  CallbackOutcome,
  { icon: React.ReactNode; iconColor: string; title: string; message: string; primary: { to: string; label: string } }
> = {
  success: {
    icon: <CheckCircle2 className="h-14 w-14" />,
    iconColor: 'text-emerald-500',
    title: 'Pagamento confirmado!',
    message:
      'Recebemos a confirmação do seu pagamento. Em instantes a sua conta é promovida para Assinante e todas as funções da plataforma são liberadas.',
    primary: { to: '/', label: 'Ir para a plataforma' },
  },
  cancel: {
    icon: <XCircle className="h-14 w-14" />,
    iconColor: 'text-destructive',
    title: 'Pagamento cancelado',
    message: 'A cobrança não foi concluída e nenhum valor foi debitado. Você pode tentar assinar novamente quando quiser.',
    primary: { to: '/artist/assinatura', label: 'Tentar novamente' },
  },
  expired: {
    icon: <Clock className="h-14 w-14" />,
    iconColor: 'text-amber-500',
    title: 'Sessão de pagamento expirada',
    message: 'O tempo limite da sessão de pagamento foi atingido. Gere uma nova cobrança para concluir a assinatura.',
    primary: { to: '/artist/assinatura', label: 'Gerar novo pagamento' },
  },
}

/**
 * Landing pages de callback do checkout (Asaas): successUrl, cancelUrl e expiredUrl.
 * As URLs são configuráveis no ambiente do backend (Asaas__SuccessUrl etc.).
 */
export function SubscriptionCallbackPage({ outcome }: { outcome: CallbackOutcome }) {
  const content = CONTENT[outcome]
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [checking, setChecking] = useState(false)

  const refreshAccess = async () => {
    setChecking(true)
    try {
      await refreshUser()
      navigate('/', { replace: true })
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col justify-center px-4 py-16">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className={content.iconColor}>{content.icon}</div>
          <h1 className="text-2xl font-bold">{content.title}</h1>
          <p className="text-sm text-muted-foreground">{content.message}</p>
          <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={refreshAccess} disabled={checking}>
              <RefreshCw className={checking ? 'animate-spin' : ''} />
              {checking ? 'Verificando...' : 'Atualizar meu acesso'}
            </Button>
            <Button variant="outline" asChild>
              <Link to={content.primary.to}>{content.primary.label}</Link>
            </Button>
          </div>
          {outcome === 'success' && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <AlertTriangle className="h-3 w-3" />
              Se o acesso não liberar em alguns minutos, use “Atualizar meu acesso” novamente.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
