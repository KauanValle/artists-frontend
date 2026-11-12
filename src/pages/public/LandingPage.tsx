import { Link } from 'react-router-dom'
import { useId } from 'react'
import {
  ArrowRight,
  Calendar,
  CreditCard,
  FileText,
  Globe,
  Mic2,
  Music,
  Search,
  Shield,
  Smartphone,
  Star,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

/* ─── tiny helpers ─── */
function GradientText({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-gradient-to-r from-violet-400 via-purple-500 to-violet-600 bg-clip-text text-transparent">
      {children}
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-3 inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
      {children}
    </span>
  )
}

/* ─── animated floating mockup ─── */
function HeroVisual() {
  const id = useId()
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-lg">
      {/* glow */}
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-violet-500/20 via-purple-600/10 to-transparent blur-3xl" />

      {/* phone frame */}
      <div className="relative animate-float rounded-[2rem] border border-white/10 bg-gradient-to-b from-card/90 to-card/70 p-3 shadow-2xl shadow-purple-900/30 backdrop-blur-xl">
        <div className="overflow-hidden rounded-[1.4rem] bg-background">
          {/* status bar */}
          <div className="flex items-center justify-between bg-gradient-to-r from-violet-600 to-purple-700 px-5 py-3">
            <span className="text-xs font-bold text-white/90 tracking-wide">REPRISSA</span>
            <div className="flex gap-1.5">
              <div className="h-2 w-2 rounded-full bg-white/40" />
              <div className="h-2 w-2 rounded-full bg-white/40" />
              <div className="h-2 w-2 rounded-full bg-white/60" />
            </div>
          </div>

          {/* mock content */}
          <div className="space-y-3 p-4">
            {/* artist card 1 */}
            <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/60 p-3 transition-all hover:border-primary/30">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-700 text-lg font-bold text-white">
                M
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Maria Silva</p>
                <p className="text-xs text-muted-foreground">Cantora · São Paulo, SP</p>
                <div className="mt-1 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="ml-1 text-[10px] text-muted-foreground">5.0</span>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                Disponível
              </span>
            </div>

            {/* artist card 2 */}
            <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/60 p-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 text-lg font-bold text-white">
                J
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">João Beats</p>
                <p className="text-xs text-muted-foreground">DJ · Rio de Janeiro, RJ</p>
                <div className="mt-1 flex items-center gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                  ))}
                  <Star className="h-3 w-3 fill-amber-400/40 text-amber-400/40" />
                  <span className="ml-1 text-[10px] text-muted-foreground">4.8</span>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                Disponível
              </span>
            </div>

            {/* artist card 3 */}
            <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/60 p-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-lg font-bold text-white">
                A
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Ana Cordas</p>
                <p className="text-xs text-muted-foreground">Violinista · Curitiba, PR</p>
                <div className="mt-1 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="ml-1 text-[10px] text-muted-foreground">5.0</span>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                Agenda cheia
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* floating badges */}
      <div className="absolute -left-4 top-16 animate-float-delayed rounded-xl border border-border/50 bg-card/90 px-3 py-2 shadow-lg backdrop-blur-sm sm:-left-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Receita do mês</p>
            <p className="text-sm font-bold text-emerald-500">+R$ 4.200</p>
          </div>
        </div>
      </div>

      <div className="absolute -right-2 bottom-24 animate-float-slow rounded-xl border border-border/50 bg-card/90 px-3 py-2 shadow-lg backdrop-blur-sm sm:-right-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/10">
            <Calendar className="h-4 w-4 text-violet-500" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Próximo show</p>
            <p className="text-sm font-bold">Sáb, 20h</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── step card ─── */
function StepCard({
  number,
  title,
  description,
  icon: Icon,
}: {
  number: string
  title: string
  description: string
  icon: React.ElementType
}) {
  return (
    <div className="group relative">
      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative space-y-3 rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm transition-all group-hover:border-primary/20 group-hover:shadow-lg group-hover:shadow-purple-900/10">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-sm font-bold text-white shadow-lg shadow-purple-500/25">
            {number}
          </span>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

/* ─── feature card ─── */
function FeatureCard({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description: string
  icon: React.ElementType
}) {
  return (
    <div className="group space-y-3 rounded-2xl border border-border/50 bg-card/30 p-5 backdrop-blur-sm transition-all hover:border-primary/20 hover:bg-card/60 hover:shadow-lg hover:shadow-purple-900/5">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/10 transition-colors group-hover:from-primary/30 group-hover:to-violet-500/20">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="font-bold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  )
}

/* ─── stat pill ─── */
function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-extrabold sm:text-4xl">
        <GradientText>{value}</GradientText>
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

/* ═══════════════ PAGE ═══════════════ */
export function LandingPage() {
  return (
    <main className="overflow-x-hidden">
      {/* ── HERO ── */}
      <section className="relative pb-16 pt-12 sm:pb-24 sm:pt-20">
        {/* bg decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-500/[0.07] blur-[120px]" />
          <div className="absolute -right-40 top-20 h-[400px] w-[400px] rounded-full bg-purple-600/[0.05] blur-[120px]" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2 lg:gap-16">
          {/* copy */}
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
              </span>
              <span className="text-xs font-medium text-primary">Plataforma 100% gratuita para artistas</span>
            </div>

            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Seu talento merece{' '}
              <GradientText>palco digital.</GradientText>
            </h1>

            <p className="mt-5 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              O <strong className="text-foreground">Reprissa</strong> conecta artistas a contratantes de todo o Brasil.
              Crie seu perfil, receba propostas, gerencie shows e receba pagamentos — tudo em um só lugar.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="gap-2 rounded-xl px-6 text-base shadow-lg shadow-purple-500/25" asChild>
                <Link to="/register">
                  Criar conta grátis <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="gap-2 rounded-xl px-6 text-base" asChild>
                <Link to="/artistas">
                  <Search className="h-4 w-4" /> Explorar artistas
                </Link>
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Sem cartão de crédito · Perfil pronto em 5 minutos
            </p>
          </div>

          {/* visual */}
          <HeroVisual />
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="border-y border-border/50 bg-card/30 py-12 backdrop-blur-sm">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 px-4 sm:grid-cols-4">
          <StatPill value="10+" label="Artistas cadastrados" />
          <StatPill value="300+" label="Shows realizados" />
          <StatPill value="5+" label="Cidades atendidas" />
          <StatPill value="4.9★" label="Avaliação média" />
        </div>
      </section>

      {/* ── PARA ARTISTAS ── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>Para Artistas</SectionLabel>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Tudo que você precisa para{' '}
              <GradientText>crescer na carreira</GradientText>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Chega de correr atrás de contrato no boca a boca. No Reprissa, os contratantes vêm até você.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={Globe}
              title="Perfil público profissional"
              description="Sua vitrine online com fotos, vídeos, repertório e redes sociais. Compartilhe seu link e impressione em segundos."
            />
            <FeatureCard
              icon={FileText}
              title="EPK — Press Kit digital"
              description="Um mini-site exclusivo com toda a sua carreira: biografia, mídia, categorias e contato direto. Perfeito para enviar a produtores."
            />
            <FeatureCard
              icon={Calendar}
              title="Agenda inteligente"
              description="Defina seus dias e horários de disponibilidade. O sistema bloqueia conflitos automaticamente, inclusive eventos que cruzam a meia-noite."
            />
            <FeatureCard
              icon={CreditCard}
              title="Pagamento integrado"
              description="Receba pagamentos diretamente na plataforma via gateway seguro. Sem surpresas — a taxa é transparente antes de cada transação."
            />
            <FeatureCard
              icon={TrendingUp}
              title="Painel financeiro completo"
              description="Acompanhe receitas, despesas, contas a receber e resultado líquido em tempo real. Controle total das suas finanças."
            />
            <FeatureCard
              icon={Star}
              title="Avaliações e reputação"
              description="Cada show concluído gera uma avaliação com nota e fotos do contratante. Quanto mais shows, mais visibilidade."
            />
          </div>
        </div>
      </section>

      {/* ── PARA CONTRATANTES ── */}
      <section className="border-y border-border/30 bg-gradient-to-b from-card/40 to-background py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>Para Contratantes</SectionLabel>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Encontre o artista perfeito{' '}
              <GradientText>para o seu evento</GradientText>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Casamento, festa corporativa, inauguração ou festival — encontre o talento ideal filtrando por categoria, cidade e orçamento.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={Search}
              title="Busca avançada"
              description="Filtre por categoria musical, localização, faixa de preço e disponibilidade. Resultados em segundos."
            />
            <FeatureCard
              icon={Mic2}
              title="Perfis completos"
              description="Veja fotos, vídeos, avaliações e portfólio completo antes de contratar. Sem surpresas no dia do evento."
            />
            <FeatureCard
              icon={Shield}
              title="Contratação segura"
              description="Proposta formal com contrato digital, assinatura eletrônica e pagamento protegido pela plataforma."
            />
            <FeatureCard
              icon={Users}
              title="Chat direto"
              description="Converse direto com o artista para alinhar detalhes, repertório e equipamentos antes de fechar."
            />
            <FeatureCard
              icon={Zap}
              title="Agendamento rápido"
              description="Veja a disponibilidade em tempo real e solicite a data desejada em poucos cliques."
            />
            <FeatureCard
              icon={Star}
              title="Avalie após o show"
              description="Confirme a conclusão do show e deixe sua avaliação com fotos. Ajude outros contratantes a escolherem bem."
            />
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>Como funciona</SectionLabel>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              <GradientText>3 passos</GradientText> para começar
            </h2>
            <p className="mt-4 text-muted-foreground">
              Do cadastro ao primeiro show, tudo é simples e direto.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <StepCard
              number="01"
              icon={Users}
              title="Crie sua conta"
              description="Cadastre-se como artista ou contratante em menos de 2 minutos. Preencha seu perfil com fotos, vídeos e informações sobre seu trabalho."
            />
            <StepCard
              number="02"
              icon={Search}
              title="Conecte-se"
              description="Artistas publicam seu perfil e recebem propostas. Contratantes buscam talentos, conversam pelo chat e enviam solicitações de show."
            />
            <StepCard
              number="03"
              icon={Music}
              title="Faça acontecer"
              description="Alinhe detalhes, assine o contrato digital e receba o pagamento seguro pela plataforma. Após o show, ambos avaliam a experiência."
            />
          </div>
        </div>
      </section>

      {/* ── FUNCIONALIDADES ── */}
      <section className="border-y border-border/30 bg-card/20 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>Funcionalidades</SectionLabel>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Uma plataforma{' '}
              <GradientText>completa</GradientText>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Tudo integrado em um único lugar para facilitar sua vida artística e profissional.
            </p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Globe,
                title: 'Perfil & EPK',
                desc: 'Página profissional pública com bio, mídia e repertório.',
              },
              {
                icon: Calendar,
                title: 'Agenda',
                desc: 'Controle de disponibilidade com bloqueio automático de conflitos.',
              },
              {
                icon: CreditCard,
                title: 'Pagamentos',
                desc: 'Gateway seguro com taxa transparente e split automático.',
              },
              {
                icon: TrendingUp,
                title: 'Financeiro',
                desc: 'Dashboard completo de receitas, despesas e resultado.',
              },
              {
                icon: FileText,
                title: 'Contratos',
                desc: 'Propostas formais com assinatura digital integrada.',
              },
              {
                icon: Users,
                title: 'Equipe & Técnica',
                desc: 'Gerencie integrantes e equipamentos de cada show.',
              },
              {
                icon: Star,
                title: 'Avaliações',
                desc: 'Sistema de reviews com nota e fotos após cada evento.',
              },
              {
                icon: Smartphone,
                title: 'App (PWA)',
                desc: 'Instale no celular como app nativo. Funciona offline e com notificações.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group flex items-start gap-3 rounded-xl border border-border/40 bg-card/30 p-4 transition-all hover:border-primary/20 hover:bg-card/60"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <f.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">{f.title}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="relative py-24 sm:py-32">
        {/* bg glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/[0.08] blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Pronto para levar sua carreira{' '}
            <GradientText>ao próximo nível?</GradientText>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Junte-se a centenas de artistas que já estão crescendo com o Reprissa. Cadastro gratuito, sem compromisso.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" className="gap-2 rounded-xl px-8 text-base shadow-lg shadow-purple-500/25" asChild>
              <Link to="/register">
                Começar agora <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="gap-2 rounded-xl px-8 text-base" asChild>
              <Link to="/artistas">Ver artistas</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Grátis para sempre · Sem cartão de crédito · Comece em 5 minutos
          </p>
        </div>
      </section>
    </main>
  )
}
