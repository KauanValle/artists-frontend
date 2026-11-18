import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { toast } from 'sonner'
import { CheckCircle2, CreditCard, Loader2, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatMoney } from '@/lib/utils'
import { ticketOrdersApi, type EventTicket, type TicketOrder } from '@/services'
import { extractApiError } from '@/services/api'

const MAX_PER_ORDER = 10

const onlyDigits = (v: string) => v.replace(/\D/g, '')

function maskPhone(v: string): string {
  const d = onlyDigits(v).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function maskCpf(v: string): string {
  const d = onlyDigits(v).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

/** Valida os dígitos verificadores do CPF (mesma regra do backend). */
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  for (let t = 9; t < 11; t++) {
    let sum = 0
    for (let i = 0; i < t; i++) sum += Number(cpf[i]) * (t + 1 - i)
    if (((sum * 10) % 11) % 10 !== Number(cpf[t])) return false
  }
  return true
}

const schema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, 'Informe o nome completo')
    .max(200, 'Máximo de 200 caracteres')
    .refine((v) => v.split(/\s+/).filter(Boolean).length >= 2, 'Informe o nome completo (nome e sobrenome)'),
  phone: z.string().refine((v) => [10, 11].includes(onlyDigits(v).length), 'Telefone inválido (DDD + número)'),
  email: z.string().trim().min(1, 'Informe o e-mail').email('E-mail inválido').max(200, 'Máximo de 200 caracteres'),
  cpf: z.string().refine(isValidCpf, 'CPF inválido'),
  quantity: z
    .number({ invalid_type_error: 'Informe a quantidade', required_error: 'Informe a quantidade' })
    .int('Use um número inteiro')
    .min(1, 'Mínimo de 1 ingresso')
    .max(MAX_PER_ORDER, `Máximo de ${MAX_PER_ORDER} ingressos por compra`),
})

type FormData = z.infer<typeof schema>

const EMPTY: FormData = { fullName: '', phone: '', email: '', cpf: '', quantity: 1 }

interface BuyTicketModalProps {
  eventId: string
  ticket: EventTicket | null
  onOpenChange: (open: boolean) => void
}

/** Dados do comprador + quantidade. O pagamento entra na próxima etapa. */
export function BuyTicketModal({ eventId, ticket, onOpenChange }: BuyTicketModalProps) {
  const qc = useQueryClient()
  const open = ticket !== null
  const maxQty = ticket ? Math.max(1, Math.min(MAX_PER_ORDER, ticket.available)) : MAX_PER_ORDER

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: EMPTY })

  const mutation = useMutation({
    mutationFn: async (data: FormData) =>
      (
        await ticketOrdersApi.create(eventId, {
          eventTicketId: ticket!.id,
          fullName: data.fullName,
          phone: onlyDigits(data.phone),
          email: data.email,
          cpf: onlyDigits(data.cpf),
          quantity: data.quantity,
        })
      ).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ticket-event-public', eventId] })
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  // Passo 2: com o pedido criado, gera o checkout do InfinityPay.
  const checkout = useMutation({
    mutationFn: async (orderId: string) => (await ticketOrdersApi.checkout(eventId, orderId)).data,
  })

  useEffect(() => {
    if (open) {
      reset(EMPTY)
      mutation.reset()
      checkout.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset])

  const orderId = mutation.data?.id
  useEffect(() => {
    if (orderId) checkout.mutate(orderId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  const qty = watch('quantity')
  const total = ticket && Number.isFinite(qty) && qty > 0 ? ticket.buyerPrice * qty : null
  const err = (msg?: string) => (msg ? <p className="text-xs text-destructive">{msg}</p> : null)
  const order: TicketOrder | undefined = mutation.data

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {order ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" /> Pagamento
              </DialogTitle>
              <DialogDescription>Confira o pedido e siga para o pagamento seguro no InfinityPay.</DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5 rounded-xl border border-border/50 bg-background/40 p-4 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Ingresso</span>
                <span className="text-right font-medium">
                  {order.quantity}x {order.ticketTitle}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Comprador</span>
                <span className="text-right font-medium">{order.buyerName}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">E-mail</span>
                <span className="text-right font-medium">{order.buyerEmail}</span>
              </div>
              <div className="flex justify-between gap-3 border-t border-border/50 pt-2 text-base font-bold">
                <span>Total</span>
                <span>{order.totalAmount === 0 ? 'Gratuito' : formatMoney(order.totalAmount)}</span>
              </div>
            </div>

            {checkout.isPending || checkout.isIdle ? (
              <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Gerando o checkout...
              </div>
            ) : checkout.isError ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive">{extractApiError(checkout.error)}</p>
                <Button className="w-full" variant="outline" onClick={() => checkout.mutate(order.id)}>
                  Tentar novamente
                </Button>
              </div>
            ) : checkout.data?.paid ? (
              <div className="space-y-3 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
                <p className="text-sm text-muted-foreground">
                  Ingresso garantido! Enviaremos os detalhes para <span className="font-medium text-foreground">{order.buyerEmail}</span>.
                </p>
                <Button className="w-full" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Button className="w-full gap-2" onClick={() => window.location.assign(checkout.data!.checkoutUrl!)}>
                  <CreditCard className="h-4 w-4" /> Ir para o pagamento
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Os ingressos ficam reservados por 30 minutos enquanto o pagamento não é confirmado.
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" /> Comprar ingresso
              </DialogTitle>
              <DialogDescription>
                {ticket?.title} · {ticket ? (ticket.buyerPrice === 0 ? 'Gratuito' : formatMoney(ticket.buyerPrice)) : ''}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="by-name">Nome completo</Label>
                <Input id="by-name" autoComplete="name" placeholder="Seu nome completo" {...register('fullName')} />
                {err(errors.fullName?.message)}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="by-phone">Telefone</Label>
                  <Input
                    id="by-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(11) 99999-9999"
                    {...register('phone', { onChange: (e) => setValue('phone', maskPhone(e.target.value)) })}
                  />
                  {err(errors.phone?.message)}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="by-cpf">CPF</Label>
                  <Input
                    id="by-cpf"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    {...register('cpf', { onChange: (e) => setValue('cpf', maskCpf(e.target.value)) })}
                  />
                  {err(errors.cpf?.message)}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="by-email">E-mail</Label>
                <Input id="by-email" type="email" autoComplete="email" placeholder="voce@email.com" {...register('email')} />
                {err(errors.email?.message)}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="by-qty">Quantidade de ingressos</Label>
                  <Input
                    id="by-qty"
                    type="number"
                    min={1}
                    max={maxQty}
                    step={1}
                    {...register('quantity', { valueAsNumber: true })}
                  />
                  {err(errors.quantity?.message)}
                </div>
                <div className="space-y-1.5">
                  <Label>Total</Label>
                  <div className="flex min-h-9 items-center rounded-md border border-primary/30 bg-primary/5 px-3 text-sm font-semibold">
                    {total === null ? '—' : total === 0 ? 'Gratuito' : formatMoney(total)}
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse justify-end gap-2 pt-1 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={mutation.isPending} className="gap-2">
                  {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Finalizar pagamento
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
