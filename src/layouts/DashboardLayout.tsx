import { useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
    BadgeCheck,
    CalendarDays,
    CalendarRange,
    ClipboardList,
    CreditCard, DollarSignIcon, GlassesIcon, Guitar,
    Heart,
    LayoutDashboard,
    LogOut,
    Megaphone,
    Menu,
    MessageSquare, MicIcon,
    Music,
    Newspaper,
    Package, PersonStandingIcon,
    Search,
    Settings,
    Star,
    TriangleAlert,
    Users,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { brandingApi, reviewsApi } from '@/services'
import { getMissingProfileFields, useMyArtist } from '@/hooks/useArtistProfile'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { BrandMark } from '@/components/ui/brand-logo'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { NotificationsMenu } from '@/components/NotificationsMenu'
import { cn } from '@/lib/utils'
import { SiteFooter } from '@/components/SiteFooter'
import { TutorialBox, useTutorialProgress, type TutorialStep } from '@/components/onboarding/TutorialBox'

const artistNav = [
  { to: '/artist/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/artist/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/artist/shows', label: 'Shows', icon: Megaphone },
  { to: '/avaliacoes', label: 'Avaliações', icon: Star },
  { to: '/artist/financeiro', label: 'Financeiro', icon: CreditCard },
  { to: '/artist/equipe', label: 'Equipe', icon: Users },
  { to: '/artist/equipamentos', label: 'Equipamentos', icon: Guitar },
  { to: '/artist/perfil', label: 'Meu Perfil', icon: Music },
  { to: '/artist/epk', label: 'Meu EPK', icon: Newspaper },
  { to: '/artist/configuracoes', label: 'Configurações', icon: Settings },
  // { to: '/artist/assinatura', label: 'Assinatura', icon: BadgeCheck },
]

// Conta gratuita: só dashboard e assinatura até o pagamento ser confirmado.
const freeArtistNav = [
  { to: '/artist/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/artist/assinatura', label: 'Assinatura', icon: CreditCard },
]

const contractorNav = [
  { to: '/contractor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/contractor/buscar', label: 'Buscar artistas', icon: Search },
  { to: '/contractor/solicitacoes', label: 'Solicitações', icon: ClipboardList },
  { to: '/contractor/eventos', label: 'Eventos', icon: CalendarRange },
  { to: '/avaliacoes', label: 'Avaliações', icon: Star },
  { to: '/contractor/favoritos', label: 'Favoritos', icon: Heart },
  { to: '/contractor/conversas', label: 'Conversas', icon: MessageSquare },
  { to: '/contractor/perfil', label: 'Meu perfil', icon: Settings },
]

// Passos do tutorial inicial do artista — o TutorialBox é reutilizável;
// o contratante ganhará sua própria lista com o mesmo componente.
const artistTutorialSteps: TutorialStep[] = [
  {
    id: 'perfil',
    title: 'Complete seu perfil',
    text: 'Seja bem-vindo! 🎉 Vamos ao primeiro passo: complete o seu perfil e publique ele.',
    href: '/artist/perfil',
    hrefLabel: 'Ir para o Meu Perfil',
  },
  {
    id: 'tour',
    title: 'Conheça cada tela',
    text: 'Agora, com o seu perfil criado, vamos conhecer cada tela do sistema. Marque cada passo quando terminar de explorar.',
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    text: 'Aqui mostra resumidamente seu financeiro, eventos e próximos eventos.',
    href: '/artist/dashboard',
    hrefLabel: 'Ir para o Dashboard',
  },
  {
    id: 'agenda',
    title: 'Agenda',
    text: 'Aqui mostra, em formato de agenda, todos os seus eventos confirmados.',
    href: '/artist/agenda',
    hrefLabel: 'Ir para a Agenda',
  },
  {
    id: 'shows',
    title: 'Shows',
    text: 'Aqui você vai fazer todo o gerenciamento das suas solicitações de show: aceitar, negar, negociar e cancelar.',
    href: '/artist/shows',
    hrefLabel: 'Ir para os Shows',
  },
  {
    id: 'avaliacoes',
    title: 'Avaliação',
    text: 'Aqui aparecem as avaliações que os contratantes deram para o seu evento.',
    href: '/avaliacoes',
    hrefLabel: 'Ir para Avaliações',
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    text: 'Aqui você verifica todos os seus recebimentos, inclui novos recebimentos e despesas para fazer o gerenciamento financeiro da sua carreira.',
    href: '/artist/financeiro',
    hrefLabel: 'Ir para o Financeiro',
  },
  {
    id: 'equipe',
    title: 'Equipe',
    text: 'Aqui você cadastra pessoas da sua equipe interna e externa; as externas entram como adicional no seu evento na hora da contratação.',
    href: '/artist/equipe',
    hrefLabel: 'Ir para a Equipe',
  },
  {
    id: 'equipamentos',
    title: 'Equipamentos',
    text: 'Aqui você cadastra equipamentos internos e externos; os externos entram como adicional no seu evento na hora da contratação.',
    href: '/artist/equipamentos',
    hrefLabel: 'Ir para Equipamentos',
  },
  {
    id: 'epk',
    title: 'Meu EPK',
    text: 'Aqui você configura suas informações e gera um Electronic Press Kit (EPK) totalmente público para divulgar seu trabalho para os contratantes.',
    href: '/artist/epk',
    hrefLabel: 'Ir para o Meu EPK',
  },
  {
    id: 'configuracoes',
    title: 'Configurações',
    text: 'Aqui você terá opções mais administrativas da sua conta.',
    href: '/artist/configuracoes',
    hrefLabel: 'Ir para Configurações',
  },
]

const adminNav = [
    { to: '/admin', label: 'Painel', icon: LayoutDashboard },
    { to: '/solicitacoes-anonimas', label: 'Solicitações Anonimas', icon: GlassesIcon },
    { to: '/eventos', label: 'Eventos', icon: MicIcon},
    { to: '/financeiro', label: 'Financeiro', icon: DollarSignIcon},
    { to: '/usuarios', label: 'Usuarios', icon: PersonStandingIcon},
]

function SidebarContent({
  nav,
  onNavigate,
}: {
  nav: { to: string; label: string; icon: typeof LayoutDashboard }[]
  onNavigate?: () => void
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { data: myArtist } = useMyArtist(user?.role === 'Artist')
  const missingProfileFields = user?.role === 'Artist' ? getMissingProfileFields(myArtist) : []

  // Contratante com shows concluídos aguardando avaliação → badge de alerta no menu.
  const isContractor = user?.role === 'Contractor'
  const { data: pendentes = [] } = useQuery({
    queryKey: ['reviews', 'pending'],
    queryFn: async () => (await reviewsApi.pending()).data,
    enabled: isContractor,
  })

  const handleLogout = () => {
    onNavigate?.()
    logout()
    navigate('/login')
  }
  const isSubscriber = user?.subscriptionTier === 'Assinante';
  

  return (
    <>
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <BrandMark />
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
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.to === '/avaliacoes' && isContractor && pendentes.length > 0 && (
              <span
                className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-amber-950"
                aria-label={`${pendentes.length} show${pendentes.length > 1 ? 's' : ''} aguardando avaliação`}
                title={`${pendentes.length} show${pendentes.length > 1 ? 's' : ''} aguardando avaliação`}
              >
                {pendentes.length > 9 ? '9+' : pendentes.length}
              </span>
            )}
            {item.to === '/artist/perfil' && missingProfileFields.length > 0 && (
              <span
                className="shrink-0"
                aria-label={`${missingProfileFields.length} campo${missingProfileFields.length > 1 ? 's' : ''} obrigatório${missingProfileFields.length > 1 ? 's' : ''} pendente${missingProfileFields.length > 1 ? 's' : ''}`}
                title={`Campos obrigatórios pendentes: ${missingProfileFields.map((f) => f.label).join(', ')}`}
              >
                <TriangleAlert className="h-4 w-4 text-amber-500" />
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t p-3">
        <div className="flex items-center gap-2 px-1 py-2">
          <Avatar alt={myArtist?.artisticName} className="h-8 w-8" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{myArtist?.artisticName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.role === 'Artist' ? 'Artista' : user?.role === 'Admin' ? 'Administrador' : 'Contratante'} | {isSubscriber ? 'Assinante' : 'Gratuito'}
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
  const tutorialArtista = useTutorialProgress('reprissa.tutorial.artista', artistTutorialSteps)
  // Feature flag (AppSettings → /api/branding): assinatura desligada = acesso livre.
  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: async () => (await brandingApi.get()).data,
  })
  const assinaturaObrigatoria = branding?.assinaturaObrigatoria ?? false
  const isFreeArtist = user?.role === 'Artist' && user.subscriptionTier === 'Gratuito' && assinaturaObrigatoria
  const navBase = !user
    ? artistNav
    : user.role === 'Admin'
      ? adminNav
      : user.role === 'Contractor'
        ? contractorNav
        : isFreeArtist
          ? freeArtistNav
          : artistNav

  // Tutorial do artista em andamento → o menu lateral revela os itens conforme
  // os passos liberam: só aparecem as telas dos passos concluídos e do passo atual.
  const nav = useMemo(() => {
    if (navBase !== artistNav || !tutorialArtista?.state || tutorialArtista.state.done) return navBase
    const atualIdx = artistTutorialSteps.findIndex((s) => !tutorialArtista.state.checked.includes(s.id))
    const liberados = new Set(
      artistTutorialSteps.filter((s, i) => i <= atualIdx && s.href).map((s) => s.href as string)
    )
    return navBase.filter((item) => liberados.has(item.to))
  }, [navBase, tutorialArtista])

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
            <BrandMark />
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationsMenu />
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
        <SiteFooter compact />
      </div>
      {user?.role === 'Artist' && (
        <TutorialBox title="Bem-vindo ao Reprissa!" steps={artistTutorialSteps} progress={tutorialArtista} />
      )}
    </div>
  )
}
