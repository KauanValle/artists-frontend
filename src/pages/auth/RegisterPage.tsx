import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronLeft, Music2, User, Wallet } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChipMultiSelect } from '@/components/ui/chip-multi-select'
import { EVENT_TYPES, styleOptionsForCategory } from '@/lib/artistOptions'
import { artistsApi } from '@/services'
import { extractApiError } from '@/services/api'
import { cn } from '@/lib/utils'

const artistSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Mínimo de 8 caracteres'),
  name: z.string().min(2, 'Informe seu nome'),
  artisticName: z.string().min(2, 'Informe o nome artístico'),
  city: z.string().min(2, 'Informe a cidade'),
  state: z.string().length(2, 'UF com 2 letras'),
  phone: z.string().min(8, 'Informe o telefone'),
})

const contractorSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Mínimo de 8 caracteres'),
  name: z.string().min(2, 'Informe seu nome'),
  phone: z.string().optional(),
})

// Passos do cadastro do artista: poucos campos por cartão.
const ARTIST_STEPS = [
  { title: 'Informações básicas', icon: User, fields: ['name', 'email', 'password', 'phone', 'city', 'state'] },
  { title: 'Dados artísticos', icon: Music2, fields: ['artisticName'] },
  { title: 'Estilo & eventos', icon: Wallet, fields: [] },
]

export function RegisterPage() {
  const { registerArtist, registerContractor } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState<'Artist' | 'Contractor'>('Artist')
  const [step, setStep] = useState(0)
  const [artistType, setArtistType] = useState('Solo')
  const [categoryId, setCategoryId] = useState('')
  const [categoryTouched, setCategoryTouched] = useState(false)
  const [styles, setStyles] = useState<string[]>([])
  const [eventTypes, setEventTypes] = useState<string[]>([])
  const [error, setError] = useState('')

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await artistsApi.categories()).data,
  })

  const schema = role === 'Artist' ? artistSchema : contractorSchema
  const { register, handleSubmit, trigger, formState: { errors, isSubmitting } } = useForm<Record<string, string>>({
    // Registro tem dois formatos (artista em passos / contratante em formulário único);
    // validação fina é feita pelo schema escolhido.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
  })

  const categoryName = categories.find((c) => c.id === categoryId)?.name
  const styleOptions = styleOptionsForCategory(categoryName)

  const handleContinue = async () => {
    const valid = await trigger(ARTIST_STEPS[step].fields)
    if (!valid) return
    if (step === 1 && !categoryId) {
      setCategoryTouched(true)
      toast.warning('Selecione a categoria do artista')
      return
    }
    setError('')
    setStep((s) => s + 1)
  }

  const onSubmit = async (data: Record<string, string>) => {
    setError('')
    try {
      if (role === 'Artist') {
        await registerArtist({ ...data, artistType, categoryId, styles, eventTypes })
        toast.success('Conta criada! Assine para desbloquear o perfil completo.')
        navigate('/artist/dashboard')
      } else {
        await registerContractor({ ...data, contractorType: 'Person' })
        toast.success('Conta criada com sucesso!')
        navigate('/contractor/dashboard')
      }
    } catch (err) {
      setError(extractApiError(err))
    }
  }

  const fieldError = (name: string) => errors[name]?.message as string | undefined

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-start justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Criar conta</h1>
          <p className="mt-1 text-sm text-muted-foreground">Escolha seu perfil e comece agora</p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <Button variant={role === 'Artist' ? 'default' : 'outline'} onClick={() => setRole('Artist')}>
            Sou artista
          </Button>
          <Button variant={role === 'Contractor' ? 'default' : 'outline'} onClick={() => setRole('Contractor')}>
            Sou contratante
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {role === 'Artist' && (
            <>
              {/* Indicador de passos */}
              <ol className="flex items-center justify-between gap-2">
                {ARTIST_STEPS.map((s, index) => {
                  const done = index < step
                  const active = index === step
                  return (
                    <li key={s.title} className="flex flex-1 items-center gap-2">
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
                          active && 'border-primary bg-primary text-primary-foreground',
                          done && 'border-primary/40 bg-primary/10 text-primary',
                          !active && !done && 'bg-muted text-muted-foreground'
                        )}
                      >
                        {done ? <Check className="h-4 w-4" /> : index + 1}
                      </span>
                      <span className={cn('hidden text-xs sm:block', active ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                        {s.title}
                      </span>
                      {index < ARTIST_STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
                    </li>
                  )
                })}
              </ol>

              <p className="text-center text-xs text-muted-foreground">
                Passo {step + 1} de {ARTIST_STEPS.length} — {ARTIST_STEPS[step].title}
              </p>
            </>
          )}

          {/* Passo 0 — Informações básicas (artista) / formulário único (contratante) */}
          {(role === 'Contractor' || step === 0) && (
            <div className="space-y-3 rounded-xl border p-4">
              <p className="text-sm font-semibold">Informações básicas</p>
              <div className="space-y-1.5">
                <Label>Nome {role === 'Artist' ? '(responsável)' : ''}</Label>
                <Input placeholder="Seu nome" {...register('name')} />
                {fieldError('name') && <p className="text-xs text-destructive">{fieldError('name')}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" placeholder="voce@email.com" {...register('email')} />
                {fieldError('email') && <p className="text-xs text-destructive">{fieldError('email')}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Senha</Label>
                <Input type="password" placeholder="Mínimo 8 caracteres" {...register('password')} />
                {fieldError('password') && <p className="text-xs text-destructive">{fieldError('password')}</p>}
              </div>
              {role === 'Artist' && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label>Cidade</Label>
                    <Input placeholder="São Paulo" {...register('city')} />
                    {fieldError('city') && <p className="text-xs text-destructive">{fieldError('city')}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>UF</Label>
                    <Input placeholder="SP" maxLength={2} {...register('state')} />
                    {fieldError('state') && <p className="text-xs text-destructive">{fieldError('state')}</p>}
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input placeholder="(11) 99999-9999" {...register('phone')} />
                {fieldError('phone') && <p className="text-xs text-destructive">{fieldError('phone')}</p>}
              </div>
            </div>
          )}

          {/* Passo 1 — Dados artísticos */}
          {role === 'Artist' && step === 1 && (
            <div className="space-y-3 rounded-xl border p-4">
              <p className="text-sm font-semibold">Dados artísticos</p>
              <div className="space-y-1.5">
                <Label>Nome artístico *</Label>
                <Input placeholder="Ex.: João Silva" {...register('artisticName')} />
                {fieldError('artisticName') && <p className="text-xs text-destructive">{fieldError('artisticName')}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={artistType} onValueChange={setArtistType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Solo">Solo</SelectItem>
                      <SelectItem value="Band">Banda/Grupo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria *</Label>
                  <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setCategoryTouched(true) }}>
                    <SelectTrigger className={cn(categoryTouched && !categoryId && 'border-amber-500')}>
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
                  {categoryTouched && !categoryId && (
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-500">Selecione a categoria</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navegação dos passos 0 e 1 (dentro do form para os campos registrados) */}
          {role === 'Artist' && step < ARTIST_STEPS.length - 1 && (
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep((s) => s - 1)}>
                  <ChevronLeft /> Voltar
                </Button>
              )}
              <Button type="button" className="flex-1" onClick={handleContinue} disabled={isSubmitting}>
                Continuar
              </Button>
            </div>
          )}

          {/* Contratante: formulário único com submit direto */}
          {role === 'Contractor' && (
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar conta'}
            </Button>
          )}
        </form>

        {/* Passo 2 — Estilo & eventos: FORA do <form>; cliques aqui nunca enviam o cadastro.
            O submit é disparado explicitamente pelo botão "Criar conta". */}
        {role === 'Artist' && step === 2 && (
          <div className="space-y-4">
            <div className="space-y-5 rounded-xl border p-4">
              <div>
                <p className="text-sm font-semibold">Estilo & eventos</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Opcional — você pode ajustar depois no perfil.</p>
              </div>
              <div>
                <Label className="mb-2">Estilos</Label>
                {categoryId ? (
                  <>
                    <ChipMultiSelect
                      options={styleOptions ?? []}
                      selected={styles}
                      onChange={setStyles}
                      addLabel="Adicionar outro estilo"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Sugestões para {categoryName}. Clique para selecionar; use “Adicionar” para estilos próprios.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Volte um passo e selecione a categoria para ver as sugestões.</p>
                )}
              </div>
              <div>
                <Label className="mb-2">Tipos de evento atendidos</Label>
                <ChipMultiSelect
                  options={EVENT_TYPES}
                  selected={eventTypes}
                  onChange={setEventTypes}
                  addLabel="Adicionar outro tipo"
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft /> Voltar
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={isSubmitting || !categoryId}
                onClick={() => handleSubmit(onSubmit)()}
              >
                {isSubmitting ? 'Criando...' : 'Criar conta'}
              </Button>
            </div>
          </div>
        )}

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
