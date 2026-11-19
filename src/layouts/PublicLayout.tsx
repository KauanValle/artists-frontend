import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import {
  CalendarPlus,
  ChevronDown,
  Compass,
  LayoutGrid,
  LogOut,
  Menu,
  Mic2,
  PackageSearch,
  Search,
  Megaphone,
  Sparkles,
  Ticket,
  X,
  type LucideIcon,
} from 'lucide-react'
import { BrandMark } from '@/components/ui/brand-logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { homePathFor } from '@/lib/utils'
import { SiteFooter } from '@/components/SiteFooter'

const menuItemClass =
  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-accent'

/** Links que rolam até uma seção da página inicial. */
const ANCHORS: { to: string; label: string }[] = []

interface NavDropdownItem {
  to: string
  label: string
  icon: LucideIcon
}

/** Item de menu da navegação central com dropdown: abre ao passar o mouse/clicar; fecha ao clicar fora ou com Esc. */
function NavDropdown({ label, items }: { label: string; items: NavDropdownItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fecha com pequeno atraso: dá tempo de o mouse atravessar o vão até o painel.
  const show = () => {
    if (timer.current) clearTimeout(timer.current)
    setOpen(true)
  }
  const hideSoon = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpen(false), 250)
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
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

  return (
    <div ref={ref} className="relative" onMouseEnter={show} onMouseLeave={hideSoon} onFocus={show} onBlur={hideSoon}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={show}
        className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        {label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        // pt-2 cria uma ponte invisível entre o botão e o painel para o hover não "cair" no vão
        <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3">
          <div role="menu" className="w-72 rounded-lg border bg-card p-1 shadow-lg">
            {items.map(({ to, label: itemLabel, icon: Icon }) => (
              <Link key={itemLabel} to={to} role="menuitem" onClick={() => setOpen(false)} className={menuItemClass}>
                <Icon className="h-4 w-4 shrink-0 text-primary" /> {itemLabel}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function PublicLayout() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  // Destino de "Gestão de carreira": logado vai ao próprio painel; visitante vai criar a conta.
  const careerPath = isAuthenticated && user ? homePathFor(user.role) : '/register'

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
      <header className="relative z-50 border-b">
        <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <BrandMark />
          </Link>

          {/* Desktop: links centralizados */}
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 xl:flex">
            <NavDropdown
              label="Produtos"
              items={[
                { to: '/eventos', label: 'Eventos', icon: Ticket },
                { to: '/eventos/painel', label: 'Criador de evento', icon: CalendarPlus },
                { to: careerPath, label: 'Gestão de carreira para artistas', icon: Mic2 },
              ]}
            />
            <NavDropdown
              label="Funcionalidades"
              items={[
                { to: '/artistas', label: 'Buscar artistas', icon: Search },
                { to: '/acompanhar-pedidos', label: 'Acompanhar pedidos', icon: PackageSearch },
              ]}
            />
            <Link to="/campanhas" className="whitespace-nowrap text-sm font-medium text-muted-foreground hover:text-foreground">
              Campanhas
            </Link>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />


            {/* Desktop: entrar / criar conta (ou painel / sair) */}
            <div className="hidden items-center gap-1 xl:flex xl:gap-2">
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
            <div ref={menuRef} className="relative xl:hidden">
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
                  className="absolute right-0 z-50 mt-2 w-72 rounded-lg border bg-card p-1 shadow-lg"
                >
                  <p className="flex items-center gap-2 px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <LayoutGrid className="h-3.5 w-3.5" /> Produtos
                  </p>
                  <Link to="/eventos" role="menuitem" onClick={close} className={`${menuItemClass} pl-8`}>
                    <Ticket className="h-4 w-4 shrink-0 text-primary" /> Eventos
                  </Link>
                  <Link to="/eventos/painel" role="menuitem" onClick={close} className={`${menuItemClass} pl-8`}>
                    <CalendarPlus className="h-4 w-4 shrink-0 text-primary" /> Criador de evento
                  </Link>
                  <Link to={careerPath} role="menuitem" onClick={close} className={`${menuItemClass} pl-8`}>
                    <Mic2 className="h-4 w-4 shrink-0 text-primary" /> Gestão de carreira para artistas
                  </Link>
                  <div className="my-1 border-t" />
                  <p className="flex items-center gap-2 px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5" /> Funcionalidades
                  </p>
                  <Link to="/artistas" role="menuitem" onClick={close} className={`${menuItemClass} pl-8`}>
                    <Search className="h-4 w-4 shrink-0 text-primary" /> Buscar artistas
                  </Link>
                  <Link to="/acompanhar-pedidos" role="menuitem" onClick={close} className={`${menuItemClass} pl-8`}>
                    <PackageSearch className="h-4 w-4 shrink-0 text-primary" /> Acompanhar pedidos
                  </Link>

                  <div className="my-1 border-t" />
                  <Link to="/campanhas" role="menuitem" onClick={close} className={menuItemClass}>
                    <Megaphone className="h-4 w-4 shrink-0 text-primary" /> Campanhas
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
