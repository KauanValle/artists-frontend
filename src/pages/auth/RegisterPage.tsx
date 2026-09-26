import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import { artistsApi } from '@/services'
import { extractApiError } from '@/services/api'

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

export function RegisterPage() {
  const { registerArtist, registerContractor } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState<'Artist' | 'Contractor'>('Contractor')
  const [artistType, setArtistType] = useState('Solo')
  const [categoryId, setCategoryId] = useState('')
  const [error, setError] = useState('')

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await artistsApi.categories()).data,
  })

  const schema = role === 'Artist' ? artistSchema : contractorSchema
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Record<string, string>>({
    // Registro tem dois formatos (artista/contratante); validação fina é feita pelo schema escolhido.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
  })

  const onSubmit = async (data: Record<string, string>) => {
    setError('')
    try {
      if (role === 'Artist') {
        await registerArtist({ ...data, artistType, categoryId })
        toast.success('Conta criada! Complete seu perfil para aparecer no marketplace.')
        navigate('/artist/perfil')
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
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-10">
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nome {role === 'Artist' ? '(responsável)' : ''}</Label>
              <Input placeholder="Seu nome" {...register('name')} />
              {fieldError('name') && <p className="text-xs text-destructive">{fieldError('name')}</p>}
            </div>
            {role === 'Artist' ? (
              <div className="space-y-1.5">
                <Label>Nome artístico</Label>
                <Input placeholder="Ex.: João Silva" {...register('artisticName')} />
                {fieldError('artisticName') && <p className="text-xs text-destructive">{fieldError('artisticName')}</p>}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input placeholder="(11) 99999-9999" {...register('phone')} />
              </div>
            )}
          </div>

          {role === 'Artist' && (
            <>
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
                  <Label>Categoria</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
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
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input placeholder="(11) 99999-9999" {...register('phone')} />
                {fieldError('phone') && <p className="text-xs text-destructive">{fieldError('phone')}</p>}
              </div>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting || (role === 'Artist' && !categoryId)}>
            {isSubmitting ? 'Criando...' : 'Criar conta'}
          </Button>
        </form>

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
