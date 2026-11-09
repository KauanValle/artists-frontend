import type { AxiosResponse } from 'axios'
import { loadSession } from '@/services/api'
import type {
  Booking,
  BookingStatus,
  Conversation,
  Epk,
  Equipment,
  EventItem,
  FinancialSummary,
  Message,
  Proposal,
  Review,
  SocialLink,
  TeamMember,
  Transaction,
} from '@/types'

/**
 * Dados fake do tutorial de onboarding — apenas no frontend (nunca salvos no banco).
 * Aparecem para artistas com tutorial em andamento e somem quando ele é concluído:
 * o mesmo usuário/sessão passa a receber os dados reais das APIs.
 */

/** Id gerado pela camada demo (ex.: "demo-...") — ações sobre ele ficam em memória. */
export function ehIdDemo(id?: string | null): boolean {
  return !!id && id.startsWith('demo-')
}

export function demoAtivo(): boolean {
  const user = loadSession()?.user
  const ativo = !!user && user.role === 'Artist' && user.tutorialFeito === false
  if (ativo !== demoLigadoAnterior) {
    demoLigadoAnterior = ativo
    if (!ativo) resetDemo()
  }
  return ativo
}

let demoLigadoAnterior: boolean | null = null

// ─────────────────────────── utilidades ───────────────────────────

const hoje = new Date()
const dia = (deltaDias: number): string => {
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + deltaDias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const iso = (deltaDias: number, hora = '20:00'): string => `${dia(deltaDias)}T${hora}:00`
const agoraIso = (): string => new Date().toISOString()

const svgFoto = (cor: string, rotulo: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="${cor}"/><text x="50%" y="50%" fill="#ffffff" font-family="Arial" font-size="28" text-anchor="middle" dominant-baseline="middle">${rotulo}</text></svg>`
  )}`

const fotoPalco = svgFoto('#4c1d95', 'Palco')
const fotoBalada = svgFoto('#9d174d', 'Balada')
const fotoCasamento = svgFoto('#b45309', 'Festa')

// ─────────────────────────── Shows (um exemplo de cada status) ───────────────────────────

type DemoBooking = Booking

let _bookings: DemoBooking[] = []
let _events: EventItem[] = []
let _transactions: Transaction[] = []
let _team: TeamMember[] = []
let _equipment: Equipment[] = []
let _reviews: Review[] = []
let _proposals: Proposal[] = []
let _conversas: Record<string, Message[]> = {}
let _epk: Epk | null = null
let _socialLinks: SocialLink[] = []

function fabricar(): void {
  const mk = (
    n: number,
    status: BookingStatus,
    contractor: string,
    delta: number,
    titulo: string,
    budget: number,
    extra: Partial<Booking> = {}
  ): Booking => ({
    id: `demo-booking-${String(n).padStart(2, '0')}`,
    artistId: 'demo-artista',
    artistName: 'Você (demo)',
    artistPhotoUrl: null,
    contractorId: `demo-contratante-${n}`,
    contractorName: contractor,
    isGuest: false,
    guestCompanyName: null,
    guestPhone: null,
    eventDate: dia(delta),
    startTime: '20:00',
    endTime: '23:00',
    location: titulo,
    eventType: 'Show',
    estimatedAudience: 150,
    budget,
    message: 'Mensagem de exemplo do contratante.',
    status,
    eventId: null,
    acceptedProposalId: null,
    conversationId: `demo-conversa-${n}`,
    createdAt: iso(delta - 7, '10:00'),
    addons: [],
    ...extra,
  })

  // Um exemplo de cada status existente hoje.
  _bookings = [
    mk(1, 'Requested', 'Ana Ribeiro', 5, 'Casamento Ana & Pedro — Sítio Vista Alegre', 1800, { eventType: 'Show', message: 'Oi! Gostaria de um acústico para a cerimônia.' }),
    mk(2, 'Negotiating', 'Bar do Zé', 12, 'Bar do Zé — Quiosque da praça', 900, { message: 'Podemos ajustar o horário para 21h?' }),
    mk(3, 'Proposed', 'Eventura Produções', 20, 'Festa corporativa Eventura', 2500, { eventType: 'Show' }),
    mk(4, 'Accepted', 'Clube Harmonia', 8, 'Baile do Clube Harmonia', 1400, { eventType: 'Show' }),
    mk(5, 'AwaitingPayment', 'Mariana Costa', 15, 'Aniversário de 30 da Mariana', 1200, { eventType: 'Show' }),
    mk(6, 'Confirmed', 'Prefeitura de Sorocaba', 3, 'Virada Cultural — Palco Central', 3200, { eventType: 'Show', estimatedAudience: 800, eventId: 'demo-evento-1', startTime: '19:00' }),
    mk(7, 'AwaitingCompletionAccept', 'Restaurante Sabor & Arte', -1, 'Jantar musical Sabor & Arte', 1000, { eventId: 'demo-evento-2', eventType: 'Show' }),
    mk(8, 'Completed', 'Cond. Green Life', -10, 'Festa junina Green Life', 1600, { eventId: 'demo-evento-3', eventType: 'Show' }),
    mk(9, 'Cancelled', 'Pedro Almeida', -4, 'Chá revelation Almeida', 800, { eventType: 'Other' }),
    mk(10, 'Rejected', 'LL Eventos', -6, 'Launch de produto LL', 2200, { eventType: 'Show', message: 'Proposta fora do orçamento.' }),
    mk(11, 'Expired', 'Feira Municipal', -8, 'Feira Gastronômica Municipal', 700, { eventType: 'Show' }),
    mk(12, 'AwaitingAccount', 'Turma do Ensino Médio', 18, 'Formatura Turma 2026', 1500, { eventType: 'Show' }),
    // Convidado (sem cadastro) também aparece no fluxo
    mk(13, 'Requested', 'Visitante do site', 9, 'Formatura INB — via link público', 950, { isGuest: true, guestCompanyName: 'INB Colégio', guestPhone: '11999990000' }),
  ]

  _events = [
    { id: 'demo-evento-1', artistId: 'demo-artista', contractorId: null, bookingRequestId: null, title: 'Virada Cultural — Palco Central', type: 'Show', startDateTime: iso(3, '19:00'), endDateTime: iso(3, '23:00'), location: 'Praça Central', description: 'Show confirmado para a cidade.', status: 'Confirmed' },
    { id: 'demo-evento-2', artistId: 'demo-artista', contractorId: null, bookingRequestId: null, title: 'Jantar musical Sabor & Arte', type: 'Show', startDateTime: iso(-1, '20:00'), endDateTime: iso(-1, '23:00'), location: 'Restaurante Sabor & Arte', description: 'Aguardando confirmação do contratante.', status: 'Confirmed' },
    { id: 'demo-evento-3', artistId: 'demo-artista', contractorId: null, bookingRequestId: null, title: 'Festa junina Green Life', type: 'Show', startDateTime: iso(-10, '20:00'), endDateTime: iso(-10, '23:00'), location: 'Cond. Green Life', description: 'Show já realizado.', status: 'Completed' },
    { id: 'demo-evento-4', artistId: 'demo-artista', contractorId: null, bookingRequestId: null, title: 'Ensaio da banda', type: 'Rehearsal', startDateTime: iso(2, '14:00'), endDateTime: iso(2, '17:00'), location: 'Estúdio Ensaio Livre', description: 'Ensaio semanal.', status: 'Scheduled' },
    { id: 'demo-evento-5', artistId: 'demo-artista', contractorId: null, bookingRequestId: null, title: 'Reunião com produtor', type: 'Meeting', startDateTime: iso(1, '10:00'), endDateTime: iso(1, '11:00'), location: 'Online', description: 'Alinhamento de datas.', status: 'Scheduled' },
    { id: 'demo-evento-6', artistId: 'demo-artista', contractorId: null, bookingRequestId: null, title: 'Festa de lançamento (pré-reserva)', type: 'Show', startDateTime: iso(15, '22:00'), endDateTime: iso(16, '02:00'), location: 'Balada Neon', description: 'Pré-reserva de visitante.', status: 'PreReserved' },
  ]

  _transactions = [
    { id: 'demo-trans-1', type: 'Income', category: 'Show', amount: 1600, dueDate: dia(-10), settlementDate: dia(-9), status: 'Received', eventId: 'demo-evento-3', eventTitle: 'Festa junina Green Life', notes: 'Cachê do show realizado.', createdAt: iso(-12, '09:00') },
    { id: 'demo-trans-2', type: 'Income', category: 'Show', amount: 3200, dueDate: dia(3), settlementDate: null, status: 'Pending', eventId: 'demo-evento-1', eventTitle: 'Virada Cultural — Palco Central', notes: 'A receber após o show.', createdAt: iso(-5, '09:00') },
    { id: 'demo-trans-3', type: 'Expense', category: 'Som e iluminação', amount: 350, dueDate: dia(2), settlementDate: null, status: 'Pending', eventId: 'demo-evento-1', eventTitle: 'Virada Cultural — Palco Central', notes: 'Aluguel de caixas.', createdAt: iso(-4, '09:00') },
    { id: 'demo-trans-4', type: 'Expense', category: 'Transporte', amount: 120, dueDate: dia(-8), settlementDate: dia(-8), status: 'Paid', eventId: 'demo-evento-3', eventTitle: 'Festa junina Green Life', notes: 'Combustível.', createdAt: iso(-9, '09:00') },
    { id: 'demo-trans-5', type: 'Expense', category: 'Divulgação', amount: 90, dueDate: dia(-3), settlementDate: null, status: 'Overdue', eventId: null, eventTitle: null, notes: 'Impulsionamento de post.', createdAt: iso(-6, '09:00') },
    { id: 'demo-trans-6', type: 'Income', category: 'Aula particular', amount: 240, dueDate: dia(6), settlementDate: null, status: 'Pending', eventId: null, eventTitle: null, notes: 'Pacote de 4 aulas.', createdAt: iso(-2, '09:00') },
  ]

  _team = [
    { id: 'demo-equipe-1', name: 'Rafael Torres', photoUrl: '', role: 'Tecladista', phone: '11988887777', email: 'rafa@demo.com', allocationType: 'Interno', defaultShareType: 'Percentage', defaultShareValue: 15, notes: 'Integrante fixo da banda.' },
    { id: 'demo-equipe-2', name: 'Júlia Prado', photoUrl: '', role: 'Backing vocal', phone: '11988886666', email: 'julia@demo.com', allocationType: 'Interno', defaultShareType: 'Percentage', defaultShareValue: 10, notes: '' },
    { id: 'demo-equipe-3', name: 'Carlos Mendes', photoUrl: '', role: 'Técnico de som', phone: '11977775555', email: '', allocationType: 'Externo', defaultShareType: 'Fixed', defaultShareValue: 250, notes: 'Contratado por evento.' },
    { id: 'demo-equipe-4', name: 'Bia Camargo', photoUrl: '', role: 'Fotógrafa', phone: '', email: 'bia@demo.com', allocationType: 'Externo', defaultShareType: 'Fixed', defaultShareValue: 300, notes: 'Cobre shows importantes.' },
  ]

  _equipment = [
    { id: 'demo-equip-1', name: 'Controladora DDJ-1000', category: 'Mesa', brand: 'Pioneer', model: 'DDJ-1000', identifier: 'PIO-001', weightKg: 6, value: 6500, allocationType: 'Interno', shareType: 'Fixed', shareValue: 0, status: 'Available', notes: 'Equipamento próprio.' },
    { id: 'demo-equip-2', name: 'Caixa de som KRK', category: 'Áudio', brand: 'KRK', model: 'Rokit 8', identifier: 'KRK-002', weightKg: 10, value: 2200, allocationType: 'Interno', shareType: 'Fixed', shareValue: 0, status: 'Available', notes: '' },
    { id: 'demo-equip-3', name: 'Ilha de som 4000W', category: 'Áudio', brand: 'ProAudio', model: 'IS-4000', identifier: 'PRO-003', weightKg: 45, value: null, allocationType: 'Externo', shareType: 'Fixed', shareValue: 600, status: 'Available', notes: 'Locada por evento.' },
    { id: 'demo-equip-4', name: 'Moving head LED', category: 'Iluminação', brand: 'BeamZ', model: 'MH-150', identifier: 'BEAM-004', weightKg: 12, value: null, allocationType: 'Externo', shareType: 'Fixed', shareValue: 180, status: 'Available', notes: 'Par de movers.' },
  ]

  _reviews = [
    { id: 'demo-review-1', artistId: 'demo-artista', contractorId: 'demo-contratante-6', contractorName: 'Prefeitura de Sorocaba', eventId: 'demo-evento-1', overallRating: 5, punctuality: 5, quality: 5, professionalism: 5, communication: 5, comment: 'Show incrível! Público embalou do início ao fim. Pontualidade impecável e comunicação muito fácil. Já estamos marcando o próximo ano!', createdAt: iso(-2, '18:00'), photos: [fotoPalco, fotoBalada] },
    { id: 'demo-review-2', artistId: 'demo-artista', contractorId: 'demo-contratante-8', contractorName: 'Cond. Green Life', eventId: 'demo-evento-3', overallRating: 4, punctuality: 4, quality: 5, professionalism: 4, communication: 4, comment: 'Ótima apresentação na festa junina, todos adoraram. Atrasou uns minutinhos na montagem, mas o resultado valeu!', createdAt: iso(-9, '18:00'), photos: [fotoCasamento] },
  ]

  const negotiating = _bookings.find((b) => b.status === 'Negotiating')
  _proposals = negotiating
    ? [
        {
          id: 'demo-proposta-1',
          bookingRequestId: negotiating.id,
          artistId: 'demo-artista',
          contractorId: negotiating.contractorId ?? 'demo-contratante-2',
          status: 'Pending',
          items: [
            { id: 'demo-item-1', description: 'Show completo (3h)', amount: 800 },
            { id: 'demo-item-2', description: 'Transporte de equipamentos', amount: 150 },
          ],
          travelCost: 150,
          equipmentCost: 0,
          discount: 50,
          finalAmount: 900,
          validUntil: dia(7),
          notes: 'Proposta com desconto de cortesia para o primeiro show.',
          respondedAt: null,
          createdAt: iso(-2, '11:00'),
        },
      ]
    : []

  _conversas = Object.fromEntries(
    _bookings.map((b) => [
      b.conversationId,
      [
        { id: 'demo-msg-1', senderUserId: b.contractorId ?? 'x', senderName: b.contractorName, content: `Olá! Tudo bem? Queria saber mais sobre o show em ${b.location}.`, sentAt: iso(-3, '09:30'), isRead: true },
        { id: 'demo-msg-2', senderUserId: 'demo-artista', senderName: 'Você', content: 'Ola! Claro, tenho datas disponíveis esse mês. Podemos alinhar o repertório também.', sentAt: iso(-3, '10:00'), isRead: true },
        { id: 'demo-msg-3', senderUserId: b.contractorId ?? 'x', senderName: b.contractorName, content: 'Perfeito! Vou verificar e te retorno hoje.', sentAt: iso(-3, '10:15'), isRead: false },
      ],
    ])
  )

  _epk = {
    artistId: 'demo-artista',
    bio: 'DJ e produtor com mais de 8 anos de estrada. Sets que misturam house, pop e brasilidade — do casamento ao palco principal da cidade. Estrutura completa de som e iluminação para eventos de até 800 pessoas.',
    photoUrls: [fotoPalco, fotoBalada, fotoCasamento],
    videoUrls: [],
    songs: ['Abertura — House Mix', 'Set Brasilidade', 'Encore — Pop Dance'],
    spotifyUrl: 'https://open.spotify.com/',
    youTubeUrl: null,
    soundCloudUrl: null,
    spotifyPlaylistUrl: null,
    corDestaque: '#7C3AED',
  }

  _socialLinks = [
    { artistId: 'demo-artista', platform: 'Instagram', handle: '@dj.demo', url: 'https://instagram.com/' },
    { artistId: 'demo-artista', platform: 'YouTube', handle: 'DJ Demo', url: 'https://youtube.com/' },
  ]
}

fabricar()
demoLigadoAnterior = demoAtivoBruto()

function demoAtivoBruto(): boolean {
  const user = loadSession()?.user
  return !!user && user.role === 'Artist' && user.tutorialFeito === false
}

function resetDemo(): void {
  fabricar()
}

export const demoResposta = <T,>(data: T): Promise<AxiosResponse<T>> =>
  Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config: {} } as AxiosResponse<T>)

const resposta = demoResposta

// ─────────────────────────── helpers de página/filtro ───────────────────────────

function pagina<T>(itens: T[], page = 1, pageSize = 50): { items: T[]; page: number; pageSize: number; totalCount: number } {
  const inicio = (page - 1) * pageSize
  return { items: itens.slice(inicio, inicio + pageSize), page, pageSize, totalCount: itens.length }
}

export function demoBookingsList(params: {
  status?: string
  page?: number
  pageSize?: number
  busca?: string
  ordenarPor?: string
  direcao?: string
}, extras: import('@/types').Booking[] = []): Promise<AxiosResponse<import('@/types').PagedResult<import('@/types').Booking>>> {
  let itens = [...extras, ..._bookings]
  if (params.status) itens = itens.filter((b) => b.status === params.status)
  if (params.busca) {
    const q = params.busca.toLowerCase()
    itens = itens.filter(
      (b) =>
        b.contractorName.toLowerCase().includes(q) ||
        b.location.toLowerCase().includes(q) ||
        b.eventType.toLowerCase().includes(q)
    )
  }
  const direcaoDesc = (params.direcao ?? 'desc') !== 'asc'
  const campo = params.ordenarPor === 'createdAt' ? 'createdAt' : 'eventDate'
  itens.sort((a, b) => {
    const cmp = campo === 'createdAt' ? a.createdAt.localeCompare(b.createdAt) : a.eventDate.localeCompare(b.eventDate)
    return direcaoDesc ? -cmp : cmp
  })
  return resposta(pagina(itens, params.page, params.pageSize))
}

export function demoBookingsGet(id: string): Promise<AxiosResponse<Booking | null>> {
  return resposta(_bookings.find((b) => b.id === id) ?? null)
}

function acharBooking(id: string): DemoBooking | undefined {
  return _bookings.find((b) => b.id === id)
}

export function demoBookingAcao(id: string, novoStatus: BookingStatus): void {
  const b = acharBooking(id)
  if (b) b.status = novoStatus
}

export function demoBookingStartPayment(id: string) {
  demoBookingAcao(id, 'Confirmed')
  return resposta({ checkoutUrl: '#' })
}

/** Aplica a ação e devolve a booking atualizada já embalada em AxiosResponse-like. */
export function demoBookingAcaoRet(id: string, novoStatus: BookingStatus): Promise<AxiosResponse<Booking>> {
  demoBookingAcao(id, novoStatus)
  const b = acharBooking(id)
  return resposta(b as Booking)
}

/** Conclusão demo: gera token público como o backend faria. */
export function demoBookingCompleteRet(id: string): Promise<AxiosResponse<import('@/types').CompleteShow>> {
  demoBookingAcao(id, 'AwaitingCompletionAccept')
  return resposta({
    bookingId: id,
    status: 'AwaitingCompletionAccept',
    artistConfirmed: true,
    contractorConfirmed: false,
    contractorToken: 'demo-token-' + id.slice(0, 8),
  })
}

// ─────────────────────────── agenda ───────────────────────────

export function demoEventsList(params: { from?: string; to?: string; type?: string; status?: string }, extras: import('@/types').EventItem[] = []): Promise<AxiosResponse<import('@/types').EventItem[]>> {
  let itens = [...extras, ..._events]
  if (params.from) itens = itens.filter((e) => e.startDateTime.slice(0, 10) >= params.from!)
  if (params.to) itens = itens.filter((e) => e.startDateTime.slice(0, 10) <= params.to!)
  if (params.type) itens = itens.filter((e) => e.type === params.type)
  if (params.status) itens = itens.filter((e) => e.status === params.status)
  itens.sort((a, b) => a.startDateTime.localeCompare(b.startDateTime))
  return resposta(itens)
}

export function demoEventUpdate(id: string, payload: Partial<EventItem>): void {
  const e = _events.find((x) => x.id === id)
  if (e) Object.assign(e, payload)
}

export function demoEventRemove(id: string): void {
  _events = _events.filter((e) => e.id !== id)
}

// ─────────────────────────── financeiro ───────────────────────────

function calcularSummaryDemo(from?: string, to?: string): FinancialSummary {
  const noPeriodo = _transactions.filter(
    (t) => (!from || (t.dueDate ?? '') >= from) && (!to || (t.dueDate ?? '') <= to)
  )
  const income = noPeriodo.filter((t) => t.type === 'Income')
  const expense = noPeriodo.filter((t) => t.type === 'Expense')
  const incomeExpected = income.reduce((s, t) => s + t.amount, 0)
  const expenseTotal = expense.reduce((s, t) => s + t.amount, 0)
  return {
    from: from ?? null,
    to: to ?? null,
    incomeExpected,
    incomeReceived: income.filter((t) => t.status === 'Received').reduce((s, t) => s + t.amount, 0),
    incomePending: income.filter((t) => t.status !== 'Received').reduce((s, t) => s + t.amount, 0),
    expenseTotal,
    expensePaid: expense.filter((t) => t.status === 'Paid').reduce((s, t) => s + t.amount, 0),
    expensePending: expense.filter((t) => t.status !== 'Paid').reduce((s, t) => s + t.amount, 0),
    result: incomeExpected - expenseTotal,
    accountsReceivable: income.filter((t) => t.status !== 'Received').reduce((s, t) => s + t.amount, 0),
    upcomingShowsCount: _events.filter((e) => e.status === 'Confirmed' && e.startDateTime.slice(0, 10) >= dia(0)).length,
  }
}

export function demoSummarySomado(
  real: FinancialSummary,
  from?: string,
  to?: string
): Promise<AxiosResponse<FinancialSummary>> {
  const demo = calcularSummaryDemo(from, to)
  return resposta({
    ...real,
    incomeExpected: real.incomeExpected + demo.incomeExpected,
    incomeReceived: real.incomeReceived + demo.incomeReceived,
    incomePending: real.incomePending + demo.incomePending,
    expenseTotal: real.expenseTotal + demo.expenseTotal,
    expensePaid: real.expensePaid + demo.expensePaid,
    expensePending: real.expensePending + demo.expensePending,
    result: real.result + demo.result,
    accountsReceivable: real.accountsReceivable + demo.accountsReceivable,
    upcomingShowsCount: real.upcomingShowsCount + demo.upcomingShowsCount,
  })
}

export function demoTransactionsList(params: {
  type?: string
  status?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
  ordenarPor?: string
  direcao?: string
}, extras: import('@/types').Transaction[] = []): Promise<AxiosResponse<import('@/types').PagedResult<Transaction>>> {
  let itens = [...extras, ..._transactions]
  if (params.type) itens = itens.filter((t) => t.type === params.type)
  if (params.status) itens = itens.filter((t) => t.status === params.status)
  if (params.from) itens = itens.filter((t) => (t.dueDate ?? '') >= params.from!)
  if (params.to) itens = itens.filter((t) => (t.dueDate ?? '') <= params.to!)
  const direcaoDesc = (params.direcao ?? 'desc') !== 'asc'
  const campo = params.ordenarPor === 'amount' ? 'amount' : 'dueDate'
  itens.sort((a, b) => {
    const av = campo === 'amount' ? a.amount : a.dueDate ?? ''
    const bv = campo === 'amount' ? b.amount : b.dueDate ?? ''
    return direcaoDesc ? (av < bv ? 1 : -1) : av < bv ? -1 : 1
  })
  return resposta(pagina(itens, params.page, params.pageSize))
}

export function demoTransactionUpdate(id: string, payload: Record<string, unknown>): Promise<AxiosResponse<Transaction>> {
  const t = _transactions.find((x) => x.id === id)
  if (t) Object.assign(t, payload)
  return resposta(t as Transaction)
}

export function demoTransactionRemove(id: string): void {
  _transactions = _transactions.filter((t) => t.id !== id)
}

export function demoTransactionSettle(id: string): Promise<AxiosResponse<Transaction>> {
  const t = _transactions.find((x) => x.id === id)
  if (t) {
    t.status = t.type === 'Expense' ? 'Paid' : 'Received'
    t.settlementDate = dia(0)
  }
  return resposta(t as Transaction)
}

// ─────────────────────────── equipe e equipamentos ───────────────────────────

export function demoTeamList(extras: TeamMember[] = []): Promise<AxiosResponse<TeamMember[]>> {
  return resposta([..._team, ...extras])
}

export function demoTeamUpdate(id: string, payload: import('@/types').SaveTeamMemberPayload): Promise<AxiosResponse<TeamMember>> {
  const m = _team.find((x) => x.id === id)
  if (m) Object.assign(m, payload)
  return resposta(m as TeamMember)
}

export function demoTeamRemove(id: string): void {
  _team = _team.filter((m) => m.id !== id)
}

export function demoEquipmentList(status?: string, extras: Equipment[] = []): Promise<AxiosResponse<Equipment[]>> {
  let itens = [...extras, ..._equipment]
  if (status) itens = itens.filter((e) => e.status === status)
  return resposta(itens)
}

export function demoEquipmentUpdate(id: string, payload: import('@/types').SaveEquipmentPayload): Promise<AxiosResponse<Equipment>> {
  const e = _equipment.find((x) => x.id === id)
  if (e) Object.assign(e, payload)
  return resposta(e as Equipment)
}

export function demoEquipmentRemove(id: string): void {
  _equipment = _equipment.filter((e) => e.id !== id)
}

// ─────────────────────────── avaliações recebidas ───────────────────────────

export function demoReviewsReceived(extras: Review[] = []): Promise<AxiosResponse<Review[]>> {
  return resposta([...extras, ..._reviews])
}

// ─────────────────────────── propostas e conversas ───────────────────────────

export function demoProposalsForBooking(bookingId: string): Promise<AxiosResponse<Proposal[]>> {
  return resposta(_proposals.filter((p) => p.bookingRequestId === bookingId))
}

export function demoProposalAccept(id: string): Promise<AxiosResponse<Proposal>> {
  const p = _proposals.find((x) => x.id === id)
  if (p) {
    p.status = 'Accepted'
    const b = acharBooking(p.bookingRequestId)
    if (b) b.status = 'Accepted'
  }
  return resposta(p as Proposal)
}

export function demoProposalReject(id: string): Promise<AxiosResponse<Proposal>> {
  const p = _proposals.find((x) => x.id === id)
  if (p) {
    p.status = 'Rejected'
    const b = acharBooking(p.bookingRequestId)
    if (b) b.status = 'Rejected'
  }
  return resposta(p as Proposal)
}

export function demoProposalCreate(bookingId: string, finalAmount: number): Promise<AxiosResponse<Proposal>> {
  const p: Proposal = {
    id: `demo-proposta-${Math.random().toString(36).slice(2, 8)}`,
    bookingRequestId: bookingId,
    artistId: 'demo-artista',
    contractorId: acharBooking(bookingId)?.contractorId ?? 'demo-contratante',
    status: 'Pending',
    items: [{ id: `demo-item-${Math.random().toString(36).slice(2, 6)}`, description: 'Show completo', amount: finalAmount }],
    travelCost: 0,
    equipmentCost: 0,
    discount: 0,
    finalAmount,
    validUntil: dia(7),
    notes: '',
    respondedAt: null,
    createdAt: agoraIso(),
  }
  _proposals.push(p)
  const b = acharBooking(bookingId)
  if (b) b.status = 'Proposed'
  return resposta(p)
}

export function demoConversationGet(conversationId: string): Promise<AxiosResponse<{ conversation: Conversation; messages: Message[] }>> {
  const booking = _bookings.find((b) => b.conversationId === conversationId)
  if (!booking) {
    return resposta({
      conversation: {
        id: conversationId,
        bookingRequestId: '',
        otherUserId: '',
        otherUserName: 'Contratante',
        otherUserPhotoUrl: null,
        lastMessage: null,
        lastMessageAt: null,
        unreadCount: 0,
      },
      messages: [],
    })
  }
  const mensagens = _conversas[conversationId] ?? []
  return resposta({
    conversation: {
      id: conversationId,
      bookingRequestId: booking.id,
      otherUserId: booking.contractorId ?? 'x',
      otherUserName: booking.contractorName,
      otherUserPhotoUrl: null,
      lastMessage: mensagens[mensagens.length - 1]?.content ?? null,
      lastMessageAt: mensagens[mensagens.length - 1]?.sentAt ?? null,
      unreadCount: 0,
    },
    messages: mensagens,
  })
}

export function demoMessageSend(conversationId: string, content: string): Promise<AxiosResponse<Message>> {
  const msg: Message = {
    id: `demo-msg-${Math.random().toString(36).slice(2, 8)}`,
    senderUserId: 'demo-artista',
    senderName: 'Você',
    content,
    sentAt: agoraIso(),
    isRead: true,
  }
  ;(_conversas[conversationId] ??= []).push(msg)
  return resposta(msg)
}

// ─────────────────────────── EPK e redes sociais ───────────────────────────

export function demoEpkGet(artistId: string): Epk {
  return { ...(_epk ?? { ...(_epk = { artistId, bio: '', photoUrls: [], videoUrls: [], songs: [], spotifyUrl: null, youTubeUrl: null, soundCloudUrl: null, spotifyPlaylistUrl: null, corDestaque: null }) }), artistId }
}

export function demoEpkSave(payload: Partial<Epk>): Promise<AxiosResponse<Epk>> {
  _epk = { ...(_epk ?? { artistId: 'demo-artista', bio: '', photoUrls: [], videoUrls: [], songs: [], spotifyUrl: null, youTubeUrl: null, soundCloudUrl: null, spotifyPlaylistUrl: null, corDestaque: null }), ...payload }
  return resposta(_epk as Epk)
}

export function demoSocialLinksList(): SocialLink[] {
  return _socialLinks
}

export function demoSocialLinkSave(payload: { platform: string; handle: string }): Promise<AxiosResponse<SocialLink>> {
  const existente = _socialLinks.find((s) => s.platform === payload.platform)
  if (existente) {
    existente.handle = payload.handle
    return resposta(existente)
  }
  const novo: SocialLink = { artistId: 'demo-artista', platform: payload.platform, handle: payload.handle, url: '' }
  _socialLinks.push(novo)
  return resposta(novo)
}
