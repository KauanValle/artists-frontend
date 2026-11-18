import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Ticket } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { extractApiError } from '@/services/api'

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
})
type LoginData = z.infer<typeof loginSchema>

/** Login do emissor de ingressos: o mesmo login da plataforma (artista ou contratante). */
export function TicketsLogin() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginData>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })

  const onSubmit = async (data: LoginData) => {
    setError('')
    try {
      const user = await login(data.email, data.password)
      toast.success(`Bem-vindo, ${user.displayName}!`)
      // Perfil incompleto: segue o mesmo fluxo do login normal.
      if (!user.perfilCompleto && user.role !== 'Admin') navigate('/completar-perfil', { replace: true })
    } catch (err) {
      setError(extractApiError(err))
    }
  }

  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-12 sm:py-20 lg:grid-cols-2 lg:gap-16">
      <div className="max-w-xl">
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
          <Ticket className="h-3.5 w-3.5" /> Emissor de ingressos
        </span>
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Venda ingressos dos seus{' '}
          <span className="bg-gradient-to-r from-violet-400 via-purple-500 to-violet-600 bg-clip-text text-transparent">
            eventos
          </span>
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Entre com a sua conta de artista ou contratante para cadastrar eventos e emitir ingressos.
        </p>
      </div>

      <div className="w-full max-w-sm justify-self-center rounded-2xl border border-border/50 bg-card/50 p-6 shadow-lg backdrop-blur-sm lg:justify-self-end">
        <div className="mb-5">
          <h2 className="text-xl font-bold">Entrar</h2>
          <p className="mt-1 text-sm text-muted-foreground">Artistas e contratantes acessam com a mesma conta</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tk-email">E-mail</Label>
            <Input id="tk-email" type="email" placeholder="voce@email.com" {...register('email')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tk-password">Senha</Label>
            <Input id="tk-password" type="password" placeholder="••••••••" {...register('password')} />
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
      </div>
    </section>
  )
}
