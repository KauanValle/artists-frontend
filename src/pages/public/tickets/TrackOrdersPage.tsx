import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CalendarDays, CheckCircle2, Clock, CreditCard, Loader2, Mail, MapPin, PackageSearch, Search, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate, formatDateTime, formatMoney, formatTime } from '@/lib/utils'
import { ticketOrdersApi, type TicketOrderSummary } from '@/services'
import { extractApiError } from '@/services/api'
import { generateTicketPdfBase64, getTicketPdfFileName } from '@/lib/ticket-pdf'
import { api } from '@/services/api'
import { isValidCpf, maskCpf, maskPhone, onlyDigits } from './BuyTicketModal'

type StatusInfo = { label: string; className: string; icon: typeof Clock }

function statusInfo(o: TicketOrderSummary): StatusInfo {
  if (o.status === 'Paid') return { label: 'Pedido confirmado', className: 'bg-emerald-500/10 text-emerald-500', icon: CheckCircle2 }
  if (o.status === 'Cancelled') return { label: 'Pedido cancelado', className: 'bg-muted text-muted-foreground', icon: XCircle }
  if (o.expired) return { label: 'Reserva expirada', className: 'bg-muted text-muted-foreground', icon: XCircle }
  return { label: 'Aguardando pagamento', className: 'bg-amber-500/10 text-amber-500', icon: Clock }
}

function OrderCard({ order }: { order: TicketOrderSummary }) {
  const st = statusInfo(order)
  const [sending, setSending] = useState(false)
  const sendByEmail = async () => {
    setSending(true)
    try {
      const pdfBase64 = await generateTicketPdfBase64(order)
      await api.post('/public/ticket-orders/send-ticket-email', {
        email: order.buyerEmail,
        buyerName: order.buyerName,
        eventName: order.eventName,
        eventDate: formatDate(order.eventStartDate),
        pdfBase64,
        fileName: getTicketPdfFileName(order),
      })
      toast.success(`Ingresso enviado para ${order.buyerEmail}!`)
    } catch {
      toast.error('Não foi possível enviar o ingresso por email.')
    } finally {
      setSending(false)
    }
  }
  const Icon = st.icon
  return (
    <li className="overflow-hidden rounded-2xl border border-border/50 bg-card/50">
      <div className="flex flex-col sm:flex-row">
        {order.eventImageUrl && (
          <img src={order.eventImageUrl} alt={order.eventName} className="h-40 w-full object-cover sm:h-auto sm:w-40" />
        )}
        <div className="flex-1 space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="min-w-0 text-lg font-bold leading-snug">{order.eventName}</h3>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${st.className}`}>
              <Icon className="h-3.5 w-3.5" /> {st.label}
            </span>
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 shrink-0" /> {formatDate(order.eventStartDate)} às {formatTime(order.eventStartTime)}
            </p>
            <p className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" /> {order.venue} · {order.city}/{order.state}
            </p>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border/50 pt-3">
            <div className="text-sm">
              <p className="font-medium">
                {order.quantity}x {order.ticketTitle}
              </p>
              <p className="text-xs text-muted-foreground">
                {order.status === 'Paid' && order.paidAt
                  ? `Pago em ${formatDateTime(order.paidAt)}`
                  : `Pedido feito em ${formatDateTime(order.createdAt)}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-extrabold">{order.totalAmount === 0 ? 'Gratuito' : formatMoney(order.totalAmount)}</span>
              {order.status === 'Paid' && (
                <Button size="sm" className="gap-1.5" onClick={() => void sendByEmail()} disabled={sending}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Enviar por email
                </Button>
              )}
              {order.checkoutUrl && (
                <Button size="sm" className="gap-1.5" onClick={() => window.location.assign(order.checkoutUrl!)}>
                  <CreditCard className="h-4 w-4" /> Pagar agora
                </Button>
              )}
            </div>
          </div>

          <Link to={`/evento/${order.ticketEventId}`} className="inline-block text-xs font-medium text-primary hover:underline">
            Ver página do evento
          </Link>
        </div>
      </div>
    </li>
  )
}

/** Acompanhar pedidos: o comprador informa CPF + telefone e vê os pedidos e o status de cada um. */
export function TrackOrdersPage() {
  const [cpf, setCpf] = useState('')
  const [phone, setPhone] = useState('')

  const cpfOk = isValidCpf(cpf)
  const phoneOk = [10, 11].includes(onlyDigits(phone).length)
  const canSearch = cpfOk && phoneOk

  const search = useMutation({
    mutationFn: async () => (await ticketOrdersApi.lookup({ cpf: onlyDigits(cpf), phone: onlyDigits(phone) })).data,
  })

  const orders = search.data

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-10 sm:py-14">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <PackageSearch className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Acompanhar pedidos</h1>
        <p className="text-sm text-muted-foreground">Informe o CPF e o telefone usados na compra para ver seus pedidos.</p>
      </div>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (canSearch && !search.isPending) search.mutate()
        }}
        className="space-y-4 rounded-2xl border border-border/50 bg-card/50 p-5 sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tr-cpf">CPF</Label>
            <Input id="tr-cpf" inputMode="numeric" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(maskCpf(e.target.value))} />
            {cpf.length === 14 && !cpfOk && <p className="text-xs text-destructive">CPF inválido</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tr-phone">Telefone</Label>
            <Input
              id="tr-phone"
              type="tel"
              inputMode="tel"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
            />
          </div>
        </div>
        <Button type="submit" className="w-full gap-2" disabled={!canSearch || search.isPending}>
          {search.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Buscar pedidos
        </Button>
      </form>

      {search.isError && <p className="text-center text-sm text-destructive">{extractApiError(search.error)}</p>}

      {orders && orders.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          Nenhum pedido encontrado para esses dados. Confira o CPF e o telefone informados na compra.
        </div>
      )}

      {orders && orders.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">
            {orders.length} pedido{orders.length === 1 ? '' : 's'}
          </h2>
          <ul className="space-y-4">
            {orders.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
