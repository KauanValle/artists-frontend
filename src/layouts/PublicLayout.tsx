import { Link, Outlet } from 'react-router-dom'
import { BrandMark } from '@/components/ui/brand-logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-background">
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
            <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Entrar
            </Link>
            <Link
              to="/register"
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:px-4"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </header>
      <Outlet />
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        reprissa — conectando talentos a oportunidades
      </footer>
    </div>
  )
}
