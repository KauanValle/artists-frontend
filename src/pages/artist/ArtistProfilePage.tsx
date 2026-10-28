import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { addDays, addWeeks, format, getDay } from 'date-fns'
import { CalendarDays, Check, CreditCard, Music2, Plus, Trash2, TriangleAlert, User, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { artistsApi, availabilityApi, feesApi, uploadsApi } from '@/services'
import { useAuth } from '@/hooks/useAuth'
import { requiredProfileFields } from '@/hooks/useArtistProfile'
import { ChipMultiSelect } from '@/components/ui/chip-multi-select'
import { DatePickerCalendar } from '@/components/ui/date-picker-calendar'
import { EVENT_TYPES, styleOptionsForCategory } from '@/lib/artistOptions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { availabilityStatusLabel } from '@/components/badges'
import { cn, formatDate, formatMoney, minutesToLabel } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import type { AvailabilityStatus } from '@/types'

const STEPS = [
  { title: 'Dados básicos', icon: User },
  { title: 'Sobre & estilo', icon: Music2 },
  { title: 'Cachês', icon: Wallet },
  { title: 'Disponibilidade', icon: CalendarDays },
]

// Campos exigidos para avançar de cada passo (passo 0 = identidade; os demais são livres).
const STEP_REQUIRED_FIELDS: string[][] = [
  ['name', 'artisticName', 'categoryId', 'city', 'state', 'phone'],
  [],
  [],
  [],
]

export function ArtistProfilePage() {
  const { refreshUser, user } = useAuth()
  const queryClient = useQueryClient()
  const isFreeArtist = user?.subscriptionTier === 'Gratuito'

  const { data: artist, isLoading } = useQuery({
    queryKey: ['my-artist'],
    queryFn: async () => (await artistsApi.getMy()).data,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await artistsApi.categories()).data,
  })

  const [form, setForm] = useState<Record<string, string> | null>(null)
  const [styles, setStyles] = useState<string[]>([])
  const [specialties, setSpecialties] = useState<string[]>([])
  const [eventTypes, setEventTypes] = useState<string[]>([])
  const [step, setStep] = useState(0)

  if (artist && form === null) {
    setForm({
      artistType: artist.artistType,
      name: artist.name,
      artisticName: artist.artisticName,
      categoryId: artist.categoryId,
      city: artist.city,
      state: artist.state,
      phone: artist.phone,
      description: artist.description,
      profilePhotoUrl: artist.profilePhotoUrl ?? '',
    })
    setStyles(artist.styles)
    setSpecialties(artist.specialties)
    setEventTypes(artist.eventTypes ?? [])
  }

  // Campos obrigatórios cobrados pelo back-end (lista compartilhada com o alerta do menu lateral):
  // salvar → nome, nome artístico e categoria (SaveOnboarding); publicar → cidade e descrição
  // (PublishAsync); UF e telefone são NOT NULL no banco.
  const missingFields = requiredProfileFields.filter((f) => !(form?.[f.key] ?? '').trim())
  const isMissing = (key: string) => missingFields.some((f) => f.key === key)
  const missingClass = 'border-amber-500 focus-visible:ring-amber-500/40'

  const save = useMutation({
    mutationFn: async () => {
      const f = form!
      const payload = {
        artistType: f.artistType,
        name: f.name,
        artisticName: f.artisticName,
        categoryId: f.categoryId,
        city: f.city,
        state: f.state,
        phone: f.phone,
        profilePhotoUrl: f.profilePhotoUrl || null,
        description: f.description,
        styles,
        specialties,
        eventTypes,
        galleryUrls: artist?.galleryUrls ?? [],
        videoUrls: artist?.videoUrls ?? [],
      }
      await artistsApi.saveOnboarding(payload as never)
    },
    onSuccess: async () => {
      toast.success('Perfil salvo!')
      queryClient.invalidateQueries({ queryKey: ['my-artist'] })
      await refreshUser()
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const publish = useMutation({
    mutationFn: (value: boolean) => artistsApi.publish(value),
    onSuccess: async () => {
      toast.success('Status do perfil atualizado!')
      queryClient.invalidateQueries({ queryKey: ['my-artist'] })
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const uploadPhoto = useMutation({
    mutationFn: async (file: File) => (await uploadsApi.upload(file)).data.url,
    onSuccess: (url) => {
      setForm({ ...form!, profilePhotoUrl: url })
      toast.success('Foto enviada! Salve o perfil para aplicar.')
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  if (isLoading || !artist || !form) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Carregando perfil...</p>
  }

  // O cadastro completo (wizard) é exclusivo de assinantes — gratuito vê o convite para assinar.
  if (isFreeArtist) {
    return <LockedProfileView />
  }

  // Opções de estilo sugeridas conforme a categoria selecionada (null = preenchimento livre).
  const styleOptions = styleOptionsForCategory(categories.find((c) => c.id === form.categoryId)?.name)

  // Campos que o perfil já tinha preenchido e agora estão vazios — o salvamento é bloqueado.
  const clearedFields = requiredProfileFields.filter(
    (f) => (artist[f.key] ?? '').trim() !== '' && (form[f.key] ?? '').trim() === ''
  )

  const handleSave = () => {
    if (clearedFields.length > 0) {
      toast.warning(
        `Não é possível salvar: ${clearedFields.map((f) => f.label).join(', ')} ${clearedFields.length > 1 ? 'estão vazios' : 'está vazio'}. Preencha com as novas informações antes de salvar.`
      )
      return
    }
    save.mutate()
  }

  const handleContinue = () => {
    const missingInStep = (STEP_REQUIRED_FIELDS[step] ?? []).filter((key) => !(form[key] ?? '').trim())
    if (missingInStep.length > 0) {
      const labels = requiredProfileFields.filter((f) => missingInStep.includes(f.key)).map((f) => f.label)
      toast.warning(`Preencha antes de continuar: ${labels.join(', ')}`)
      return
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground">Dados do perfil público em /artistas/{artist.slug || '<slug>'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={artist.isPublished ? 'success' : 'secondary'}>
            {artist.isPublished ? 'Publicado' : 'Rascunho'}
          </Badge>
          {missingFields.length > 0 && (
            <Badge variant="warning" className="gap-1">
              <TriangleAlert className="h-3 w-3" />
              {missingFields.length} {missingFields.length > 1 ? 'campos pendentes' : 'campo pendente'}
            </Badge>
          )}
          <Button
            variant={artist.isPublished ? 'outline' : 'default'}
            onClick={() => publish.mutate(!artist.isPublished)}
            disabled={publish.isPending}
          >
            {artist.isPublished ? 'Despublicar' : 'Publicar perfil'}
          </Button>
        </div>
      </div>

      {/* Indicador de passos */}
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {STEPS.map((s, index) => {
          const done = index < step
          const active = index === step
          return (
            <li key={s.title} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => done && setStep(index)}
                disabled={index > step}
                title={done ? `Voltar para ${s.title}` : undefined}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold transition-colors',
                  active && 'border-primary bg-primary text-primary-foreground',
                  done && 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20',
                  !active && !done && 'bg-muted text-muted-foreground'
                )}
              >
                {done ? <Check className="h-4 w-4" /> : index + 1}
              </button>
              <span
                className={cn(
                  'text-sm',
                  active ? 'font-semibold text-foreground' : 'hidden text-muted-foreground sm:inline'
                )}
              >
                {s.title}
              </span>
              {index < STEPS.length - 1 && <span className="hidden h-px w-8 bg-border sm:block" />}
            </li>
          )
        })}
      </ol>

      {missingFields.length > 0 && (
        <div className="rounded-md border border-amber-500/60 bg-amber-50 px-4 py-3 text-sm dark:border-amber-500/40 dark:bg-amber-950/40">
          <p className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            Campo{missingFields.length > 1 ? 's' : ''} obrigatório{missingFields.length > 1 ? 's' : ''} sem preencher
          </p>
          <p className="mt-1 text-amber-800/90 dark:text-amber-200/90">
            Faltam: <strong>{missingFields.map((f) => f.label).join(', ')}</strong>. O back-end exige nome, nome
            artístico e categoria para salvar; cidade e descrição para publicar.
          </p>
        </div>
      )}

      {/* Passo 0 — Dados básicos */}
      {step === 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-4 w-4" /> Dados básicos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {form.profilePhotoUrl && (
                <img src={form.profilePhotoUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
              )}
              <div>
                <Label>Foto de perfil</Label>
                <Input
                  type="file"
                  accept="image/*"
                  className="mt-1 w-64"
                  onChange={(e) => e.target.files?.[0] && uploadPhoto.mutate(e.target.files[0])}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.artistType} onValueChange={(v) => setForm({ ...form, artistType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Solo">Solo</SelectItem>
                    <SelectItem value="Band">Banda/Grupo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={cn(isMissing('name') && missingClass)}
                />
                {isMissing('name') && <MissingHint message="Informe o nome — obrigatório para salvar" />}
              </div>
              <div className="space-y-1.5">
                <Label>Nome artístico *</Label>
                <Input
                  value={form.artisticName}
                  onChange={(e) => setForm({ ...form, artisticName: e.target.value })}
                  className={cn(isMissing('artisticName') && missingClass)}
                />
                {isMissing('artisticName') && <MissingHint message="Informe o nome artístico — obrigatório para salvar" />}
              </div>
              <div className="space-y-1.5">
                <Label>Categoria *</Label>
                <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                  <SelectTrigger className={cn(isMissing('categoryId') && missingClass)}>
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isMissing('categoryId') && <MissingHint message="Selecione a categoria — obrigatória para salvar" />}
              </div>
              <div className="space-y-1.5">
                <Label>Cidade *</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className={cn(isMissing('city') && missingClass)}
                />
                {isMissing('city') && <MissingHint message="Informe a cidade — obrigatória para publicar" />}
              </div>
              <div className="space-y-1.5">
                <Label>UF *</Label>
                <Input
                  maxLength={2}
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className={cn(isMissing('state') && missingClass)}
                />
                {isMissing('state') && <MissingHint message="Informe a UF (ex.: SP)" />}
              </div>
              <div className="space-y-1.5">
                <Label>Telefone *</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={cn(isMissing('phone') && missingClass)}
                />
                {isMissing('phone') && <MissingHint message="Informe o telefone de contato" />}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Passo 1 — Sobre & estilo */}
      {step === 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Music2 className="h-4 w-4" /> Sobre & estilo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Textarea
                rows={5}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={cn(isMissing('description') && missingClass)}
              />
              {isMissing('description') && (
                <MissingHint message="Escreva a descrição — obrigatória para publicar o perfil" />
              )}
            </div>

            <div>
              <Label className="mb-2">Estilos</Label>
              {styleOptions ? (
                <>
                  <ChipMultiSelect
                    options={styleOptions}
                    selected={styles}
                    onChange={setStyles}
                    addLabel="Adicionar outro estilo"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Clique para selecionar; use “Adicionar” para estilos próprios.
                  </p>
                </>
              ) : (
                <TagListEditor label="Estilos (preenchimento livre)" values={styles} onChange={setStyles} />
              )}
            </div>

            <TagListEditor label="Especialidades" values={specialties} onChange={setSpecialties} />

            <div>
              <Label className="mb-2">Tipos de evento atendidos</Label>
              <ChipMultiSelect
                options={EVENT_TYPES}
                selected={eventTypes}
                onChange={setEventTypes}
                addLabel="Adicionar outro tipo"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Em quais ocasiões você se apresenta? Aparecem como “Ideal para” no seu perfil público.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Passo 2 — Cachês */}
      {step === 2 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Defina as faixas de cachê exibidas no seu perfil público.</p>
          <FeesCard artistId={artist.id} />
        </div>
      )}

      {/* Passo 3 — Disponibilidade + salvar */}
      {step === 3 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Cadastre as datas em que você pode (ou não) se apresentar. Revise tudo e salve o perfil.
          </p>
          <AvailabilityCard />
        </div>
      )}

      {/* Navegação do wizard */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          Voltar
        </Button>
        <span className="text-xs text-muted-foreground">
          Passo {step + 1} de {STEPS.length}
        </span>
        {step < STEPS.length - 1 ? (
          <Button onClick={handleContinue}>Continuar</Button>
        ) : (
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? 'Salvando...' : 'Salvar perfil'}
          </Button>
        )}
      </div>
    </div>
  )
}

/** Aviso amarelo abaixo de campo obrigatório deixado em branco (validação espelha o back-end). */
function MissingHint({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-500">
      <TriangleAlert className="h-3 w-3 shrink-0" />
      {message}
    </p>
  )
}

/** Conta gratuita acessou o perfil: em vez do wizard, mostra o convite para assinar. */
function LockedProfileView() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground">Recurso disponível para assinantes.</p>
      </div>

      <Card className="overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary to-primary/50" />
        <CardContent className="space-y-4 p-6">
          <p className="text-sm text-muted-foreground">
            A conta gratuita dá acesso apenas ao dashboard e à assinatura. Ao assinar o{' '}
            <strong className="text-foreground">ACESSO TOTAL A PLATAFORMA</strong>, você desbloqueia o cadastro
            completo do seu perfil em etapas: dados, estilos, tipos de evento, cachês e disponibilidade.
          </p>
          <Button asChild>
            <Link to="/artist/assinatura">
              <CreditCard /> Conhecer a assinatura
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function TagListEditor({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('')
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {values.map((value) => (
          <Badge key={value} variant="secondary" className="gap-1">
            {value}
            <button className="text-muted-foreground hover:text-destructive" onClick={() => onChange(values.filter((v) => v !== value))}>
              <Trash2 className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          className="h-8 w-40"
          placeholder="Adicionar..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim()) {
              e.preventDefault()
              onChange([...values, input.trim()])
              setInput('')
            }
          }}
        />
      </div>
    </div>
  )
}

function FeesCard({ artistId }: { artistId: string }) {
  const queryClient = useQueryClient()
  const { data: fees = [] } = useQuery({
    queryKey: ['fees', artistId],
    queryFn: async () => (await feesApi.listByArtist(artistId)).data,
  })

  const [duration, setDuration] = useState('60')
  const [price, setPrice] = useState('')

  const create = useMutation({
    mutationFn: () => feesApi.create({ durationMinutes: Number(duration), price: Number(price.replace(',', '.')) }),
    onSuccess: () => {
      toast.success('Faixa de cachê criada!')
      setPrice('')
      queryClient.invalidateQueries({ queryKey: ['fees', artistId] })
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const remove = useMutation({
    mutationFn: (id: string) => feesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fees', artistId] }),
    onError: (e) => toast.error(extractApiError(e)),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cachês (faixas públicas)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {fees.map((fee) => (
          <div key={fee.id} className="flex items-center justify-between rounded-md border p-2.5 text-sm">
            <span>
              {minutesToLabel(fee.durationMinutes)} — <strong>{formatMoney(fee.price)}</strong>
            </span>
            <Button variant="ghost" size="icon" onClick={() => remove.mutate(fee.id)}>
              <Trash2 className="text-destructive" />
            </Button>
          </div>
        ))}
        {fees.length === 0 && <p className="text-sm text-muted-foreground">Ex.: 1h = R$100, 2h = R$180...</p>}
        <div className="flex gap-2">
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="60">1h</SelectItem>
              <SelectItem value="90">1h30</SelectItem>
              <SelectItem value="120">2h</SelectItem>
              <SelectItem value="180">3h</SelectItem>
              <SelectItem value="240">4h</SelectItem>
            </SelectContent>
          </Select>
          <Input className="flex-1" placeholder="Preço (R$)" value={price} onChange={(e) => setPrice(e.target.value)} />
          <Button type="button" size="icon" onClick={() => price && create.mutate()}>
            <Plus />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Valor público de referência — o final é definido pela proposta.</p>
      </CardContent>
    </Card>
  )
}

function AvailabilityCard() {
  const queryClient = useQueryClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: availabilities = [] } = useQuery({
    queryKey: ['availabilities'],
    queryFn: async () => {
      const artist = (await artistsApi.getMy()).data
      return (await availabilityApi.listByArtist(artist.id)).data
    },
  })

  // Bloco 1 — dias de trabalho padrão (repetição semanal)
  const [workWeekdays, setWorkWeekdays] = useState<number[]>([])
  const [horizonWeeks, setHorizonWeeks] = useState('4')

  // Pré-seleciona os chips com os dias da semana que já existem nas disponibilidades salvas.
  const [weekdaysInitialized, setWeekdaysInitialized] = useState(false)
  useEffect(() => {
    if (weekdaysInitialized || availabilities.length === 0) return
    const savedWeekdays = [...new Set(availabilities.map((a) => new Date(`${a.date}T00:00:00`).getDay()))].sort()
    setWorkWeekdays(savedWeekdays)
    setWeekdaysInitialized(true)
  }, [availabilities, weekdaysInitialized])

  // Horário padrão aplicado aos novos dias (blocos de criação em lote)
  const [batchStart, setBatchStart] = useState('20:00')
  const [batchEnd, setBatchEnd] = useState('23:00')

  // Bloco 3 — dia específico (editar um único dia)
  const [date, setDate] = useState(today)
  const [start, setStart] = useState('18:00')
  const [end, setEnd] = useState('23:00')
  const [status, setStatus] = useState<AvailabilityStatus>('Available')

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['availabilities'] })

  const WEEKDAY_OPTIONS = [
    { value: 1, label: 'Seg' },
    { value: 2, label: 'Ter' },
    { value: 3, label: 'Qua' },
    { value: 4, label: 'Qui' },
    { value: 5, label: 'Sex' },
    { value: 6, label: 'Sáb' },
    { value: 0, label: 'Dom' },
  ]

  const applyWeekdays = useMutation({
    mutationFn: () => {
      // Expande os dias da semana selecionados em datas concretas ao longo do período.
      const startDay = new Date()
      const endDay = addWeeks(startDay, Number(horizonWeeks))
      const dates: string[] = []
      let current = startDay
      while (current <= endDay) {
        if (workWeekdays.includes(getDay(current))) dates.push(format(current, 'yyyy-MM-dd'))
        current = addDays(current, 1)
      }
      return availabilityApi.createBatch({
        dates,
        startTime: batchStart,
        endTime: batchEnd,
        isAllDay: false,
        status: 'Available',
      })
    },
    onSuccess: ({ data }) => {
      const parts = [`${data.created} dia(s) salvos`]
      if (data.skippedExisting) parts.push(`${data.skippedExisting} já existiam`)
      if (data.skippedEventConflict) parts.push(`${data.skippedEventConflict} com show na agenda foram pulados`)
      toast.success(`Dias de trabalho aplicados: ${parts.join(' • ')}.`)
      setWorkWeekdays([])
      invalidate()
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const create = useMutation({
    mutationFn: () =>
      availabilityApi.create({
        date,
        startTime: `${start}:00`,
        endTime: `${end}:00`,
        isAllDay: false,
        status,
      }),
    onSuccess: () => {
      toast.success(
        status === 'Unavailable'
          ? 'Dia marcado como indisponível — intervalos de trabalho conflitantes foram substituídos.'
          : 'Disponibilidade criada!'
      )
      invalidate()
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const remove = useMutation({
    mutationFn: (id: string) => availabilityApi.remove(id),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(extractApiError(e)),
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4" /> Disponibilidade
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Horário padrão dos novos dias */}
        <div className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
          <div className="space-y-1">
            <Label className="text-xs">Horário dos novos dias</Label>
            <div className="flex gap-2">
              <Input type="time" value={batchStart} onChange={(e) => setBatchStart(e.target.value)} className="w-28" />
              <Input type="time" value={batchEnd} onChange={(e) => setBatchEnd(e.target.value)} className="w-28" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Aplicado aos dois blocos abaixo.</p>
        </div>

        {/* Bloco 1 — dias de trabalho padrão */}
        <div className="space-y-3 rounded-lg border p-4">
          <div>
            <p className="text-sm font-semibold">Dias de trabalho (padrão)</p>
            <p className="text-xs text-muted-foreground">
              Marque os dias da semana em que você costuma trabalhar e aplique para as próximas semanas.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_OPTIONS.map((weekday) => {
              const active = workWeekdays.includes(weekday.value)
              return (
                <button
                  key={weekday.value}
                  type="button"
                  onClick={() =>
                    setWorkWeekdays(
                      active ? workWeekdays.filter((v) => v !== weekday.value) : [...workWeekdays, weekday.value]
                    )
                  }
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-accent'
                  )}
                >
                  {weekday.label}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Período</Label>
              <Select value={horizonWeeks} onValueChange={setHorizonWeeks}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">Próximas 4 semanas</SelectItem>
                  <SelectItem value="8">Próximas 8 semanas</SelectItem>
                  <SelectItem value="12">Próximas 12 semanas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              onClick={() => applyWeekdays.mutate()}
              disabled={applyWeekdays.isPending || workWeekdays.length === 0}
            >
              {applyWeekdays.isPending ? 'Aplicando...' : 'Aplicar dias de trabalho'}
            </Button>
          </div>
        </div>

        {/* Bloco 2 — dia específico (editar um único dia) */}
        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-sm font-semibold">Dia específico</p>
          <p className="text-xs text-muted-foreground">Para ajustar um único dia.</p>
          <DatePickerCalendar value={date} onChange={setDate} mode="weekly" minDate={today} />
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label className="text-xs">Início</Label>
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-28" />
            </div>
            <div>
              <Label className="text-xs">Fim</Label>
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="w-28" />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as AvailabilityStatus)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(availabilityStatusLabel).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" onClick={() => create.mutate()} disabled={create.isPending}>
              <Plus /> Adicionar
            </Button>
          </div>
        </div>

        {/* Dias já salvos */}
        <div className="flex flex-wrap gap-2">
          {availabilities.slice(0, 12).map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs">
              <span>{formatDate(a.date)}</span>
              <span className="text-muted-foreground">{a.isAllDay ? 'Dia todo' : `${a.startTime.slice(0, 5)}–${a.endTime.slice(0, 5)}`}</span>
              <Badge variant={a.status === 'Available' ? 'success' : a.status === 'PreReserved' ? 'warning' : 'muted'}>
                {availabilityStatusLabel[a.status]}
              </Badge>
              <button className="text-muted-foreground hover:text-destructive" onClick={() => remove.mutate(a.id)}>
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {availabilities.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum dia salvo ainda — use os blocos acima.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
