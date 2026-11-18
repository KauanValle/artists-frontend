import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, Clock, Loader2, Mail, PackageSearch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ticketOrdersApi, api } from '@/services'
import { generateTicketPdfBase64, getTicketPdfFileName } from '@/lib/ticket-pdf'

/**
 * Redirect do checkout do InfinityPay — landing informativa do pagamento de shows.
 * A confirmação OFICIAL acontece pelo webhook (/api/webhooks/infinitepay); aqui
 * apenas orientamos o contratante sobre o próximo passo.
 */
export function PaymentCallbackPage() {
  const [params] = useSearchParams()
  const orderNsu = params.get('order_nsu')
  const emailSentRef = useRef(false)
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  // Pedido de ingresso: o redirect traz order_nsu/transaction_nsu/slug e conferimos o pagamento no InfinityPay.
  const verify = useMutation({
    mutationFn: async () =>
      (
        await ticketOrdersApi.verify({
          orderNsu: orderNsu!,
          transactionNsu: params.get('transaction_nsu'),
          slug: params.get('slug'),
        })
      ).data,
  })

  useEffect(() => {
    if (orderNsu) verify.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNsu])

  // Envia o ingresso por email automaticamente quando o pagamento é confirmado
  useEffect(() => {
    const data = verify.data
    if (!data?.paid || !data.orderSummary || emailSentRef.current) return
    emailSentRef.current = true

    const sendEmail = async () => {
      try {
        setEmailStatus('sending')
        const order = data.orderSummary!
        const pdfBase64 = await generateTicketPdfBase64(order)
        const fileName = getTicketPdfFileName(order)
        await api.post('/public/ticket-orders/send-ticket-email', {
          email: order.buyerEmail,
          buyerName: order.buyerName,
          eventName: order.eventName,
          eventDate: order.eventStartDate,
          pdfBase64,
          fileName,
        })
        setEmailStatus('sent')
      } catch {
        setEmailStatus('error')
      }
    }
    sendEmail()
  }, [verify.data])

  if (orderNsu && (verify.isIdle || verify.isPending)) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Confirmando o seu pagamento...
      </div>
    )
  }

  if (verify.data?.found) {
    const paid = verify.data.paid
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            {paid ? <CheckCircle2 className="h-14 w-14 text-emerald-500" /> : <Clock className="h-14 w-14 text-amber-500" />}
            <h1 className="text-2xl font-bold">{paid ? 'Pagamento confirmado!' : 'Aguardando confirmação'}</h1>
            <p className="text-sm text-muted-foreground">
              {paid
                ? 'Seu pedido de ingresso foi confirmado.'
                : 'Ainda não recebemos a confirmação do pagamento. Pode levar alguns instantes; acompanhe o status do pedido.'}
            </p>

            {/* Status do envio do email */}
            {paid && emailStatus === 'sending' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Enviando ingresso para seu email...
              </div>
            )}
            {paid && emailStatus === 'sent' && (
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <Mail className="h-4 w-4" /> Ingresso enviado para seu email!
              </div>
            )}
            {paid && emailStatus === 'error' && (
              <p className="text-xs text-muted-foreground">
                Não foi possível enviar o ingresso por email agora. Você pode reenviá-lo na página de pedidos.
              </p>
            )}

            <Button asChild size="lg" className="w-full">
              <Link to="/acompanhar-pedidos">
                <PackageSearch /> Acompanhar pedidos
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

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
