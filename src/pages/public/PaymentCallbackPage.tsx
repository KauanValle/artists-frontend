import { Link } from 'react-router-dom'
import { CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Redirect do checkout do InfinityPay — landing informativa do pagamento de shows.
 * A confirmação OFICIAL acontece pelo webhook (/api/webhooks/infinitepay); aqui
 * apenas orientamos o contratante sobre o próximo passo.
 */
export function PaymentCallbackPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <CheckCircle2 className="h-14 w-14 text-violet-500" />
          <h1 className="text-2xl font-bold">Checkout finalizado</h1>
          <p className="text-sm text-muted-foreground">
            Recebemos o retorno do seu pagamento. A confirmação oficial acontece em instantes —
            assim que o InfinityPay nos avisar, o show muda para <strong>Confirmado</strong> e o
            artista é notificado.
          </p>
          <div className="flex w-full flex-col gap-2">
            <Button asChild size="lg" className="w-full">
              <Link to="/contractor/solicitacoes">
                <Clock /> Acompanhar minhas solicitações
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Voltar para a plataforma</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            O status pode levar alguns segundos para atualizar nesta página.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
