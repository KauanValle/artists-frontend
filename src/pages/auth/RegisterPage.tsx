import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { extractApiError } from '@/services/api'
import { GoogleLogin, googleClientIdConfigurado } from '@/components/google-button'

const schema = z.object({
  name: z.string().min(2, 'Informe seu nome'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Mínimo de 8 caracteres'),
})

/**
 * Cadastro unificado: só identidade (nome, e-mail, senha). Depois de criar a
 * conta o usuário é levado a "Completar o seu perfil" (artista ou contratante).
 */
export function RegisterPage() {
  const { register: criarConta } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  // Pré-preenchimento via link gerado no admin (contratante visitante → cadastro)
  const prefillName = searchParams.get('nome') ?? ''

  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, string>>({
    defaultValues: { name: prefillName },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
  })

  const onSubmit = async (data: Record<string, string>) => {
    setError('')
    try {
      await criarConta({ name: data.name, email: data.email, password: data.password })
      toast.success('Conta criada! Agora complete o seu perfil.')
      navigate('/completar-perfil')
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
          <p className="mt-1 text-sm text-muted-foreground">
            Comece com o básico — depois você escolhe seu perfil
          </p>
        </div>

        {prefillName && (
          <div className="mb-4 rounded-md border border-emerald-500/60 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-200">
            Reconhecemos os dados da sua contratação — só falta criar a conta!
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-3 rounded-xl border p-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
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
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Criando...' : 'Criar conta'}
          </Button>
        </form>

        {googleClientIdConfigurado && (
          <>
            <div className="mt-4 mb-4 flex w-full items-center gap-4">
              <div className="h-px flex-1 bg-[#D1D5DB]" />
              <span className="text-sm font-normal text-[#111827]">
                <p className="text-muted-foreground">Ou</p>
              </span>
              <div className="h-px flex-1 bg-[#D1D5DB]" />
            </div>
            <div className="flex w-full items-center justify-center gap-4">
              <GoogleLogin />
            </div>
          </>
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
