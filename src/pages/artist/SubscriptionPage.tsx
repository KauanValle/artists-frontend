import { useMutation, useQuery } from '@tanstack/react-query'
import { BadgeCheck, Check, CreditCard, ExternalLink, Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { billingApi } from '@/services'
import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime, formatMoney } from '@/lib/utils'
import { extractApiError } from '@/services/api'

const PLAN_BENEFITS = [
  'Dashboard financeiro completo',
  'Agenda, shows e solicitações de contratação',
  'Equipe, equipamentos e divisão de cachê',
  'Perfil público, favoritos e conversas',
]

/**
 * Tela de assinatura do artista: card do plano "ACESSO TOTAL A PLATAFORMA" (R$ 49,90/mês).
 * Ao assinar, o backend cria a sessão de checkout no Asaas e o cliente é redirecionado
 * automaticamente para o link de pagamento retornado.
 */
export function SubscriptionPage() {
  const { user } = useAuth()
  const isSubscriber = user?.subscriptionTier === 'Assinante'

  const { data: billing } = useQuery({
    queryKey: ['my-billing'],
    queryFn: async () => (await billingApi.myBilling()).data,
  })

  const checkout = useMutation({
    mutationFn: async () => (await billingApi.createCheckout()).data,
    onSuccess: (data) => {
      // Redireciona automaticamente para o pagamento assim que o checkout é criado.
      window.location.href = data.link
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Assinatura</h1>
        <p className="text-sm text-muted-foreground">
          Sua conta é <strong>{isSubscriber ? 'Assinante' : 'Gratuita'}</strong>
          {isSubscriber
            ? ' — todas as funções da plataforma liberadas.'
            : ' — assine para liberar todas as funções da plataforma.'}
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary to-primary/50" />
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg">ACESSO TOTAL A PLATAFORMA</CardTitle>
            {isSubscriber ? (
              <Badge variant="success" className="gap-1">
                <BadgeCheck className="h-3.5 w-3.5" /> Assinatura ativa
              </Badge>
            ) : (
              <Badge variant="warning">Conta gratuita</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold">{formatMoney(49.9)}</span>
            <span className="pb-1 text-sm text-muted-foreground">/mês</span>
          </div>

          <ul className="space-y-2">
            {PLAN_BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                {benefit}
              </li>
            ))}
          </ul>

          {isSubscriber ? (
            <div className="space-y-3">
              <Button className="w-full" disabled>
                <BadgeCheck /> Assinatura ativa — acesso liberado
              </Button>
              {billing && (
                <p className="text-center text-xs text-muted-foreground">
                  Última cobrança: {formatDateTime(billing.createdAt)} • status {billing.status}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Button className="w-full" size="lg" onClick={() => checkout.mutate()} disabled={checkout.isPending}>
                {checkout.isPending ? (
                  <>
                    <Loader2 className="animate-spin" /> Redirecionando para o pagamento...
                  </>
                ) : (
                  <>
                    <CreditCard /> Assinar agora
                  </>
                )}
              </Button>
              <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <ExternalLink className="h-3 w-3" />
                Pagamento processado pelo Asaas — cartão de crédito, renovação mensal.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {!isSubscriber && (
        <Card className="border-dashed">
          <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            Enquanto a assinatura não for confirmada, apenas o dashboard e esta tela ficam disponíveis. Assim que o
            pagamento for confirmado, todas as funções são liberadas automaticamente.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
