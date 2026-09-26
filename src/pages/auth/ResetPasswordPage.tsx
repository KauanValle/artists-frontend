import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { authApi } from '@/services'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { extractApiError } from '@/services/api'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [token, setToken] = useState(() => sessionStorage.getItem('resetToken') ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.resetPassword({ email, token, newPassword })
      sessionStorage.removeItem('resetToken')
      toast.success('Senha redefinida! Faça login com a nova senha.')
      navigate('/login')
    } catch (err) {
      setError(extractApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Redefinir senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">Informe o token recebido e a nova senha</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Token</Label>
            <Input value={token} onChange={(e) => setToken(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Nova senha</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Redefinindo...' : 'Redefinir senha'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link to="/login" className="text-muted-foreground hover:text-foreground">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  )
}
