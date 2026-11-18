import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Calendar, Target } from 'lucide-react'
import { BrandMark } from '@/components/ui/brand-logo'

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

export function CampaignPage() {
  const { slug } = useParams<{ slug: string }>()

  const { data: campaign, isLoading, error } = useQuery<PublicCampaign>({
    queryKey: ['campaign', slug],
    queryFn: () => api.get(`/campaigns/${slug}`).then((r) => r.data),
    enabled: !!slug,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <p className="text-lg text-muted-foreground">Campanha não encontrada.</p>
        <a href="/" className="text-sm text-primary hover:underline">Voltar ao início</a>
      </div>
    )
  }

  const goalPercent =
    campaign.type === 1 && campaign.goalTarget
      ? Math.min(100, Math.round(((campaign.goalCurrent ?? 0) / campaign.goalTarget) * 100))
      : 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header simples */}
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-4xl items-center px-4">
          <a href="/">
            <BrandMark />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
        {/* Hero */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            {campaign.name}
          </h1>

          {/* Badge de tipo */}
          <div className="mt-4 flex justify-center">
            {campaign.type === 0 ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
                <Calendar className="h-4 w-4" />
                {campaign.startDate && campaign.endDate
                  ? `${new Date(campaign.startDate).toLocaleDateString('pt-BR')} — ${new Date(campaign.endDate).toLocaleDateString('pt-BR')}`
                  : 'Campanha por período'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
                <Target className="h-4 w-4" />
                {campaign.goalDescription ?? 'Campanha por meta'}
              </span>
            )}
          </div>
        </div>

        {/* Barra de progresso (meta) */}
        {campaign.type === 1 && campaign.goalTarget && (
          <div className="mx-auto mb-10 max-w-md">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-semibold">{campaign.goalCurrent ?? 0}</span>
              <span className="text-muted-foreground">Meta: {campaign.goalTarget}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-500"
                style={{ width: `${goalPercent}%` }}
              />
            </div>
            <p className="mt-1 text-center text-xs text-muted-foreground">{goalPercent}% concluído</p>
          </div>
        )}

        {/* Descrição */}
        <section className="mb-8">
          <div className="rounded-2xl border bg-card p-6 sm:p-8">
            <h2 className="mb-3 text-xl font-bold">Sobre a campanha</h2>
            <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
              {campaign.description}
            </p>
          </div>
        </section>

        {/* Regras */}
        <section>
          <div className="rounded-2xl border bg-card p-6 sm:p-8">
            <h2 className="mb-3 text-xl font-bold">Regras</h2>
            <div className="whitespace-pre-line leading-relaxed text-muted-foreground">
              {campaign.rules}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
