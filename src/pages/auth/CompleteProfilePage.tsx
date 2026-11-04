import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Check, ChevronLeft, Mic2, User, Wallet } from 'lucide-react'
import { artistsApi, perfilApi } from '@/services'
import { useAuth } from '@/hooks/useAuth'
import { homePathFor } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChipMultiSelect } from '@/components/ui/chip-multi-select'
import { EVENT_TYPES, styleOptionsForCategory } from '@/lib/artistOptions'
import { extractApiError } from '@/services/api'
import { cn } from '@/lib/utils'

const baseSchema = {
  city: z.string().min(2, 'Informe a cidade'),
  state: z.string().length(2, 'UF com 2 letras'),
  phone: z.string().min(8, 'Informe o telefone'),
  cpf: z.string().min(11, 'CPF inválido').max(14, 'CPF inválido'),
  cep: z.string().min(8, 'CEP inválido').max(9, 'CEP inválido'),
}

const artistSchema = z.object({ ...baseSchema })
const contractorSchema = z.object({
  ...baseSchema,
  companyName: z.string().optional(),
})

// Passos do artista: poucos campos por cartão (nome/e-mail já vieram do cadastro).
const ARTIST_STEPS = [
  { title: 'Informações básicas', icon: User, fields: ['phone', 'cpf', 'cep', 'city', 'state'] },
  { title: 'Dados artísticos', icon: Mic2, fields: ['artisticName'] },
  { title: 'Estilo & eventos', icon: Wallet, fields: [] },
]

type Perfil = 'Artista' | 'Contratante' | null

/**
 * "Completar o seu perfil" — segunda etapa do cadastro unificado. O usuário
 * escolhe Artista ou Contratante e preenche os dados do perfil; ao concluir,
 * o backend reemite o token com o papel definitivo.
 */
export function CompleteProfilePage() {
  const { user, isAuthenticated, isLoading: authLoading, applySession } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [perfil, setPerfil] = useState<Perfil>(null)
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

  const categoryName = categories.find((c) => c.id === categoryId)?.name
  const styleOptions = styleOptionsForCategory(categoryName)

  const schema = perfil === 'Contratante' ? contractorSchema : artistSchema
  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, string>>({
    resolver: zodResolver(schema) as never,
    shouldUnregister: false, // campos desmontados (passos anteriores) mantêm o valor
  })

  const fieldError = (name: string) => errors[name]?.message as string | undefined

  // Sem sessão → login (volta aqui). Perfil já concluído → área logada.
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { state: { from: { pathname: location.pathname } }, replace: true })
    }
  }, [authLoading, isAuthenticated, navigate, location.pathname])

  useEffect(() => {
    if (!user || authLoading) return
    if (user.perfilCompleto) navigate(homePathFor(user.role), { replace: true })
  }, [user, authLoading, navigate])

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

  const concluir = async (data: Record<string, string>) => {
    setError('')
    try {
      // getValues cobre campos de passos anteriores (desmontados na troca de passo).
      const valores = getValues()
      const payload =
        perfil === 'Artista'
          ? {
              tipo: 'Artista',
              artistType,
              categoryId,
              styles,
              eventTypes,
              artisticName: data.artisticName ?? valores.artisticName,
              city: data.city ?? valores.city,
              state: data.state ?? valores.state,
              phone: data.phone ?? valores.phone,
              cpf: data.cpf ?? valores.cpf,
              cep: data.cep ?? valores.cep,
            }
          : {
              tipo: 'Contratante',
              companyName: data.companyName || valores.companyName || null,
              city: data.city ?? valores.city,
              state: data.state ?? valores.state,
              phone: data.phone ?? valores.phone,
              cpf: data.cpf ?? valores.cpf,
              cep: data.cep ?? valores.cep,
            }

      const { data: auth } = await perfilApi.completar(payload)
      applySession({
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        expiresAtUtc: auth.expiresAtUtc,
        user: auth.user,
      })
      toast.success('Perfil completo! Bem-vindo(a) à reprissa.')
      if (auth.user.role === 'Artist') navigate('/artist/dashboard')
      else {
        const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
        navigate(from ?? '/contractor/dashboard')
      }
    } catch (err) {
      setError(extractApiError(err))
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // ─────────────── Passo 0 — escolha do perfil ───────────────
  if (!perfil) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Completar o seu perfil</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Olá{user ? `, ${user.displayName}` : ''}! Como você vai usar a reprissa?
          </p>
        </div>
        <div className="grid gap-4">
          <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setPerfil('Artista')}>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/15 text-violet-500">
                <Mic2 className="h-6 w-6" />
              </span>
              <span>
                <p className="font-semibold">Sou artista</p>
                <p className="text-sm text-muted-foreground">
                  Publico meu perfil, recebo solicitações e gerencio shows e agenda.
                </p>
              </span>
            </CardContent>
          </Card>
          <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setPerfil('Contratante')}>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/15 text-violet-500">
                <User className="h-6 w-6" />
              </span>
              <span>
                <p className="font-semibold">Sou contratante</p>
                <p className="text-sm text-muted-foreground">
                  Busco artistas, solicito contratações e acompanho meus eventos.
                </p>
              </span>
            </CardContent>
          </Card>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Errou a conta?{' '}
          <Link to="/login" className="text-primary hover:underline" onClick={() => {
            // sair da conta recém-criada para entrar com outra
            toast.info('Use "Encerrar sessão" após entrar para trocar de conta.')
          }}>
            Entrar com outra conta
          </Link>
        </p>
      </div>
    )
  }

  // ─────────────── Formulários de conclusão ───────────────
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-start justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Completar o seu perfil</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {perfil === 'Artista' ? 'Conta de artista' : 'Conta de contratante'}
          </p>
        </div>

        {perfil === 'Artista' && (
          <>
            <ol className="mb-4 flex items-center justify-between gap-2">
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
                      {s.title ?? null}
                    </span>
                    {index < ARTIST_STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
                  </li>
                )
              })}
            </ol>
            <p className="mb-4 text-center text-xs text-muted-foreground">
              Passo {step + 1} de {ARTIST_STEPS.length} — {ARTIST_STEPS[step].title}
            </p>
          </>
        )}

        <form onSubmit={handleSubmit(concluir)} className="space-y-4">
          {(perfil === 'Contratante' || step === 0) && (
          <div className="space-y-3 rounded-xl border p-4">
            <p className="text-sm font-semibold">Informações básicas</p>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input placeholder="(11) 99999-9999" {...register('phone')} />
              {fieldError('phone') && <p className="text-xs text-destructive">{fieldError('phone')}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>CPF</Label>
                <Input placeholder="000.000.000-00" {...register('cpf')} />
                {fieldError('cpf') && <p className="text-xs text-destructive">{fieldError('cpf')}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>CEP</Label>
                <Input placeholder="00000-000" {...register('cep')} />
                {fieldError('cep') && <p className="text-xs text-destructive">{fieldError('cep')}</p>}
              </div>
            </div>
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
            {perfil === 'Contratante' && (
              <div className="space-y-1.5">
                <Label>Empresa (opcional)</Label>
                <Input placeholder="Nome da empresa" {...register('companyName')} />
              </div>
            )}
          </div>
          )}

          {perfil === 'Artista' && step === 1 && (
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
                  <Select
                    value={categoryId}
                    onValueChange={(v) => {
                      setCategoryId(v)
                      setCategoryTouched(true)
                    }}
                  >
                    <SelectTrigger className={cn(categoryTouched && !categoryId && 'border-amber-500')}>
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
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

          {/* Navegação dos passos 0 e 1 (dentro do form para registrar os campos) */}
          {perfil === 'Artista' && step < ARTIST_STEPS.length - 1 && (
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep((s) => s - 1)}>
                  <ChevronLeft /> Voltar
                </Button>
              )}
                {step === 0 && (
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setPerfil(null)}>
                        <ChevronLeft /> Voltar
                    </Button>
                )}
              <Button type="button" className="flex-1" onClick={handleContinue} disabled={isSubmitting}>
                Continuar
              </Button>
                
            </div>
          )}

          {perfil === 'Contratante' && (
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Concluindo...' : 'Concluir perfil'}
            </Button>
          )}
        </form>

        {/* Passo 2 — Estilo & eventos: fora do <form> para não enviar o cadastro */}
        {perfil === 'Artista' && step === 2 && (
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
                      Sugestões para {categoryName}. Clique para selecionar; use "Adicionar" para estilos próprios.
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
                onClick={() => handleSubmit(concluir)()}
              >
                {isSubmitting ? 'Concluindo...' : 'Concluir perfil'}
              </Button>
            </div>
          </div>
        )}

        {perfil === 'Contratante' && error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
