import { Link } from 'react-router-dom'
import { ChevronDown, MessageCircleQuestion } from 'lucide-react'

const faqs: { grupo: string; itens: { q: string; a: React.ReactNode }[] }[] = [
  {
    grupo: 'Contratação',
    itens: [
      {
        q: 'Como contrato um artista?',
        a: 'Busque pelo diretório de artistas usando filtros de categoria, cidade e orçamento, abra o perfil e escolha entre enviar uma proposta ou agendar direto, conforme a configuração do artista. Você acompanha todo o fluxo em "Solicitações".',
      },
      {
        q: 'O artista pode recusar ou negociar minha proposta?',
        a: 'Sim. O artista pode aceitar, recusar ou enviar uma contraproposta com novos itens e valores. A negociação fica registrada na solicitação até haver um aceite.',
      },
      {
        q: 'Como sei se a data está realmente disponível?',
        a: 'A agenda do artista é gerenciada por ele mesmo: dias de trabalho e janelas de horário. O sistema bloqueia automaticamente datas já ocupadas ou fora da disponibilidade — inclusive eventos que terminam após a meia-noite.',
      },
    ],
  },
  {
    grupo: 'Pagamento e taxas',
    itens: [
      {
        q: 'Como funciona o pagamento do show?',
        a: 'Após o aceite, o contratante paga pelo próprio site através do gateway seguro (InfinityPay — cartão ou PIX). Sem pagamento confirmado, o show não é finalizado.',
      },
      {
        q: 'O que é a taxa administrativa?',
        a: 'É uma taxa percentual sobre o valor do show, exibida de forma clara antes do pagamento. Exemplo: um show de R$ 100 com taxa de 5% resulta em R$ 105 cobrados do contratante — os R$ 100 continuam sendo do artista.',
      },
      {
        q: 'Quando o artista recebe o dinheiro?',
        a: 'A confirmação do pagamento é feita automaticamente pelo webhook do gateway assim que aprovado. O repasse segue o prazo do meio de pagamento escolhido pelo contratante (PIX costuma ser imediato).',
      },
    ],
  },
  {
    grupo: 'Shows e conclusão',
    itens: [
      {
        q: 'Como o show é concluído?',
        a: 'Com dupla confirmação: artista e contratante confirmam a realização — o contratante também pode confirmar por um link enviado a ele. Quando os dois confirmam, o show entra como concluído e libera a avaliação.',
      },
      {
        q: 'E se precisar cancelar?',
        a: 'O cancelamento é feito na solicitação do show. As partes são notificadas e a agenda do artista é liberada. Condições de reembolso seguem os Termos de Uso e o combinado entre as partes.',
      },
    ],
  },
  {
    grupo: 'Avaliações',
    itens: [
      {
        q: 'Quem pode avaliar um show?',
        a: 'Somente o contratante participante, depois que o show é concluído por ambas as partes. Cada show pode ser avaliado uma única vez.',
      },
      {
        q: 'O que posso incluir na avaliação?',
        a: 'Nota de 0 a 5 estrelas, um comentário e até 6 fotos. O artista recebe a notificação e a avaliação fica visível no seu histórico — ele não pode alterá-la nem removê-la.',
      },
    ],
  },
  {
    grupo: 'Contas e planos',
    itens: [
      {
        q: 'Preciso pagar para me cadastrar?',
        a: 'Não. O cadastro é gratuito para artistas e contratantes. Quando a assinatura de artistas está ativa, o plano Gratuito permite explorar a plataforma e o plano Assinante libera todos os recursos para receber contratações.',
      },
      {
        q: 'Posso ter perfil de artista e contratante ao mesmo tempo?',
        a: 'No cadastro você escolhe o papel inicial e pode alternar depois completando os dados do outro perfil. Cada perfil tem seu próprio painel.',
      },
    ],
  },
]

export function FaqPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <MessageCircleQuestion className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Perguntas frequentes</h1>
          <p className="text-sm text-muted-foreground">Tudo o que você precisa saber para usar a Reprissa</p>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {faqs.map((g) => (
          <section key={g.grupo}>
            <h2 className="text-base font-semibold">{g.grupo}</h2>
            <div className="mt-3 divide-y rounded-lg border">
              {g.itens.map((f) => (
                <details key={f.q} className="group px-4 py-3 open:bg-secondary/30">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        Não encontrou sua resposta? Fale com a gente pelo{' '}
        <Link to="/termos-de-uso" className="font-medium text-primary hover:underline">
          suporte indicado nos Termos de Uso
        </Link>
        .
      </p>
    </div>
  )
}
