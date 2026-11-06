import { Link } from 'react-router-dom'
import { BadgeCheck, CalendarCheck, Camera, CreditCard, Music, Star, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const beneficios = [
  {
    icon: <Music className="h-5 w-5" />,
    titulo: 'Para artistas',
    texto: 'Crie seu perfil profissional, monte um EPK público com fotos, vídeos e redes, publique seus serviços e receba propostas de contratantes de todo o Brasil.',
  },
  {
    icon: <Users className="h-5 w-5" />,
    titulo: 'Para contratantes',
    texto: 'Busque artistas por categoria, cidade, estilo e orçamento, converse direto com o talento e contrate com proposta formal ou agendamento direto.',
  },
  {
    icon: <CreditCard className="h-5 w-5" />,
    titulo: 'Pagamento protegido',
    texto: 'O pagamento do show é feito pelo próprio site via gateway seguro, com taxa administrativa transparente exibida antes de você pagar.',
  },
  {
    icon: <CalendarCheck className="h-5 w-5" />,
    titulo: 'Agenda inteligente',
    texto: 'O artista controla dias e janelas de disponibilidade; o sistema bloqueia datas conflitantes automaticamente, inclusive eventos que cruzam a meia-noite.',
  },
  {
    icon: <BadgeCheck className="h-5 w-5" />,
    titulo: 'Conclusão em dupla confirmação',
    texto: 'O show só é concluído quando artista e contratante confirmam — pelo painel ou pelo link de confirmação enviado ao contratante.',
  },
  {
    icon: <Star className="h-5 w-5" />,
    titulo: 'Avaliações reais',
    texto: 'Após o show concluído, o contratante avalia com estrelas, comentário e fotos. O histórico fortalece o artista e orienta novos contratantes.',
  },
]

export function SobrePage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Camera className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sobre a Reprissa</h1>
          <p className="text-sm text-muted-foreground">Conectando talentos a oportunidades</p>
        </div>
      </div>

      <div className="mt-6 space-y-4 text-sm leading-relaxed text-foreground/90">
        <p>
          A <strong>Reprissa</strong> é o marketplace que aproxima <strong>artistas</strong> e{' '}
          <strong>contratantes</strong>: aqui você descobre talentos, negocia datas, paga com segurança e avalia a
          experiência — tudo em um só lugar, do primeiro contato até o fim do show.
        </p>
        <p>
          Nossa missão é profissionalizar o mercado de eventos independentes. O artista ganha vitrine permanente com
          EPK, agenda organizada e histórico de avaliações; o contratante ganha transparência de preço, agenda real e
          um processo de contratação simples e seguro.
        </p>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Como a plataforma funciona</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {beneficios.map((b) => (
          <Card key={b.titulo}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-foreground">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">{b.icon}</span>
                <h3 className="text-sm font-semibold">{b.titulo}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.texto}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 rounded-lg border bg-secondary/40 p-5">
        <h2 className="text-base font-semibold">Pronto para começar?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie sua conta gratuita, complete o perfil em minutos e comece a contratar ou ser contratado.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/register"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Criar conta
          </Link>
          <Link
            to="/artistas"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Buscar artistas
          </Link>
        </div>
      </div>
    </div>
  )
}
