import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { authApi } from '@/services'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authApi.forgotPassword(email)
      setToken(data.token)
      setSent(true)
    } catch {
      toast.error('Não foi possível processar a solicitação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Recuperar senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Informe seu e-mail para receber o código de recuperação
          </p>
        </div>
        {sent ? (
          <div className="space-y-4 rounded-lg border bg-card p-4 text-sm">
            <p className="text-muted-foreground">
              Se o e-mail estiver cadastrado, um token de recuperação foi gerado.
            </p>
            {token && (
              <div className="space-y-1">
                <p className="text-xs font-medium">Token (modo desenvolvimento):</p>
                <code className="block break-all rounded bg-muted p-2 text-xs">{token}</code>
              </div>
            )}
            <Button
              asChild
              className="w-full"
              onClick={() => {
                if (token) sessionStorage.setItem('resetToken', token)
              }}
            >
              <Link to="/reset-password">Continuar</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar'}
            </Button>
          </form>
        )}
        <p className="mt-4 text-center text-sm">
          <Link to="/login" className="text-muted-foreground hover:text-foreground">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  )
}
