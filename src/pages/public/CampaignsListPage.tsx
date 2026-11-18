import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Link } from 'react-router-dom'
import {
  Calendar,
  Target,
  ArrowRight,
  Sparkles,
  Clock,
  Trophy,
  Megaphone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PublicCampaign {
  id: string
  slug: string
  name: string
  description: string
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

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

function CampaignCard({ campaign }: { campaign: PublicCampaign }) {
  const goalPercent =
    campaign.type === 1 && campaign.goalTarget
      ? Math.min(100, Math.round(((campaign.goalCurrent ?? 0) / campaign.goalTarget) * 100))
      : 0

  const remaining = campaign.endDate ? daysRemaining(campaign.endDate) : null

  return (
    <Link
      to={`/c/${campaign.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-purple-900/10 hover:-translate-y-1"
    >
      {/* Top gradient accent */}
      <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-violet-600" />

      <div className="flex flex-1 flex-col p-6">
        {/* Badge */}
        <div className="mb-3 flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
            {campaign.type === 0 ? (
              <Calendar className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Target className="h-3.5 w-3.5 text-primary" />
            )}
            <span className="text-xs font-medium text-primary">
              {campaign.type === 0 ? 'Por data' : 'Por meta'}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">
          {campaign.name}
        </h3>

        {/* Description */}
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {campaign.description}
        </p>

        {/* Meta info */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {campaign.type === 0 && campaign.startDate && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatDateShort(campaign.startDate)}
              {campaign.endDate && ` — ${formatDateShort(campaign.endDate)}`}
            </div>
          )}
          {campaign.type === 0 && remaining !== null && remaining > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500">
              <Clock className="h-3 w-3" />
              {remaining} {remaining === 1 ? 'dia restante' : 'dias restantes'}
            </div>
          )}
          {campaign.type === 1 && campaign.goalTarget && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Trophy className="h-3.5 w-3.5" />
              {campaign.goalCurrent ?? 0} / {campaign.goalTarget}
            </div>
          )}
        </div>

        {/* Progress bar for goals */}
        {campaign.type === 1 && campaign.goalTarget && (
          <div className="mt-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-500"
                style={{ width: `${goalPercent}%` }}
              />
            </div>
            <p className="mt-1 text-right text-xs font-medium text-primary">{goalPercent}%</p>
          </div>
        )}

        {/* CTA arrow */}
        <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          Ver campanha <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  )
}

export function CampaignsListPage() {
  const { data: campaigns, isLoading } = useQuery<PublicCampaign[]>({
    queryKey: ['public-campaigns'],
    queryFn: () => api.get('/campaigns').then((r) => r.data),
  })

  return (
    <div className="min-h-[80vh]">
      {/* ── HERO ── */}
      <section className="relative pb-8 pt-16 sm:pb-12 sm:pt-20">
        {/* Background glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-violet-500/[0.07] blur-[120px]" />
          <div className="absolute -right-32 top-10 h-[400px] w-[400px] rounded-full bg-purple-600/[0.05] blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
            <Megaphone className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary">Campanhas</span>
          </div>

          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
            Nossas <GradientText>campanhas</GradientText>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Acompanhe as campanhas ativas da Reprissa. Sorteios, metas e muito mais!
          </p>
        </div>
      </section>

      {/* ── CAMPAIGNS GRID ── */}
      <section className="relative pb-20 pt-4">
        <div className="mx-auto max-w-5xl px-4">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="relative">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500/20 border-t-violet-500" />
                <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-violet-500/10" />
              </div>
            </div>
          ) : !campaigns || campaigns.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-20">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold">Nenhuma campanha ativa</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Novas campanhas aparecerão aqui em breve. Fique de olho!
                </p>
              </div>
              <Button variant="outline" className="gap-2 rounded-xl" asChild>
                <Link to="/">
                  <ArrowRight className="h-4 w-4 rotate-180" /> Voltar ao início
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((c) => (
                <CampaignCard key={c.id} campaign={c} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
