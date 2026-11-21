import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, CheckCircle2, Copy, ExternalLink, Link2, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/badges'
import { formatMoney } from '@/lib/utils'
import { adminPaymentLinksApi, type AdminPaymentLink } from '@/services'
import { extractApiError } from '@/services/api'

const STATUS: Record<AdminPaymentLink['status'], { label: string; cls: string }> = {
  AwaitingPayment: { label: 'Aguardando pagamento', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  Paid: { label: 'Pago', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  Cancelled: { label: 'Cancelado', cls: 'bg-muted text-muted-foreground' },
}

const METHOD: Record<string, string> = { pix: 'Pix', credit_card: 'Cartão de crédito', debit_card: 'Cartão de débito' }

/** "1.234,56" / "1234.56" / "50" → número (ou NaN). */
function parseAmount(v: string): number {
  const s = v.trim().replace(/[R$\s]/g, '')
  if (!s) return NaN
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  return Number(normalized)
}

/** Link público da Reprissa (descreve a cobrança e leva ao checkout). */
const reprissaUrl = (l: AdminPaymentLink) => `${window.location.origin}/pagar/${l.id}`

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export function PaymentLinksPage() {
  const qc = useQueryClient()
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [note, setNote] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const { data: links, isLoading } = useQuery({
    queryKey: ['admin-payment-links'],
    queryFn: async () => (await adminPaymentLinksApi.list()).data,
    // Há link pendente? Reconsulta a cada 10 s: o webhook atualiza o banco e a tela acompanha.
    refetchInterval: (q) => (q.state.data?.some((l) => l.status === 'AwaitingPayment') ? 10000 : false),
  })

  // Avisa quando um link pendente vira "Pago" (webhook ou verificação).
  const prevStatus = useRef<Map<string, AdminPaymentLink['status']> | null>(null)
  useEffect(() => {
    if (!links) return
    const prev = prevStatus.current
    if (prev) {
      for (const l of links) {
        if (l.status === 'Paid' && prev.get(l.id) === 'AwaitingPayment')
          toast.success(`Pagamento recebido: ${l.description} (${formatMoney(l.amount)})`)
      }
    }
    prevStatus.current = new Map(links.map((l) => [l.id, l.status]))
  }, [links])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-payment-links'] })

  const copy = async (link: AdminPaymentLink) => {
    try {
      await navigator.clipboard.writeText(reprissaUrl(link))
      setCopiedId(link.id)
      toast.success('Link copiado.')
      setTimeout(() => setCopiedId((c) => (c === link.id ? null : c)), 2000)
    } catch {
      toast.error('Não foi possível copiar. Selecione e copie manualmente.')
    }
  }

  const create = useMutation({
    mutationFn: async () => {
      const value = parseAmount(amount)
      if (!Number.isFinite(value) || value < 1) throw new Error('Informe um valor válido (mínimo R$ 1,00).')
      if (description.trim().length < 3) throw new Error('Informe uma descrição (mín. 3 caracteres).')
      return (await adminPaymentLinksApi.create({
        description: description.trim(),
        amount: value,
        customerName: customerName.trim() || undefined,
        note: note.trim() || undefined,
      })).data
    },
    onSuccess: async (link) => {
      setDescription(''); setAmount(''); setCustomerName(''); setNote('')
      invalidate()
      await copy(link)
    },
    onError: (e) => toast.error(e instanceof Error && !('response' in e) ? e.message : extractApiError(e)),
  })

  const refresh = useMutation({
    mutationFn: async (id: string) => (await adminPaymentLinksApi.refresh(id)).data,
    onSuccess: (l) => {
      invalidate()
      toast[l.status === 'Paid' ? 'success' : 'info'](l.status === 'Paid' ? 'Pagamento confirmado!' : 'Ainda aguardando o pagamento.')
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const cancel = useMutation({
    mutationFn: async (id: string) => (await adminPaymentLinksApi.cancel(id)).data,
    onSuccess: () => { invalidate(); toast.success('Link cancelado.') },
    onError: (e) => toast.error(extractApiError(e)),
  })

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Links de pagamento</h1>
        <p className="text-sm text-muted-foreground">Gere uma cobrança avulsa e envie ao cliente o link da página de pagamento da Reprissa (que leva ao InfinityPay).</p>
      </div>

      <Card>
        <CardContent className="p-5">
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => { e.preventDefault(); create.mutate() }}
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="pl-desc">Descrição *</Label>
              <Input id="pl-desc" value={description} maxLength={200} placeholder="Ex.: Consultoria de carreira — 1 sessão"
                onChange={(e) => setDescription(e.target.value)} />
              <p className="text-xs text-muted-foreground">Aparece para o cliente na tela de pagamento.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pl-amount">Valor (R$) *</Label>
              <Input id="pl-amount" inputMode="decimal" value={amount} placeholder="150,00"
                onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pl-customer">Cliente (opcional)</Label>
              <Input id="pl-customer" value={customerName} maxLength={120} placeholder="Nome, só para sua organização"
                onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="pl-note">Observação interna (opcional)</Label>
              <Textarea id="pl-note" rows={2} value={note} maxLength={500}
                onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                Gerar link de pagamento
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
      ) : !links || links.length === 0 ? (
        <EmptyState icon={<Link2 className="h-8 w-8" />} title="Nenhum link gerado ainda" description="Os links que você criar aparecem aqui, com o status do pagamento." />
      ) : (
        <div className="space-y-3">
          {links.map((l) => {
            const st = STATUS[l.status]
            const waiting = l.status === 'AwaitingPayment'
            return (
              <Card key={l.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{l.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.customerName ? `${l.customerName} · ` : ''}criado em {fmtDateTime(l.createdAt)}
                      </p>
                      {l.status === 'Paid' && (
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Pago {l.paidAt ? `em ${fmtDateTime(l.paidAt)}` : ''}
                          {l.paymentMethod ? ` · ${METHOD[l.paymentMethod] ?? l.paymentMethod}` : ''}
                          {l.paidVia ? ` · confirmado via ${l.paidVia.toLowerCase()}` : ''}
                          {l.receiptUrl && (
                            <a href={l.receiptUrl} target="_blank" rel="noreferrer" className="underline">comprovante</a>
                          )}
                        </p>
                      )}
                      {l.note && <p className="mt-1 text-xs text-muted-foreground">{l.note}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{formatMoney(l.amount)}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Input readOnly value={reprissaUrl(l)} onFocus={(e) => e.currentTarget.select()}
                      className="h-9 min-w-0 flex-1 text-xs" />
                    <Button size="sm" variant="outline" onClick={() => copy(l)}>
                      {copiedId === l.id ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
                      Copiar
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={reprissaUrl(l)} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-4 w-4" />Abrir</a>
                    </Button>
                    {waiting && (
                      <Button size="sm" variant="ghost" title="Copiar o link direto do InfinityPay"
                        onClick={() => navigator.clipboard.writeText(l.checkoutUrl).then(() => toast.success('Link do InfinityPay copiado.'))}>
                        Link InfinityPay
                      </Button>
                    )}
                    {waiting && (
                      <>
                        <Button size="sm" variant="outline" disabled={refresh.isPending && refresh.variables === l.id}
                          onClick={() => refresh.mutate(l.id)}>
                          <RefreshCw className={`mr-1.5 h-4 w-4 ${refresh.isPending && refresh.variables === l.id ? 'animate-spin' : ''}`} />
                          Verificar pagamento
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive"
                          disabled={cancel.isPending && cancel.variables === l.id}
                          onClick={() => { if (window.confirm('Cancelar este link? Ele deixa de aparecer como pendente aqui.')) cancel.mutate(l.id) }}>
                          <XCircle className="mr-1.5 h-4 w-4" />Cancelar
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
