import { Link, Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { BrandMark } from '@/components/ui/brand-logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { homePathFor } from '@/lib/utils'
import { SiteFooter } from '@/components/SiteFooter'

export function PublicLayout() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Link to="/artistas" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline">
              Buscar artistas
            </Link>

            {isLoading ? null : isAuthenticated && user ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-medium"
                  onClick={() => navigate(homePathFor(user.role))}
                  title="Ir para o meu painel"
                >
                  {user.displayName}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    logout()
                    navigate('/login')
                  }}
                >
                  <LogOut className="h-4 w-4" /> Sair
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  Entrar
                </Link>
                <Link
                  to="/register"
                  className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:px-4"
                >
                  Criar conta
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <Outlet />
      <SiteFooter />
    </div>
  )
}
