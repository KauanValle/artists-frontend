import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarPlus,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  FileText,
  Info,
  Megaphone,
  Menu,
  Mic2,
  PackageSearch,
  Search,
  Ticket,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Tipos                                                              */
/* ------------------------------------------------------------------ */

interface SubItem {
  to: string
  label: string
  icon: LucideIcon
}

interface CategoryGroup {
  kind: 'group'
  label: string
  icon: LucideIcon
  children: SubItem[]
}

interface CategoryLink {
  kind: 'link'
  to: string
  label: string
  icon: LucideIcon
}

type CategoryEntry = CategoryGroup | CategoryLink

/* ------------------------------------------------------------------ */
/*  Dados do menu Categorias                                           */
/* ------------------------------------------------------------------ */

const categoryEntries: CategoryEntry[] = [
  {
    kind: 'group',
    label: 'Contratante',
    icon: Users,
    children: [
      { to: '/artistas', label: 'Buscar artista', icon: Search },
      { to: '/eventos/painel', label: 'Criar eventos', icon: CalendarPlus },
    ],
  },
  {
    kind: 'group',
    label: 'Artista',
    icon: Mic2,
    children: [
      { to: '/register', label: 'Gestão de carreira', icon: Mic2 },
    ],
  },
  { kind: 'link', to: '/eventos', label: 'Eventos', icon: Ticket },
  { kind: 'link', to: '/campanhas', label: 'Campanhas', icon: Megaphone },
  { kind: 'link', to: '/acompanhar-pedidos', label: 'Acompanhar pedidos', icon: PackageSearch },
  { kind: 'link', to: '/sobre', label: 'Sobre nós', icon: Info },
  { kind: 'link', to: '/faq', label: 'Perguntas frequentes', icon: HelpCircle },
  { kind: 'link', to: '/termos-de-uso', label: 'Termos de uso', icon: FileText },
]

/* ------------------------------------------------------------------ */
/*  Sub-menu lateral (abre à direita ao passar o mouse / clicar)       */
/* ------------------------------------------------------------------ */

function CategoryGroupItem({
  entry,
  onNavigate,
}: {
  entry: CategoryGroup
  onNavigate: () => void
}) {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => { if (timer.current) clearTimeout(timer.current); setOpen(true) }
  const hideSoon = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpen(false), 200)
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const Icon = entry.icon

  return (
    <div
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hideSoon}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-primary/20 hover:text-white"
      >
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <span className="flex-1 text-left">{entry.label}</span>
        <ChevronRight className={`h-3.5 w-3.5 text-zinc-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-full top-0 z-50 ml-0.5">
          <div className="w-56 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl dark:bg-zinc-950">
            {entry.children.map(({ to, label, icon: ChildIcon }) => (
              <Link
                key={to}
                to={to}
                role="menuitem"
                onClick={() => { setOpen(false); onNavigate() }}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-primary/20 hover:text-white"
              >
                <ChildIcon className="h-4 w-4 shrink-0 text-primary" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Dropdown da barra horizontal (Contratante / Artista)               */
/* ------------------------------------------------------------------ */

interface NavDropdownProps {
  label: string
  items: { to: string; label: string; icon: LucideIcon }[]
}

function NavBarDropdown({ label, items }: NavDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => { if (timer.current) clearTimeout(timer.current); setOpen(true) }
  const hideSoon = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpen(false), 200)
  }

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      ref={ref}
      className="relative flex flex-1 items-stretch"
      onMouseEnter={show}
      onMouseLeave={hideSoon}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-300 transition-colors hover:bg-white/10 hover:text-white lg:text-sm"
      >
        {label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-1">
          <div
            role="menu"
            className="w-60 rounded-b-lg border border-t-0 border-zinc-700 bg-zinc-900 py-1 shadow-xl dark:bg-zinc-950"
          >
            {items.map(({ to, label: itemLabel, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-primary/20 hover:text-white"
              >
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                {itemLabel}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


/* ------------------------------------------------------------------ */
/*  Menu mobile: expande todas as opções                               */
/* ------------------------------------------------------------------ */

function MobileMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setExpandedGroup(null) }
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setExpandedGroup(null) } }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const close = () => { setOpen(false); setExpandedGroup(null) }
  const toggleGroup = (label: string) => setExpandedGroup((v) => (v === label ? null : label))

  return (
    <div ref={ref} className="relative flex flex-1 items-stretch md:hidden">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setExpandedGroup(null) }}
        className="flex flex-1 items-center justify-center gap-2 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
      >
        Menu
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 right-0 top-full z-50 border-t border-zinc-700 bg-zinc-900 py-1 shadow-xl dark:bg-zinc-950"
        >
          {/* Contratante */}
          <button
            type="button"
            onClick={() => toggleGroup('Contratante')}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-primary/20 hover:text-white"
          >
            <Users className="h-4 w-4 shrink-0 text-primary" />
            <span className="flex-1 text-left">Contratante</span>
            <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform ${expandedGroup === 'Contratante' ? 'rotate-180' : ''}`} />
          </button>
          {expandedGroup === 'Contratante' && (
            <div className="bg-zinc-800/50 dark:bg-zinc-900/50">
              <Link to="/artistas" role="menuitem" onClick={close} className="flex items-center gap-3 py-2.5 pl-11 pr-4 text-sm font-medium text-zinc-300 transition-colors hover:bg-primary/20 hover:text-white">
                <Search className="h-4 w-4 shrink-0 text-primary" /> Buscar artista
              </Link>
              <Link to="/eventos/painel" role="menuitem" onClick={close} className="flex items-center gap-3 py-2.5 pl-11 pr-4 text-sm font-medium text-zinc-300 transition-colors hover:bg-primary/20 hover:text-white">
                <CalendarPlus className="h-4 w-4 shrink-0 text-primary" /> Criar eventos
              </Link>
            </div>
          )}

          {/* Artista */}
          <button
            type="button"
            onClick={() => toggleGroup('Artista')}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-primary/20 hover:text-white"
          >
            <Mic2 className="h-4 w-4 shrink-0 text-primary" />
            <span className="flex-1 text-left">Artista</span>
            <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform ${expandedGroup === 'Artista' ? 'rotate-180' : ''}`} />
          </button>
          {expandedGroup === 'Artista' && (
            <div className="bg-zinc-800/50 dark:bg-zinc-900/50">
              <Link to="/register" role="menuitem" onClick={close} className="flex items-center gap-3 py-2.5 pl-11 pr-4 text-sm font-medium text-zinc-300 transition-colors hover:bg-primary/20 hover:text-white">
                <Mic2 className="h-4 w-4 shrink-0 text-primary" /> Gestão de carreira
              </Link>
            </div>
          )}

          <div className="my-1 border-t border-zinc-700" />

          {/* Links diretos */}
          <Link to="/eventos" role="menuitem" onClick={close} className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-primary/20 hover:text-white">
            <Ticket className="h-4 w-4 shrink-0 text-primary" /> Eventos
          </Link>
          <Link to="/campanhas" role="menuitem" onClick={close} className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-primary/20 hover:text-white">
            <Megaphone className="h-4 w-4 shrink-0 text-primary" /> Campanhas
          </Link>
          <Link to="/acompanhar-pedidos" role="menuitem" onClick={close} className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-primary/20 hover:text-white">
            <PackageSearch className="h-4 w-4 shrink-0 text-primary" /> Meus pedidos
          </Link>

          <div className="my-1 border-t border-zinc-700" />

          <Link to="/sobre" role="menuitem" onClick={close} className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-primary/20 hover:text-white">
            <Info className="h-4 w-4 shrink-0 text-primary" /> Sobre nós
          </Link>
          <Link to="/faq" role="menuitem" onClick={close} className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-primary/20 hover:text-white">
            <HelpCircle className="h-4 w-4 shrink-0 text-primary" /> Perguntas frequentes
          </Link>
          <Link to="/termos-de-uso" role="menuitem" onClick={close} className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-primary/20 hover:text-white">
            <FileText className="h-4 w-4 shrink-0 text-primary" /> Termos de uso
          </Link>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Componente principal                                               */
/* ------------------------------------------------------------------ */

export function SubHeaderNav() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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

  const closeAll = () => setOpen(false)

  return (
    <nav className="relative z-40 bg-zinc-900 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-stretch">
        {/* Botão CATEGORIAS */}
        <div ref={ref} className="relative hidden md:block">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="menu"
            className="flex h-full items-center gap-2 bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/85 sm:px-5 sm:text-sm"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            <span className="hidden sm:inline">Categorias</span>
          </button>

          {open && (
            <div
              role="menu"
              className="absolute left-0 top-full z-50 w-64 rounded-b-lg border border-t-0 border-zinc-700 bg-zinc-900 py-1 shadow-xl dark:bg-zinc-950"
            >
              {categoryEntries.map((entry) =>
                entry.kind === 'group' ? (
                  <CategoryGroupItem
                    key={entry.label}
                    entry={entry}
                    onNavigate={closeAll}
                  />
                ) : (
                  <Link
                    key={entry.to}
                    to={entry.to}
                    role="menuitem"
                    onClick={closeAll}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-primary/20 hover:text-white"
                  >
                    <entry.icon className="h-4 w-4 shrink-0 text-primary" />
                    {entry.label}
                  </Link>
                )
              )}
            </div>
          )}
        </div>

        {/* Desktop: dropdowns CONTRATANTE e ARTISTA + link */}
        <div className="hidden flex-1 items-stretch md:flex">
          <NavBarDropdown
            label="Contratante"
            items={[
              { to: '/artistas', label: 'Buscar artista', icon: Search },
              { to: '/eventos/painel', label: 'Criar eventos', icon: CalendarPlus },
            ]}
          />
          <NavBarDropdown
            label="Artista"
            items={[
              { to: '/register', label: 'Gestão de carreira', icon: Mic2 },
            ]}
          />
          <Link
            to="/eventos"
            className="flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-300 transition-colors hover:bg-white/10 hover:text-white lg:text-sm"
          >
            Eventos
          </Link>
          <Link
            to="/campanhas"
            className="flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-300 transition-colors hover:bg-white/10 hover:text-white lg:text-sm"
          >
            Campanhas
          </Link>
          <Link
            to="/acompanhar-pedidos"
            className="flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-300 transition-colors hover:bg-white/10 hover:text-white lg:text-sm"
          >
            Meus pedidos
          </Link>
        </div>

        {/* Mobile: botão Menu que expande tudo */}
        <MobileMenu />
      </div>
    </nav>
  )
}
