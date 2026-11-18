import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ImagePlus, Loader2, Pencil, Plus, Ticket, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { uploadsApi, viaCepApi, type SaveEventTicketPayload } from '@/services'
import { extractApiError } from '@/services/api'
import { formatDate, formatMoney, toDateInput } from '@/lib/utils'
import { EVENT_CATEGORIES } from './eventStore'
import { calcBuyerPrice, TicketModal, useTicketFee } from './TicketModal'

const schema = z
  .object({
    name: z.string().trim().min(3, 'Informe o nome do evento'),
    imageUrl: z.string().min(1, 'Envie a imagem de divulgação'),
    category: z.string().min(1, 'Selecione a categoria'),
    startDate: z.string().min(1, 'Informe a data de início'),
    startTime: z.string().min(1, 'Informe o horário de início'),
    endDate: z.string().min(1, 'Informe a data de término'),
    endTime: z.string().min(1, 'Informe o horário de término'),
    description: z.string().trim().min(10, 'Descreva o evento (mínimo de 10 caracteres)').max(2000, 'Máximo de 2000 caracteres'),
    cep: z.string().refine((v) => v.replace(/\D/g, '').length === 8, 'CEP inválido'),
    venue: z.string().trim().min(2, 'Informe o nome do local'),
    street: z.string().trim().min(2, 'Informe a rua'),
    number: z.string().trim().min(1, 'Informe o número'),
    complement: z.string().trim().optional(),
    neighborhood: z.string().trim().min(2, 'Informe o bairro'),
    city: z.string().trim().min(2, 'Informe a cidade'),
    state: z.string().trim().length(2, 'UF com 2 letras'),
    producerName: z.string().trim().min(2, 'Informe o nome do produtor'),
    producerDescription: z.string().trim().min(10, 'Descreva o produtor (mínimo de 10 caracteres)').max(1000, 'Máximo de 1000 caracteres'),
  })
  .superRefine((d, ctx) => {
    if (d.startDate && d.startDate < toDateInput()) {
      ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'A data não pode estar no passado' })
    }
    if (d.startDate && d.startTime && d.endDate && d.endTime) {
      if (`${d.endDate}T${d.endTime}` <= `${d.startDate}T${d.startTime}`) {
        ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'O término deve ser depois do início' })
      }
    }
  })

export type EventFormData = z.infer<typeof schema>

/** Dados do formulário + ingressos criados na modal. */
export type EventSubmitData = EventFormData & { tickets: SaveEventTicketPayload[] }

const MAX_IMAGE_MB = 10
const ALLOWED_IMAGES = ['image/jpeg', 'image/png', 'image/webp']

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-border/50 bg-card/50 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null
}

export function EventForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void
  onSubmit: (data: EventSubmitData) => void | Promise<void>
}) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EventFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      imageUrl: '',
      category: '',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      description: '',
      cep: '',
      venue: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      producerName: '',
      producerDescription: '',
    },
  })

  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [ticketModalOpen, setTicketModalOpen] = useState(false)
  const [tickets, setTickets] = useState<SaveEventTicketPayload[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const fee = useTicketFee()
  const eventEndDate = watch('endDate')

  const openNewTicket = () => {
    setEditingIndex(null)
    setTicketModalOpen(true)
  }
  const openEditTicket = (index: number) => {
    setEditingIndex(index)
    setTicketModalOpen(true)
  }
  const saveTicket = (ticket: SaveEventTicketPayload) =>
    setTickets((prev) => (editingIndex === null ? [...prev, ticket] : prev.map((t, i) => (i === editingIndex ? ticket : t))))
  const removeTicket = (index: number) => setTickets((prev) => prev.filter((_, i) => i !== index))

  // libera a URL temporária da pré-visualização
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const handleImage = async (file: File | undefined) => {
    if (!file) return
    if (!ALLOWED_IMAGES.includes(file.type)) {
      toast.error('Formato não suportado. Use JPEG, PNG ou WebP.')
      return
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast.error(`A imagem deve ter no máximo ${MAX_IMAGE_MB} MB.`)
      return
    }
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const { data } = await uploadsApi.upload(file)
      setValue('imageUrl', data.url, { shouldValidate: true })
    } catch (err) {
      setPreview(null)
      setValue('imageUrl', '')
      toast.error(extractApiError(err))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const removeImage = () => {
    setPreview(null)
    setValue('imageUrl', '', { shouldValidate: true })
  }

  // Preenche rua, bairro, cidade e UF quando o CEP tem 8 dígitos (ViaCEP).
  const lookupCep = async (digits: string) => {
    setCepLoading(true)
    try {
      const { data } = await viaCepApi.getAddress({ cep: digits })
      // Resposta inesperada (ex.: HTML) ou CEP inexistente ({ erro: true })
      if (!data || typeof data !== 'object' || data.erro || !data.cep) {
        toast.error('CEP não encontrado. Preencha o endereço manualmente.')
        return
      }
      if (data.logradouro) setValue('street', data.logradouro, { shouldValidate: true })
      if (data.bairro) setValue('neighborhood', data.bairro, { shouldValidate: true })
      if (data.localidade) setValue('city', data.localidade, { shouldValidate: true })
      if (data.uf) setValue('state', data.uf, { shouldValidate: true })
    } catch {
      toast.error('Não foi possível consultar o CEP. Preencha o endereço manualmente.')
    } finally {
      setCepLoading(false)
    }
  }

  const shownImage = preview

  return (
    <form onSubmit={handleSubmit((data) => onSubmit({ ...data, tickets }))} className="space-y-6" noValidate>
      {/* ── Informações do evento ── */}
      <Section title="Informações do evento">
        <div className="space-y-1.5">
          <Label htmlFor="ev-name">Nome do evento</Label>
          <Input id="ev-name" placeholder="Ex.: Festival de Verão 2027" {...register('name')} />
          <FieldError message={errors.name?.message} />
        </div>

        <div className="space-y-1.5">
          <Label>Imagem de divulgação</Label>
          <input
            ref={fileRef}
            type="file"
            accept={ALLOWED_IMAGES.join(',')}
            className="hidden"
            onChange={(e) => void handleImage(e.target.files?.[0])}
          />
          {shownImage ? (
            <div className="relative overflow-hidden rounded-xl border border-border/50">
              <img src={shownImage} alt="Pré-visualização da imagem do evento" className="aspect-[16/9] w-full object-cover" />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              {!uploading && (
                <div className="absolute right-2 top-2 flex gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
                    Trocar
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={removeImage} aria-label="Remover imagem">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <ImagePlus className="h-8 w-8" />
              <span className="font-medium">Clique para enviar a imagem</span>
              <span className="text-xs">JPEG, PNG ou WebP · até {MAX_IMAGE_MB} MB · proporção 16:9 recomendada</span>
            </button>
          )}
          <FieldError message={errors.imageUrl?.message} />
        </div>

        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.category?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ev-desc">Descrição do evento</Label>
          <Textarea
            id="ev-desc"
            rows={5}
            placeholder="Conte sobre o evento: atrações, programação, classificação indicativa..."
            {...register('description')}
          />
          <FieldError message={errors.description?.message} />
        </div>
      </Section>

      {/* ── Data e horário ── */}
      <Section title="Data e horário">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ev-start-date">Data de início</Label>
            <Input id="ev-start-date" type="date" min={toDateInput()} {...register('startDate')} />
            <FieldError message={errors.startDate?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-start-time">Horário de início</Label>
            <Input id="ev-start-time" type="time" {...register('startTime')} />
            <FieldError message={errors.startTime?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-end-date">Data de término</Label>
            <Input id="ev-end-date" type="date" min={toDateInput()} {...register('endDate')} />
            <FieldError message={errors.endDate?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-end-time">Horário de término</Label>
            <Input id="ev-end-time" type="time" {...register('endTime')} />
            <FieldError message={errors.endTime?.message} />
          </div>
        </div>
      </Section>

      {/* ── Local ── */}
      <Section title="Local do evento" description="Informe o CEP para preencher o endereço automaticamente.">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="ev-cep">CEP</Label>
            <div className="relative">
              <Input
                id="ev-cep"
                inputMode="numeric"
                placeholder="00000-000"
                maxLength={9}
                {...register('cep', {
                  onChange: (e) => {
                    const d = e.target.value.replace(/\D/g, '').slice(0, 8)
                    e.target.value = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
                    if (d.length === 8) void lookupCep(d)
                  },
                })}
              />
              {cepLoading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <FieldError message={errors.cep?.message} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ev-venue">Nome do local</Label>
            <Input id="ev-venue" placeholder="Ex.: Casa de Shows Central" {...register('venue')} />
            <FieldError message={errors.venue?.message} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ev-street">Rua</Label>
            <Input id="ev-street" {...register('street')} />
            <FieldError message={errors.street?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-number">Número</Label>
            <Input id="ev-number" placeholder="Ex.: 123 ou S/N" {...register('number')} />
            <FieldError message={errors.number?.message} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ev-complement">Complemento (opcional)</Label>
            <Input id="ev-complement" placeholder="Ex.: Pavilhão B" {...register('complement')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-neighborhood">Bairro</Label>
            <Input id="ev-neighborhood" {...register('neighborhood')} />
            <FieldError message={errors.neighborhood?.message} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ev-city">Cidade</Label>
            <Input id="ev-city" {...register('city')} />
            <FieldError message={errors.city?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-state">Estado (UF)</Label>
            <Input
              id="ev-state"
              maxLength={2}
              placeholder="SP"
              {...register('state', {
                onChange: (e) => {
                  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '')
                },
              })}
            />
            <FieldError message={errors.state?.message} />
          </div>
        </div>
      </Section>

      {/* ── Ingressos ── */}
      <Section title="Ingressos" description="Crie os ingressos que serão vendidos para este evento.">
        {tickets.length > 0 && (
          <ul className="space-y-2">
            {tickets.map((t, i) => (
              <li
                key={`${t.title}-${i}`}
                className="flex items-start justify-between gap-3 rounded-xl border border-border/50 bg-background/40 p-3"
              >
                <div className="min-w-0 space-y-0.5 text-sm">
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-muted-foreground">
                    {t.quantity} ingressos · você recebe {formatMoney(t.receiveAmount)}
                    {fee !== undefined && <> · comprador paga {formatMoney(calcBuyerPrice(t.receiveAmount, fee))}</>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Vendas de {formatDate(t.salesStartDate)} até {formatDate(t.salesEndDate)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button type="button" variant="ghost" size="sm" aria-label={`Editar ${t.title}`} onClick={() => openEditTicket(i)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" aria-label={`Remover ${t.title}`} onClick={() => removeTicket(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Button type="button" variant="outline" className="gap-2" onClick={openNewTicket}>
          <Plus className="h-4 w-4" /> <Ticket className="h-4 w-4" /> Criar ingresso
        </Button>
      </Section>
      <TicketModal
        open={ticketModalOpen}
        onOpenChange={setTicketModalOpen}
        onSave={saveTicket}
        initial={editingIndex === null ? null : tickets[editingIndex]}
        eventEndDate={eventEndDate}
      />

      {/* ── Produtor ── */}
      <Section title="Informações do produtor">
        <div className="space-y-1.5">
          <Label htmlFor="ev-producer">Nome do produtor</Label>
          <Input id="ev-producer" placeholder="Nome da pessoa ou empresa" {...register('producerName')} />
          <FieldError message={errors.producerName?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-producer-desc">Descrição do produtor</Label>
          <Textarea
            id="ev-producer-desc"
            rows={4}
            placeholder="Conte quem é o produtor, experiência e eventos anteriores..."
            {...register('producerDescription')}
          />
          <FieldError message={errors.producerDescription?.message} />
        </div>
      </Section>

      <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || uploading}>
          {uploading ? 'Enviando imagem...' : 'Criar evento'}
        </Button>
      </div>
    </form>
  )
}
