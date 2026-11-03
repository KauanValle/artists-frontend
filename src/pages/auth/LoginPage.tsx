import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { homePathFor } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { extractApiError } from '@/services/api'
import {GoogleLogin} from "@/components/google-button.tsx";

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const { login, user, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')

  // Já autenticado? Nada a fazer aqui — vai direto para o painel.
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) navigate(homePathFor(user.role), { replace: true })
  }, [isAuthenticated, isLoading, user, navigate])

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      const user = await login(data.email, data.password)
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
      toast.success(`Bem-vindo, ${user.displayName}!`)
      navigate(from ?? homePathFor(user.role), { replace: true })
    } catch (err) {
      setError(extractApiError(err))
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Entrar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acesse sua conta na reprissa</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="voce@email.com" {...register('email')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
        <div className="mt-4 flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground">
            Esqueci a senha
          </Link>
          <Link to="/register" className="font-medium text-primary hover:underline">
            Criar conta
          </Link>
        </div>
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
      </div>
    </div>
  )
}
