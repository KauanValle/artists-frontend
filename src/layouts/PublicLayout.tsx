import { Link, Outlet } from 'react-router-dom'

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">🎤</span>
            <span className="hidden text-base font-bold sm:inline">Artist Platform</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
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
        Artist Platform — O sistema operacional da carreira do artista
      </footer>
    </div>
  )
}
