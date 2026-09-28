import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  CalendarRange,
  ClipboardList,
  CreditCard,
  Heart,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Music,
  Package,
  Search,
  Settings,
  Users,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { NotificationsMenu } from '@/components/NotificationsMenu'
import { cn } from '@/lib/utils'

const artistNav = [
  { to: '/artist/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/artist/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/artist/shows', label: 'Shows', icon: Megaphone },
  { to: '/artist/financeiro', label: 'Financeiro', icon: CreditCard },
  { to: '/artist/equipe', label: 'Equipe', icon: Users },
  { to: '/artist/equipamentos', label: 'Equipamentos', icon: Package },
  { to: '/artist/perfil', label: 'Meu Perfil', icon: Music },
  { to: '/artist/configuracoes', label: 'Configurações', icon: Settings },
]

const contractorNav = [
  { to: '/contractor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/contractor/buscar', label: 'Buscar artistas', icon: Search },
  { to: '/contractor/solicitacoes', label: 'Solicitações', icon: ClipboardList },
  { to: '/contractor/eventos', label: 'Eventos', icon: CalendarRange },
  { to: '/contractor/favoritos', label: 'Favoritos', icon: Heart },
  { to: '/contractor/conversas', label: 'Conversas', icon: MessageSquare },
  { to: '/contractor/perfil', label: 'Meu perfil', icon: Settings },
]

const adminNav = [{ to: '/admin', label: 'Painel', icon: LayoutDashboard }]

function SidebarContent({
  nav,
  onNavigate,
}: {
  nav: { to: string; label: string; icon: typeof LayoutDashboard }[]
  onNavigate?: () => void
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    onNavigate?.()
    logout()
    navigate('/login')
  }

  return (
    <>
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">🎤</span>
        <span className="text-base font-bold">Artist Platform</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                isActive && 'bg-accent text-accent-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t p-3">
        <div className="flex items-center gap-2 px-1 py-2">
          <Avatar alt={user?.displayName} className="h-8 w-8" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.displayName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.role === 'Artist' ? 'Artista' : user?.role === 'Admin' ? 'Administrador' : 'Contratante'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  )
}

export function DashboardLayout() {
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const nav = user?.role === 'Artist' ? artistNav : user?.role === 'Admin' ? adminNav : contractorNav

  return (
    <div className="min-h-screen bg-secondary/40">
      {/* Sidebar fixa apenas em telas grandes */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r bg-background lg:flex">
        <SidebarContent nav={nav} />
      </aside>

      {/* Drawer no mobile */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col border-r bg-background shadow-xl">
            <SidebarContent nav={nav} onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-col lg:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b bg-background/95 px-4 backdrop-blur lg:justify-end lg:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <Button variant="ghost" size="icon" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
              <Menu className="h-5 w-5" />
            </Button>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">🎤</span>
            <span className="text-sm font-bold">Artist Platform</span>
          </div>
          <NotificationsMenu />
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
