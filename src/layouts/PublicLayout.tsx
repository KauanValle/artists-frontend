import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { LayoutGrid, LogOut, Menu, PackageSearch, Search, X } from 'lucide-react'
import { BrandMark } from '@/components/ui/brand-logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { homePathFor } from '@/lib/utils'
import { SiteFooter } from '@/components/SiteFooter'

const menuItemClass =
  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-accent'

export function PublicLayout() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // fecha o menu mobile ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <BrandMark />
          </Link>

          {/* Desktop: links centralizados */}
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 lg:flex">
            <Link
              to="/#produtos"
              className="whitespace-nowrap text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Nossos Produtos
            </Link>
            <Link
              to="/artistas"
              className="whitespace-nowrap text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Buscar artistas
            </Link>
            <Link
              to="/acompanhar-pedidos"
              className="whitespace-nowrap text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Acompanhar pedidos
            </Link>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />

            {/* Desktop: entrar / criar conta (ou painel / sair) */}
            <div className="hidden items-center gap-1 lg:flex lg:gap-2">
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
                  <Link to="/login" className="mr-2 text-sm font-medium text-muted-foreground hover:text-foreground">
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

            {/* Mobile: menu hambúrguer */}
            <div ref={menuRef} className="relative lg:hidden">
              <button
                type="button"
                aria-label="Menu"
                aria-expanded={open}
                aria-haspopup="menu"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-accent"
              >
                {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>

              {open && (
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-56 rounded-lg border bg-card p-1 shadow-lg"
                >
                  <Link to="/#produtos" role="menuitem" onClick={close} className={menuItemClass}>
                    <LayoutGrid className="h-4 w-4 text-primary" /> Nossos Produtos
                  </Link>
                  <Link to="/artistas" role="menuitem" onClick={close} className={menuItemClass}>
                    <Search className="h-4 w-4 text-primary" /> Buscar artistas
                  </Link>
                  <Link to="/acompanhar-pedidos" role="menuitem" onClick={close} className={menuItemClass}>
                    <PackageSearch className="h-4 w-4 text-primary" /> Acompanhar pedidos
                  </Link>

                  <div className="my-1 border-t" />

                  {isLoading ? null : isAuthenticated && user ? (
                    <>
                      <button
                        type="button"
                        role="menuitem"
                        className={menuItemClass}
                        title="Ir para o meu painel"
                        onClick={() => {
                          close()
                          navigate(homePathFor(user.role))
                        }}
                      >
                        {user.displayName}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className={menuItemClass}
                        onClick={() => {
                          close()
                          logout()
                          navigate('/login')
                        }}
                      >
                        <LogOut className="h-4 w-4" /> Sair
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" role="menuitem" onClick={close} className={menuItemClass}>
                        Entrar
                      </Link>
                      <Link
                        to="/register"
                        role="menuitem"
                        onClick={close}
                        className="mt-1 block rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
                      >
                        Criar conta
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <Outlet />
      <SiteFooter />
    </div>
  )
}
