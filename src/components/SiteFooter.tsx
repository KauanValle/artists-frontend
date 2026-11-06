import { Link } from 'react-router-dom'

/// <summary>
/// Rodapé compartilhado. Em layouts com `flex flex-col min-h-screen`,
/// o `mt-auto` fixa o rodapé no pé da página mesmo quando o conteúdo é curto.
/// </summary>
export function SiteFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={compact ? 'mt-auto border-t py-4 text-sm text-muted-foreground' : 'mt-auto border-t py-8 text-sm text-muted-foreground'}>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1" aria-label="Links institucionais">
          <Link to="/sobre" className="transition-colors hover:text-foreground">
            Sobre
          </Link>
          <Link to="/faq" className="transition-colors hover:text-foreground">
            FAQ
          </Link>
          <Link to="/termos-de-uso" className="transition-colors hover:text-foreground">
            Termos de Uso
          </Link>
        </nav>
        <p>reprissa — conectando talentos a oportunidades · © {new Date().getFullYear()} Reprissa. Todos os direitos reservados.</p>
      </div>
    </footer>
  )
}
