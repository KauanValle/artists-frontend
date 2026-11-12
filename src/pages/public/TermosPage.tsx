import { FileText } from 'lucide-react'

const secoes: { titulo: string; paragrafos: string[] }[] = [
  {
    titulo: '1. Aceitação dos termos',
    paragrafos: [
      'Estes Termos de Uso regulamentam o acesso e a utilização da plataforma Reprissa ("Plataforma"), operada para conectar artistas e contratantes de eventos. Ao criar conta, acessar ou utilizar qualquer recurso da Plataforma, você declara ter lido, compreendido e aceito integralmente estes Termos.',
      'Se você não concorda com qualquer disposição aqui prevista, não utilize a Plataforma.',
    ],
  },
  {
    titulo: '2. Cadastro e contas',
    paragrafos: [
      'O cadastro é gratuito e exige informações verdadeiras, completas e atualizadas. O usuário é responsável pela confidencialidade de suas credenciais e por toda atividade realizada em sua conta.',
      'Perfis de artista devem representar a pessoa ou grupo contratável de forma fiel — nome artístico, categoria, fotos e materiais do EPK não podem induzir terceiros a erro.',
      'É vedada a criação de contas duplicadas, o uso de contas de terceiros e a utilização da Plataforma para finalidades ilícitas.',
    ],
  },
  {
    titulo: '3. Natureza do serviço',
    paragrafos: [
      'A Reprissa é um marketplace intermediador: disponibiliza vitrine, ferramentas de negociação, agendamento, pagamento e avaliação. O contrato de execução do show é celebrado diretamente entre contratante e artista.',
      'A Plataforma não emprega, representa nem garante juridicamente as partes; atua, contudo, como agente de pagamento do show contratado por meio do gateway integrado, assegurando que o valor combinado seja processado com segurança.',
    ],
  },
  {
    titulo: '4. Contratações, propostas e pagamento',
    paragrafos: [
      'Propostas, aceites e alterações registrados na Plataforma fazem parte do histórico da contratação e servem como registro das condições combinadas entre as partes.',
      'O pagamento do show é obrigatoriamente realizado pelos meios disponibilizados na Plataforma. Uma taxa administrativa percentual é descontada do artista no momento do saque do cachê. O contratante paga apenas o valor acordado do show.',
      'O show somente é considerado confirmado após a confirmação do pagamento, e somente é concluído mediante confirmação de ambas as partes (artista e contratante), diretamente no painel ou pelo link de confirmação enviado ao contratante.',
    ],
  },
  {
    titulo: '5. Cancelamentos e reembolsos',
    paragrafos: [
      'O cancelamento pode ser solicitado pelas partes na Plataforma e depende do momento em que ocorre em relação ao evento e ao pagamento. Valores já pagos serão devolvidos ao contratante quando aplicável, deduzidos eventuais custos irreversíveis do meio de pagamento.',
      'O artista que descumprir show confirmado sem justa causa poderá ter seu perfil suspensa após análise.',
    ],
  },
  {
    titulo: '6. Avaliações',
    paragrafos: [
      'Após a conclusão do show, o contratante pode avaliar o artista com nota, comentário e fotos. Avaliações devem refletir a experiência real, sendo vedado conteúdo ofensivo, difamatório, ilegal ou que exponha indevidamente terceiros.',
      'Avaliações publicadas não podem ser editadas ou excluídas pelo contratante, ressalvada a remoção de conteúdo que viole estes Termos, a critério da Plataforma.',
    ],
  },
  {
    titulo: '7. Conduta e conteúdo',
    paragrafos: [
      'São vedados: contornar o pagamento pela Plataforma para contratações iniciadas nela; publicar conteúdo que viole direitos de terceiros; praticar spam, fraude ou qualquer forma de abuso.',
      'O usuário concede à Plataforma licença não exclusiva para exibir os conteúdos que publica (fotos, vídeos, descrições) exclusivamente para fins de operação e divulgação do serviço.',
    ],
  },
  {
    titulo: '8. Privacidade e dados pessoais',
    paragrafos: [
      'O tratamento de dados pessoais segue a Lei Geral de Proteção de Dados (LGPD) e a Política de Privacidade da Plataforma. Dados são utilizados para operar o serviço, processar pagamentos, prevenir fraudes e cumprir obrigações legais.',
      'Você pode solicitar acesso, correção ou exclusão de seus dados pelos canais de suporte, ressalvados os prazos legais de retenção.',
    ],
  },
  {
    titulo: '9. Propriedade intelectual',
    paragrafos: [
      'A marca Reprissa, o nome comercial, o layout e todos os componentes da Plataforma são protegidos por lei. O conteúdo publicado pelos usuários permanece de sua autoria, concedendo-se as licenças previstas na seção 7.',
    ],
  },
  {
    titulo: '10. Limitação de responsabilidade',
    paragrafos: [
      'A Plataforma envidará esforços comercialmente razoáveis para manter o serviço disponível e seguro, mas não responde por eventos inevitáveis (falhas de internet, indisponibilidade de terceiros, caso fortuito ou força maior).',
      'A responsabilidade da Plataforma perante qualquer usuário, por qualquer título, fica limitada ao valor da taxa administrativa arrecadada sobre as transações envolvidas na reclamação nos últimos 12 (doze) meses.',
    ],
  },
  {
    titulo: '11. Alterações e foro',
    paragrafos: [
      'Estes Termos podem ser atualizados; alterações relevantes serão comunicadas pelos canais da Plataforma e o uso continuado após a publicação implica concordância.',
      'Fica eleito o foro do domicílio do usuário para dirimir controvérsias oriundas destes Termos, aplicando-se a legislação brasileira.',
    ],
  },
]

export function TermosPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Termos de Uso</h1>
          <p className="text-sm text-muted-foreground">Última atualização: novembro de 2026</p>
        </div>
      </div>

      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        Bem-vindo à Reprissa. Leia com atenção os termos abaixo antes de utilizar a plataforma.
      </p>

      <div className="mt-6 space-y-6">
        {secoes.map((s) => (
          <section key={s.titulo}>
            <h2 className="text-base font-semibold">{s.titulo}</h2>
            {s.paragrafos.map((p, i) => (
              <p key={i} className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
