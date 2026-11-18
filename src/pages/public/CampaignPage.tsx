import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import {
  Calendar,
  Target,
  Clock,
  Trophy,
  Sparkles,
  ScrollText,
  ChevronRight,
  ArrowRight,
  Instagram,
} from 'lucide-react'
import { BrandMark } from '@/components/ui/brand-logo'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

interface PublicCampaign {
  slug: string
  name: string
  description: string
  rules: string
  type: number
  startDate: string | null
  endDate: string | null
  goalDescription: string | null
  goalTarget: number | null
  goalCurrent: number | null
}

function GradientText({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-gradient-to-r from-violet-400 via-purple-500 to-violet-600 bg-clip-text text-transparent">
      {children}
    </span>
  )
}

function daysRemaining(endDate: string): number {
  const end = new Date(endDate)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function CampaignPage() {
  const { slug } = useParams<{ slug: string }>()

  const {
    data: campaign,
    isLoading,
    error,
  } = useQuery<PublicCampaign>({
    queryKey: ['campaign', slug],
    queryFn: () => api.get(`/campaigns/${slug}`).then((r) => r.data),
    enabled: !!slug,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="relative">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500/20 border-t-violet-500" />
          <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-violet-500/10" />
        </div>
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <Sparkles className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-xl font-semibold">Campanha não encontrada</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Esta campanha pode ter sido encerrada ou o link está incorreto.
          </p>
        </div>
        <Button variant="outline" className="gap-2 rounded-xl" asChild>
          <Link to="/">
            <ArrowRight className="h-4 w-4 rotate-180" /> Voltar ao início
          </Link>
        </Button>
      </div>
    )
  }

  const goalPercent =
    campaign.type === 1 && campaign.goalTarget
      ? Math.min(100, Math.round(((campaign.goalCurrent ?? 0) / campaign.goalTarget) * 100))
      : 0

  const remaining = campaign.endDate ? daysRemaining(campaign.endDate) : null

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ── HEADER ── */}
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <a href="/" className="transition-opacity hover:opacity-80">
            <BrandMark />
          </a>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl" asChild>
            <Link to="/register">
              Criar conta <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative pb-8 pt-16 sm:pb-12 sm:pt-24">
        {/* Background decorations */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-violet-500/[0.07] blur-[120px]" />
          <div className="absolute -right-32 top-10 h-[400px] w-[400px] rounded-full bg-purple-600/[0.05] blur-[120px]" />
          <div className="absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-violet-500/[0.04] blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-3xl px-4 text-center">
          {/* Badge animado */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
            </span>
            <span className="text-xs font-medium text-primary">
              {campaign.type === 0 ? 'Campanha ativa' : 'Campanha em andamento'}
            </span>
          </div>

          {/* Título */}
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            <GradientText>{campaign.name}</GradientText>
          </h1>

          {/* Descrição curta */}
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {campaign.description}
          </p>
        </div>
      </section>

      {/* ── INFO CARDS ── */}
      <section className="relative py-6">
        <div className="mx-auto max-w-3xl px-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Card de tipo/data/meta */}
            {campaign.type === 0 ? (
              <>
                {(campaign.startDate || campaign.endDate) && (
                  <div className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-purple-900/5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/10">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Período
                      </p>
                      <p className="mt-0.5 font-semibold">
                        {campaign.startDate ? formatDate(campaign.startDate) : ''}
                        {campaign.startDate && campaign.endDate ? ' — ' : ''}
                        {campaign.endDate ? formatDate(campaign.endDate) : ''}
                      </p>
                    </div>
                  </div>
                )}
                {remaining !== null && remaining > 0 && (
                  <div className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-purple-900/5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10">
                      <Clock className="h-6 w-6 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Tempo restante
                      </p>
                      <p className="mt-0.5 font-semibold">
                        {remaining} {remaining === 1 ? 'dia' : 'dias'}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {campaign.goalDescription && (
                  <div className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-purple-900/5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/10">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Meta
                      </p>
                      <p className="mt-0.5 font-semibold">{campaign.goalDescription}</p>
                    </div>
                  </div>
                )}
                {campaign.goalTarget && (
                  <div className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-purple-900/5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/10">
                      <Trophy className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Progresso
                      </p>
                      <p className="mt-0.5 font-semibold">
                        {campaign.goalCurrent ?? 0}{' '}
                        <span className="text-muted-foreground font-normal">
                          / {campaign.goalTarget}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Barra de progresso (meta) */}
          {campaign.type === 1 && campaign.goalTarget && (
            <div className="mt-4 rounded-2xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Progresso da campanha
                </span>
                <span className="text-sm font-bold text-primary">{goalPercent}%</span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-muted/50">
                <div
                  className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-violet-600 transition-all duration-700 ease-out"
                  style={{ width: `${goalPercent}%` }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_25%,rgba(255,255,255,0.15)_50%,transparent_75%)] animate-[shimmer_2s_infinite]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── REGRAS ── */}
      <section className="py-10 sm:py-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-sm">
            {/* Decoração do card */}
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/[0.06] blur-3xl" />
            <div className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-purple-600/[0.04] blur-3xl" />

            <div className="relative p-6 sm:p-10">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 shadow-lg shadow-purple-500/25">
                  <ScrollText className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight">Regras</h2>
              </div>

              <div className="whitespace-pre-line text-[15px] leading-[1.8] text-muted-foreground">
                {campaign.rules}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-16 sm:py-24">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/[0.06] blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-2xl px-4 text-center">
          <Sparkles className="mx-auto mb-4 h-8 w-8 text-primary/60" />
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Quer ficar por dentro de tudo?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Crie sua conta grátis na Reprissa e acompanhe nossas campanhas, eventos e novidades.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              className="gap-2 rounded-xl px-8 text-base shadow-lg shadow-purple-500/25"
              asChild
            >
              <Link to="/register">
                Criar conta grátis <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="gap-2 rounded-xl px-8 text-base border-pink-500/30 text-pink-500 hover:bg-pink-500/10 hover:text-pink-400 hover:border-pink-500/50"
              asChild
            >
              <a href="https://instagram.com/reprissaoficial" target="_blank" rel="noopener noreferrer">
                <Instagram className="h-5 w-5" /> Siga no Instagram
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border/50 py-6">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex flex-col items-center gap-3">
            <a href="/" className="transition-opacity hover:opacity-80">
              <BrandMark />
            </a>
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} Reprissa
              </p>
              <span className="text-muted-foreground/30">·</span>
              <a
                href="https://instagram.com/reprissaoficial"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
              >
                <Instagram className="h-3.5 w-3.5" />
                @reprissaoficial
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
