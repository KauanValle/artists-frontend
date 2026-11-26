import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
    BadgeCheck,
    CalendarDays,
    CalendarRange,
    ClipboardList,
    ChevronDown,
    CreditCard, DollarSignIcon, Ellipsis, GlassesIcon, Guitar,
    Heart,
    LayoutDashboard,
    LogOut,
    Megaphone,
    MessageSquare, MicIcon,
    Music,
    Newspaper,
    Package, PersonStandingIcon,
    Search,
    Settings,
    Star,
    TriangleAlert,
    Users,
    UserPlus,
    Wallet,
    Ticket,
    Link2,
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

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard }
type NavGroup = { label: string; icon: typeof LayoutDashboard; children: NavItem[] }
type NavEntry = NavItem | NavGroup
function isNavGroup(entry: NavEntry): entry is NavGroup { return 'children' in entry }

const artistNav: NavEntry[] = [
  { to: '/artist/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    label: 'Eventos',
    icon: Megaphone,
    children: [
      { to: '/artist/shows', label: 'Shows', icon: Megaphone },
      { to: '/artist/agenda', label: 'Agenda', icon: CalendarDays },
      { to: '/avaliacoes', label: 'Avaliações', icon: Star },
      { to: '/artist/conversas', label: 'Conversas', icon: MessageSquare },
    ],
  },
  {
    label: 'Financeiro',
    icon: CreditCard,
    children: [
      { to: '/artist/financeiro', label: 'Financeiro', icon: CreditCard },
      { to: '/artist/saque', label: 'Saque', icon: Wallet },
    ],
  },
  { to: '/artist/indicacoes', label: 'Indicações', icon: UserPlus },
  { to: '/artist/equipe', label: 'Equipe', icon: Users },
  { to: '/artist/equipamentos', label: 'Equipamentos', icon: Guitar },
  { to: '/artist/perfil', label: 'Meu Perfil', icon: Music },
  { to: '/artist/epk', label: 'Meu EPK', icon: Newspaper },
  { to: '/artist/configuracoes', label: 'Configurações', icon: Settings },
  // { to: '/artist/assinatura', label: 'Assinatura', icon: BadgeCheck },
]

// Conta gratuita: só dashboard e assinatura até o pagamento ser confirmado.
const freeArtistNav: NavEntry[] = [
  { to: '/artist/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/artist/assinatura', label: 'Assinatura', icon: CreditCard },
]

const contractorNav: NavEntry[] = [
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

const adminNav: NavEntry[] = [
    { to: '/admin', label: 'Painel', icon: LayoutDashboard },
    { to: '/eventos', label: 'Eventos', icon: MicIcon },
    { to: '/admin/ingressos', label: 'Ingressos', icon: Ticket },
    { to: '/financeiro', label: 'Financeiro', icon: DollarSignIcon },
    { to: '/admin/saques', label: 'Solicitação de Saque', icon: Wallet },
    { to: '/admin/campanhas', label: 'Campanhas', icon: Megaphone },
    { to: '/admin/links-pagamento', label: 'Link de Pagamento', icon: Link2 },
    { to: '/usuarios', label: 'Usuarios', icon: PersonStandingIcon },
]

function SidebarNavItem({
  item,
  onNavigate,
  pendentes,
  isContractor,
  missingProfileFields,
}: {
  item: NavItem
  onNavigate?: () => void
  pendentes: unknown[]
  isContractor: boolean
  missingProfileFields: { label: string }[]
}) {
  return (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === '/admin'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/10 hover:text-white',
          isActive && 'bg-primary/20 text-white'
        )
      }
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.to === '/avaliacoes' && isContractor && pendentes.length > 0 && (
        <span
          className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/90 px-1.5 text-[11px] font-bold text-amber-950"
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
          <TriangleAlert className="h-4 w-4 text-amber-400" />
        </span>
      )}
    </NavLink>
  )
}

function SidebarNavGroup({
  group,
  onNavigate,
  pendentes,
  isContractor,
  missingProfileFields,
}: {
  group: NavGroup
  onNavigate?: () => void
  pendentes: unknown[]
  isContractor: boolean
  missingProfileFields: { label: string }[]
}) {
  const location = useLocation()
  const isChildActive = group.children.some((child) => location.pathname.startsWith(child.to))
  const [open, setOpen] = useState(isChildActive)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/10 hover:text-white',
          isChildActive && 'text-white'
        )}
      >
        <group.icon className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">{group.label}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          open ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="ml-4 space-y-0.5 border-l border-white/10 pl-2 pt-1">
          {group.children.map((child) => (
            <SidebarNavItem
              key={child.to}
              item={child}
              onNavigate={onNavigate}
              pendentes={pendentes}
              isContractor={isContractor}
              missingProfileFields={missingProfileFields}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function SidebarContent({
  nav,
  onNavigate,
}: {
  nav: NavEntry[]
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
        {nav.map((entry, i) =>
          isNavGroup(entry) ? (
            <SidebarNavGroup
              key={entry.label}
              group={entry}
              onNavigate={onNavigate}
              pendentes={pendentes}
              isContractor={isContractor}
              missingProfileFields={missingProfileFields}
            />
          ) : (
            <SidebarNavItem
              key={entry.to}
              item={entry}
              onNavigate={onNavigate}
              pendentes={pendentes}
              isContractor={isContractor}
              missingProfileFields={missingProfileFields}
            />
          )
        )}
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

/* ── Bottom tab bar (mobile only) ── */
const artistBottomTabs = [
  { to: '/artist/dashboard', label: 'Início', icon: LayoutDashboard },
  { to: '/artist/shows', label: 'Shows', icon: Megaphone },
  { to: '/artist/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/artist/financeiro', label: 'Financeiro', icon: CreditCard },
]

const contractorBottomTabs = [
  { to: '/contractor/dashboard', label: 'Início', icon: LayoutDashboard },
  { to: '/contractor/buscar', label: 'Buscar', icon: Search },
  { to: '/contractor/solicitacoes', label: 'Solicitações', icon: ClipboardList },
  { to: '/contractor/conversas', label: 'Conversas', icon: MessageSquare },
]

const adminBottomTabs = [
  { to: '/admin', label: 'Painel', icon: LayoutDashboard },
  { to: '/solicitacoes-anonimas', label: 'Solicitações', icon: GlassesIcon },
  { to: '/eventos', label: 'Eventos', icon: MicIcon },
  { to: '/financeiro', label: 'Financeiro', icon: DollarSignIcon },
]

function BottomTabBar({
  tabs,
  onMoreClick,
}: {
  tabs: { to: string; label: string; icon: typeof LayoutDashboard }[]
  onMoreClick: () => void
}) {
  const location = useLocation()
  const moreActive = !tabs.some((t) => location.pathname.startsWith(t.to))

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0d0a1a]/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="flex h-14 items-stretch">
        {tabs.map((item) => {
          const active = location.pathname.startsWith(item.to)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex flex-1 flex-col items-center justify-center gap-0.5"
            >
              <item.icon className={cn('h-5 w-5', active ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn('text-[10px] font-medium', active ? 'text-primary' : 'text-muted-foreground')}>
                {item.label}
              </span>
            </NavLink>
          )
        })}
        <button
          type="button"
          onClick={onMoreClick}
          className="flex flex-1 flex-col items-center justify-center gap-0.5"
        >
          <Ellipsis className={cn('h-5 w-5', moreActive ? 'text-primary' : 'text-muted-foreground')} />
          <span className={cn('text-[10px] font-medium', moreActive ? 'text-primary' : 'text-muted-foreground')}>
            Mais
          </span>
        </button>
      </div>
    </nav>
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
    return navBase.reduce<NavEntry[]>((acc, entry) => {
      if (isNavGroup(entry)) {
        const filteredChildren = entry.children.filter((child) => liberados.has(child.to))
        if (filteredChildren.length > 0) {
          acc.push({ ...entry, children: filteredChildren })
        }
      } else if (liberados.has(entry.to)) {
        acc.push(entry)
      }
      return acc
    }, [])
  }, [navBase, tutorialArtista])

  const bottomTabs = !user
    ? artistBottomTabs
    : user.role === 'Admin'
      ? adminBottomTabs
      : user.role === 'Contractor'
        ? contractorBottomTabs
        : artistBottomTabs

  return (
    <div className="min-h-screen bg-[#0d0a1a] relative overflow-hidden">
      {/* ── Decorative background glows ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden lg:left-60">
        <div className="absolute -top-24 left-1/4 h-[600px] w-[600px] rounded-full bg-[#7c3aed]/20 blur-[150px]" />
        <div className="absolute top-1/3 -right-10 h-[500px] w-[500px] rounded-full bg-[#6d28d9]/15 blur-[130px]" />
        <div className="absolute bottom-10 left-1/3 h-[400px] w-[400px] rounded-full bg-[#4f46e5]/15 blur-[120px]" />
      </div>
      {/* Sidebar fixa apenas em telas grandes */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-white/10 bg-[#0f0a1e] lg:flex">
        <SidebarContent nav={nav} />
      </aside>

      {/* Drawer "Mais" no mobile (abre pelo botão Mais da bottom bar) */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col border-r border-white/10 bg-[#0f0a1e] shadow-xl">
            <SidebarContent nav={nav} onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="relative z-10 flex min-h-screen flex-col lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 lg:h-16 items-center justify-between gap-2 border-b border-white/10 bg-[#0d0a1a]/80 px-4 backdrop-blur-md lg:justify-end lg:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <BrandMark />
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationsMenu />
          </div>
        </header>
        <main className="flex-1 p-4 pb-20 lg:p-6 lg:pb-6">
          {user?.role === 'Artist' && tutorialArtista && !tutorialArtista.state.done && (
            <div
              role="status"
              className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/60 bg-amber-500/10 px-4 py-3 text-sm"
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p>
                <strong>Você está no modo tutorial.</strong> Os shows, valores, eventos, avaliações, equipe e
                equipamentos de exemplo são fictícios, servem apenas para visualização e somem quando você concluir o
                tutorial. O que você mesmo cadastrar fica salvo na sua conta.
              </p>
            </div>
          )}
          <Outlet />
        </main>
        <SiteFooter compact />
      </div>

      {/* Bottom tab bar (mobile only) */}
      <BottomTabBar tabs={bottomTabs} onMoreClick={() => setMenuOpen(true)} />

      {user?.role === 'Artist' && (
        <TutorialBox title="Bem-vindo ao Reprissa!" steps={artistTutorialSteps} progress={tutorialArtista} />
      )}
    </div>
  )
}
