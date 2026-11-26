import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Copy, Check, Users, Link2, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/services/api'
import { PageHeader } from '@/components/PageHeader'

interface ReferralItem {
  id: string
  referredUserName: string
  createdAt: string
}

interface ReferralSummary {
  referralCode: string
  referralLink: string
  totalReferrals: number
  referrals: ReferralItem[]
}

export function IndicacoesPage() {
  const [copied, setCopied] = useState(false)

  const { data: summary, isLoading } = useQuery<ReferralSummary>({
    queryKey: ['referral-summary'],
    queryFn: async () => (await api.get('/artist/referrals/summary')).data,
  })

  const handleCopy = async () => {
    if (!summary?.referralLink) return
    try {
      await navigator.clipboard.writeText(summary.referralLink)
      setCopied(true)
      toast.success('Link copiado!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar o link')
    }
  }

  const handleShare = async () => {
    if (!summary?.referralLink) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Reprissa — Plataforma de Artistas',
          text: 'Cadastre-se na Reprissa usando meu link de indicação!',
          url: summary.referralLink,
        })
      } catch {
        // Usuário cancelou o share
      }
    } else {
      handleCopy()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        icon={<Share2 />}
        title="Indicações"
        subtitle="Compartilhe seu link e acompanhe quem se cadastrou pela sua indicação."
        gradient="from-pink-500 to-rose-500"
      />

      {/* Card do link de indicação */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Link2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Seu link de indicação</h2>
            <p className="text-xs text-muted-foreground">
              Envie para amigos e ganhe indicações quando eles se cadastrarem
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 overflow-hidden rounded-lg border bg-muted/50 px-4 py-2.5">
            <p className="truncate text-sm font-mono text-muted-foreground">
              {summary?.referralLink ?? '...'}
            </p>
          </div>
          <button
            onClick={handleCopy}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background transition-colors hover:bg-accent"
            title="Copiar link"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <button
            onClick={handleShare}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background transition-colors hover:bg-accent"
            title="Compartilhar"
          >
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Código: <span className="font-mono font-semibold text-foreground">{summary?.referralCode}</span>
        </p>
      </div>

      {/* Card de contagem */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <Users className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-3xl font-bold">{summary?.totalReferrals ?? 0}</p>
            <p className="text-sm text-muted-foreground">
              {summary?.totalReferrals === 1 ? 'pessoa indicada' : 'pessoas indicadas'}
            </p>
          </div>
        </div>
      </div>

      {/* Lista de indicados */}
      {summary?.referrals && summary.referrals.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">Suas indicações</h2>
          </div>
          <div className="divide-y">
            {summary.referrals.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {item.referredUserName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{item.referredUserName}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary?.referrals?.length === 0 && (
        <div className="rounded-xl border border-dashed bg-card p-8 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            Nenhuma indicação ainda
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Compartilhe seu link para começar a receber indicações!
          </p>
        </div>
      )}
    </div>
  )
}
