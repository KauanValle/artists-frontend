import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Clock, CreditCard, Loader2, Lock, RefreshCw, ShieldCheck, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatMoney } from '@/lib/utils'
import { publicPaymentLinksApi } from '@/services'

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })

/** Página pública de cobrança da Reprissa (/pagar/:id): explica o que está sendo cobrado e leva ao checkout. */
export function PayLinkPage() {
  const { id } = useParams<{ id: string }>()

  const { data: link, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['public-payment-link', id],
    queryFn: async () => (await publicPaymentLinksApi.get(id!)).data,
    enabled: !!id,
    retry: false,
    // Enquanto pendente, confere de tempos em tempos (quem acabou de pagar vê a confirmação sem recarregar).
    refetchInterval: (q) => (q.state.data?.status === 'AwaitingPayment' ? 15000 : false),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando cobrança...
      </div>
    )
  }

  if (isError || !link) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <AlertCircle className="h-14 w-14 text-muted-foreground" />
            <h1 className="text-2xl font-bold">Cobrança não encontrada</h1>
            <p className="text-sm text-muted-foreground">
              O link pode estar incorreto. Confira com quem enviou a cobrança ou peça um novo link.
            </p>
            <Button asChild variant="outline"><Link to="/">Ir para a Reprissa</Link></Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const paid = link.status === 'Paid'
  const cancelled = link.status === 'Cancelled'

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:py-16">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-violet-600 to-violet-500 px-6 py-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-100">Cobrança Reprissa</p>
          <p className="mt-2 text-4xl font-extrabold tracking-tight">{formatMoney(link.amount)}</p>
        </div>

        <CardContent className="space-y-6 p-6">
          {/* Status */}
          {paid && (
            <div className="flex items-start gap-3 rounded-lg bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Pagamento confirmado</p>
                <p className="text-sm">
                  {link.paidAt ? `Recebemos o seu pagamento em ${fmtDateTime(link.paidAt)}. ` : ''}Obrigado!
                </p>
              </div>
            </div>
          )}
          {cancelled && (
            <div className="flex items-start gap-3 rounded-lg bg-muted p-4 text-muted-foreground">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Cobrança cancelada</p>
                <p className="text-sm">Este link não aceita mais pagamentos. Peça um novo link se precisar.</p>
              </div>
            </div>
          )}
          {!paid && !cancelled && (
            <div className="flex items-start gap-3 rounded-lg bg-amber-500/10 p-4 text-amber-700 dark:text-amber-400">
              <Clock className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Aguardando pagamento</p>
                <p className="text-sm">Finalize o pagamento abaixo. Esta página atualiza sozinha quando confirmarmos.</p>
              </div>
            </div>
          )}

          {/* Detalhes */}
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">O que está sendo cobrado</dt>
              <dd className="mt-1 text-base font-medium">{link.description}</dd>
            </div>
            {link.customerName && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cobrança para</dt>
                <dd className="mt-1">{link.customerName}</dd>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor</dt>
                <dd className="mt-1 font-semibold">{formatMoney(link.amount)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Emitida em</dt>
                <dd className="mt-1">{fmtDateTime(link.createdAt)}</dd>
              </div>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Referência</dt>
              <dd className="mt-1 font-mono text-xs text-muted-foreground">{link.id}</dd>
            </div>
          </dl>

          {/* Ação */}
          {link.checkoutUrl && (
            <div className="space-y-3">
              <Button size="lg" className="w-full" asChild>
                <a href={link.checkoutUrl}><CreditCard className="mr-2 h-5 w-5" />Pagar agora</a>
              </Button>
              <Button variant="ghost" size="sm" className="w-full" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                Já paguei — atualizar status
              </Button>
            </div>
          )}

          <div className="space-y-1.5 border-t pt-4 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Pagamento processado com segurança pelo InfinityPay (Pix e cartão).</p>
            <p className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Você será redirecionado para o ambiente do InfinityPay; a Reprissa não guarda dados do seu cartão.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
