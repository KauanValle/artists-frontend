import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Receipt, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatMoney, toDateInput } from '@/lib/utils'
import { ticketEventsApi, type SaveEventTicketPayload } from '@/services'

/** Taxa administrativa (%) dos ingressos — vem do backend (configurável pelo admin no futuro). */
export function useTicketFee() {
  const { data } = useQuery({
    queryKey: ['ticket-fee'],
    queryFn: async () => (await ticketEventsApi.fee()).data.feePercent,
    staleTime: 5 * 60 * 1000,
  })
  return data
}

/** Valor pago pelo comprador = valor a receber + taxa administrativa (mesma regra do backend). */
export function calcBuyerPrice(receiveAmount: number, feePercent: number): number {
  if (!Number.isFinite(receiveAmount)) return 0
  return Math.round(receiveAmount * (1 + feePercent / 100) * 100) / 100
}

const baseSchema = z.object({
  title: z.string().trim().min(2, 'Informe o título do ingresso').max(120, 'Máximo de 120 caracteres'),
  quantity: z
    .number({ invalid_type_error: 'Informe a quantidade', required_error: 'Informe a quantidade' })
    .int('Use um número inteiro')
    .min(1, 'Mínimo de 1 ingresso')
    .max(1_000_000, 'Quantidade muito alta'),
  receiveAmount: z
    .number({ invalid_type_error: 'Informe o valor (use 0 para gratuito)', required_error: 'Informe o valor (use 0 para gratuito)' })
    .min(0, 'Valor inválido')
    .max(100_000, 'Valor muito alto'),
  salesStartDate: z.string().min(1, 'Informe o início das vendas'),
  salesEndDate: z.string().min(1, 'Informe o fim das vendas'),
  description: z.string().trim().max(1000, 'Máximo de 1000 caracteres').optional(),
})

type TicketFormData = z.infer<typeof baseSchema>

interface TicketModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (ticket: SaveEventTicketPayload) => void
  /** Ingresso em edição (null/undefined = novo). */
  initial?: SaveEventTicketPayload | null
  /** Data de término do evento: as vendas não podem terminar depois dela. */
  eventEndDate?: string
}

const EMPTY: Partial<TicketFormData> = { title: '', salesStartDate: '', salesEndDate: '', description: '' }

/** Cadastro de ingresso do evento (título, quantidade, valor, período de vendas e descrição). */
export function TicketModal({ open, onOpenChange, onSave, initial, eventEndDate }: TicketModalProps) {
  const fee = useTicketFee()

  const schema = useMemo(
    () =>
      baseSchema.superRefine((d, ctx) => {
        if (d.salesStartDate && d.salesStartDate < toDateInput()) {
          ctx.addIssue({ code: 'custom', path: ['salesStartDate'], message: 'O início não pode estar no passado' })
        }
        if (d.salesStartDate && d.salesEndDate && d.salesEndDate < d.salesStartDate) {
          ctx.addIssue({ code: 'custom', path: ['salesEndDate'], message: 'O fim deve ser igual ou depois do início' })
        }
        if (eventEndDate && d.salesEndDate && d.salesEndDate > eventEndDate) {
          ctx.addIssue({ code: 'custom', path: ['salesEndDate'], message: 'As vendas não podem terminar depois do evento' })
        }
      }),
    [eventEndDate]
  )

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<TicketFormData>({ resolver: zodResolver(schema), defaultValues: EMPTY })

  // Reinicia ao abrir: vazio (novo) ou com os dados do ingresso em edição.
  useEffect(() => {
    if (open) reset(initial ? { ...initial } : EMPTY)
  }, [open, initial, reset])

  const receive = watch('receiveAmount')
  const buyerPrice = fee === undefined || !Number.isFinite(receive) ? null : calcBuyerPrice(receive, fee)

  const submit = (data: TicketFormData) => {
    onSave({ ...data, description: data.description ?? '' })
    onOpenChange(false)
  }

  const err = (msg?: string) => (msg ? <p className="text-xs text-destructive">{msg}</p> : null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" /> {initial ? 'Editar ingresso' : 'Criar ingresso'}
          </DialogTitle>
          <DialogDescription>Defina o ingresso, o valor que você quer receber e o período de vendas.</DialogDescription>
        </DialogHeader>

        {/* stopPropagation: o submit desta modal não pode disparar o formulário do evento (o React propaga eventos pelo portal) */}
        <form
          onSubmit={(e) => {
            e.stopPropagation()
            void handleSubmit(submit)(e)
          }}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="tk-title">Título do ingresso</Label>
            <Input id="tk-title" placeholder="Ex.: Pista, VIP, Meia-entrada" {...register('title')} />
            {err(errors.title?.message)}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tk-qty">Quantidade</Label>
            <Input id="tk-qty" type="number" min={1} step={1} placeholder="Ex.: 200" {...register('quantity', { valueAsNumber: true })} />
            {err(errors.quantity?.message)}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tk-receive">Valor a receber (R$)</Label>
              <Input
                id="tk-receive"
                type="number"
                min={0}
                step="0.01"
                placeholder="0,00"
                {...register('receiveAmount', { valueAsNumber: true })}
              />
              {err(errors.receiveAmount?.message)}
              <p className="text-xs text-muted-foreground">Quanto você recebe por ingresso vendido.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Valor com taxas</Label>
              <div className="flex min-h-9 flex-col justify-center rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Receipt className="h-4 w-4 text-primary" />
                  {buyerPrice === null ? '—' : formatMoney(buyerPrice)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {fee === undefined
                  ? 'Carregando taxa administrativa...'
                  : `Valor pago pelo comprador (taxa administrativa de ${fee.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%).`}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tk-start">Início das vendas</Label>
              <Input id="tk-start" type="date" min={toDateInput()} {...register('salesStartDate')} />
              {err(errors.salesStartDate?.message)}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tk-end">Fim das vendas</Label>
              <Input id="tk-end" type="date" min={toDateInput()} max={eventEndDate || undefined} {...register('salesEndDate')} />
              {err(errors.salesEndDate?.message)}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tk-desc">Descrição do ingresso</Label>
            <Textarea id="tk-desc" rows={3} placeholder="O que está incluso, regras de uso, lote..." {...register('description')} />
            {err(errors.description?.message)}
          </div>

          <div className="flex flex-col-reverse justify-end gap-2 pt-1 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{initial ? 'Salvar ingresso' : 'Adicionar ingresso'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
