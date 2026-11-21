import {api, apiViaCep} from './api'
import * as demo from '../lib/demo-data'
import {
    Artist,
    ArtistCard,
    ArtistDetailPublic,
    Availability,
    Category,
    Contractor,
    CreateBookingPayload,
    CreateGuestBookingPayload,
    CreateProposalPayload,
    Conversation,
    Equipment,
    EventDetail,
    EventItem,
    Favorite,
    Fee,
    FinancialSummary,
    Message,
    Notification,
    PagedResult,
    Proposal,
    Review,
    PendingReview,
    SaveEquipmentPayload,
    SaveTeamMemberPayload,
    SaveArtistPayload,
    SaveAvailabilityPayload,
    SaveAvailabilityBatchPayload,
    SaveContractorPayload,
    SaveFeePayload,
    SearchArtistsParams,
    Transaction,
} from '@/types'

// Auth
interface AuthResponseLike {
  accessToken: string
  refreshToken: string
  expiresAtUtc: string
  user: import('@/types').User
}

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (payload: { name: string; email: string; password: string; referralCode?: string }) =>
    api.post<AuthResponseLike>('/auth/register', payload),
  google: (idToken: string) => api.post<AuthResponseLike>('/auth/google', { idToken }),
  registerArtist: (payload: Record<string, unknown>) => api.post('/auth/register/artist', payload),
  registerContractor: (payload: Record<string, unknown>) => api.post('/auth/register/contractor', payload),
  me: () => api.get('/auth/me'),
  salvarTutorial: (payload: { feito: boolean; passos: string[] }) =>
    api.put<import('@/types').User>('/auth/tutorial', payload),
  forgotPassword: (email: string) => api.post<{ token: string | null }>('/auth/forgot-password', { email }),
  resetPassword: (payload: { email: string; token: string; newPassword: string }) =>
    api.post('/auth/reset-password', payload),
}

// Artists / Marketplace
export const artistsApi = {
  search: (params: SearchArtistsParams) => api.get<PagedResult<ArtistCard>>('/artists/search', { params }),
  getPublic: (id: string) => api.get<ArtistDetailPublic>(`/artists/${id}`),
  getBySlug: (slug: string) => api.get<ArtistDetailPublic>(`/artists/slug/${slug}`),
  getMy: () => api.get<Artist>('/artists/me'),
  saveOnboarding: (payload: SaveArtistPayload) => api.put<Artist>('/artists/me', payload),
  publish: (publish: boolean) => api.put('/artists/me/publish', { publish }),
  categories: () => api.get<Category[]>('/categories'),
}

export const feesApi = {
  listByArtist: (artistId: string) => api.get<Fee[]>(`/artists/${artistId}/fees`),
  listMine: () => api.get<Fee[]>('/artists/me/fees'),
  create: (payload: SaveFeePayload) => api.post<Fee>('/artists/me/fees', payload),
  update: (id: string, payload: SaveFeePayload) => api.put<Fee>(`/artists/me/fees/${id}`, payload),
  remove: (id: string) => api.delete(`/artists/me/fees/${id}`),
}

export const viaCepApi = {
    getAddress: (cep: { cep: string }) =>
        apiViaCep.get(`/${cep.cep}/json`)
};

export const availabilityApi = {
  listByArtist: (artistId: string, from?: string, to?: string) =>
    api.get<Availability[]>(`/artists/${artistId}/availability`, { params: { from, to } }),
  create: (payload: SaveAvailabilityPayload) => api.post<Availability[]>('/artists/me/availability', payload),
  createBatch: (payload: SaveAvailabilityBatchPayload) =>
    api.post<import('@/types').BatchAvailabilityResult>('/artists/me/availability/batch', payload),
  busySlots: (artistId: string, from?: string, to?: string) =>
    api.get<import('@/types').BusySlot[]>(`/artists/${artistId}/availability/busy-slots`, { params: { from, to } }),
  update: (id: string, payload: SaveAvailabilityPayload) =>
    api.put<Availability>(`/artists/me/availability/${id}`, payload),
  remove: (id: string) => api.delete(`/artists/me/availability/${id}`),
}

// Conclusão do perfil pós-registro (artista ou contratante)
export const perfilApi = {
  completar: (payload: Record<string, unknown>) =>
    api.post<AuthResponseLike>('/perfil/completar', payload),
}

// Bookings & Proposals
export const bookingsApi = {
  create: (payload: CreateBookingPayload) => api.post('/bookings', payload),
  list: async (status?: string, page = 1, pageSize = 50, isGuest?: boolean, busca?: string, ordenarPor?: string, direcao?: string) => {
    const params = { status, isGuest, busca: busca || undefined, ordenarPor, direcao }
    if (!demo.demoAtivo()) {
      return api.get<PagedResult<import('@/types').Booking>>('/bookings', { params: { ...params, page, pageSize } })
    }
    const reais = await api
      .get<PagedResult<import('@/types').Booking>>('/bookings', { params: { ...params, page: 1, pageSize: 50 } })
      .then((r) => r.data.items)
      .catch(() => [])
    return demo.demoBookingsList({ status, page, pageSize, busca, ordenarPor, direcao }, reais)
  },
  get: (id: string) =>
    demo.ehIdDemo(id) ? demo.demoBookingsGet(id) : api.get<import('@/types').Booking>(`/bookings/${id}`),
  negotiate: (id: string) =>
    demo.ehIdDemo(id) ? demo.demoBookingAcaoRet(id, 'Negotiating') : api.post(`/bookings/${id}/negotiate`),
  accept: (id: string) =>
    demo.ehIdDemo(id) ? demo.demoBookingAcaoRet(id, 'Accepted') : api.post<import('@/types').Booking>(`/bookings/${id}/accept`),
  reject: (id: string) =>
    demo.ehIdDemo(id) ? demo.demoBookingAcaoRet(id, 'Rejected') : api.post(`/bookings/${id}/reject`),
  cancel: (id: string) =>
    demo.ehIdDemo(id) ? demo.demoBookingAcaoRet(id, 'Cancelled') : api.post(`/bookings/${id}/cancel`),
  startPayment: (id: string) =>
    demo.ehIdDemo(id) ? demo.demoBookingStartPayment(id) : api.post<{ checkoutUrl: string }>(`/payments/booking/${id}/checkout`),
  complete: (id: string) =>
    demo.ehIdDemo(id) ? demo.demoBookingCompleteRet(id) : api.post<import('@/types').CompleteShow>(`/bookings/${id}/complete`),
}

// Conclusão do show pelo link público (contratante sem login)
export const publicCompletionApi = {
  get: (token: string) => api.get<import('@/types').CompletionSummary>(`/public/completion/${token}`),
  confirm: (token: string) => api.post<import('@/types').CompletionSummary>(`/public/completion/${token}/confirm`),
}

// Rota pública: solicitação de contratação sem cadastro
export const publicBookingsApi = {
  create: (payload: CreateGuestBookingPayload) => api.post<import('@/types').Booking>('/public/bookings', payload),
}

// Assinatura (Asaas)
export const billingApi = {
  createCheckout: () => api.post<import('@/types').CheckoutResponse>('/billing/checkout'),
  myBilling: () => api.get<import('@/types').Billing | null>('/billing/me'),
}

export const proposalsApi = {
  create: (payload: CreateProposalPayload) =>
    demo.ehIdDemo(payload.bookingRequestId)
      ? demo.demoProposalCreate(
          payload.bookingRequestId,
          payload.items.reduce((s, i) => s + i.amount, 0) + payload.travelCost + payload.equipmentCost - payload.discount
        )
      : api.post<Proposal>('/proposals', payload),
  get: (id: string) => api.get<Proposal>(`/proposals/${id}`),
  listForBooking: (bookingId: string) =>
    demo.ehIdDemo(bookingId) ? demo.demoProposalsForBooking(bookingId) : api.get<Proposal[]>(`/proposals/booking/${bookingId}`),
  accept: (id: string) =>
    demo.ehIdDemo(id) ? demo.demoProposalAccept(id) : api.post<Proposal>(`/proposals/${id}/accept`),
  reject: (id: string) =>
    demo.ehIdDemo(id) ? demo.demoProposalReject(id) : api.post<Proposal>(`/proposals/${id}/reject`),
}

// Chat
export const conversationsApi = {
  list: () => api.get<Conversation[]>('/conversations'),
  get: (id: string) =>
    demo.ehIdDemo(id)
      ? demo.demoConversationGet(id)
      : api.get<{ conversation: Conversation; messages: Message[] }>(`/conversations/${id}`),
  send: (id: string, content: string) =>
    demo.ehIdDemo(id)
      ? demo.demoMessageSend(id, content)
      : api.post<Message>(`/conversations/${id}/messages`, { content }),
  markRead: (id: string) => api.put(`/conversations/${id}/read`),
};

export const eventsApi = {
  list: async (params: { from?: string; to?: string; type?: string; status?: string }) => {
    if (!demo.demoAtivo()) return api.get<EventItem[]>('/events', { params })
    const reais = await api.get<EventItem[]>('/events', { params }).then((r) => r.data).catch(() => [])
    return demo.demoEventsList(params, reais)
  },
  get: (id: string) => api.get<EventDetail>(`/events/${id}`),
  create: (payload: Partial<EventItem>) => api.post<EventItem>('/events', payload),
  update: (id: string, payload: Partial<EventItem>) =>
    demo.ehIdDemo(id) ? (demo.demoEventUpdate(id, payload), demo.demoResposta(null)) : api.put<EventItem>(`/events/${id}`, payload),
  remove: (id: string) =>
    demo.ehIdDemo(id) ? (demo.demoEventRemove(id), demo.demoResposta(null)) : api.delete(`/events/${id}`),
  addEquipment: (eventId: string, equipmentId: string, notes = '') =>
    api.post(`/events/${eventId}/equipment`, { equipmentId, notes }),
  toggleEquipment: (eventId: string, eventEquipmentId: string) =>
    api.put(`/events/${eventId}/equipment/${eventEquipmentId}/toggle`),
  removeEquipment: (eventId: string, eventEquipmentId: string) =>
    api.delete(`/events/${eventId}/equipment/${eventEquipmentId}`),
  setTeamShare: (eventId: string, teamMemberId: string, shareType: string, shareValue: number) =>
    api.put(`/events/${eventId}/team-shares`, { teamMemberId, shareType, shareValue }),
  removeTeamShare: (eventId: string, teamMemberId: string) =>
    api.delete(`/events/${eventId}/team-shares/${teamMemberId}`),
  division: (eventId: string) => api.get<import('@/types').TeamDivision>(`/events/${eventId}/division`),
}

// Financial
export const financialApi = {
  list: async (params: { type?: string; status?: string; from?: string; to?: string; page?: number; pageSize?: number; ordenarPor?: string; direcao?: string }) => {
    if (!demo.demoAtivo()) return api.get<PagedResult<Transaction>>('/financial/transactions', { params })
    const reais = await api
      .get<PagedResult<Transaction>>('/financial/transactions', { params: { ...params, page: 1, pageSize: 100 } })
      .then((r) => r.data.items)
      .catch(() => [])
    return demo.demoTransactionsList(params, reais)
  },
  create: (payload: { type: string; category: string; amount: number; dueDate?: string | null; eventId?: string | null; notes?: string }) =>
    api.post<Transaction>('/financial/transactions', payload),
  update: (id: string, payload: Record<string, unknown>) =>
    demo.ehIdDemo(id) ? demo.demoTransactionUpdate(id, payload) : api.put<Transaction>(`/financial/transactions/${id}`, payload),
  remove: (id: string) =>
    demo.ehIdDemo(id) ? (demo.demoTransactionRemove(id), demo.demoResposta(null)) : api.delete(`/financial/transactions/${id}`),
  settle: (id: string) =>
    demo.ehIdDemo(id) ? demo.demoTransactionSettle(id) : api.post<Transaction>(`/financial/transactions/${id}/settle`),
  summary: async (from?: string, to?: string) => {
    const resposta = await api.get<FinancialSummary>('/financial/summary', { params: { from, to } })
    return demo.demoAtivo() ? demo.demoSummarySomado(resposta.data, from, to) : resposta
  },
}

// Team & Equipment
export const teamApi = {
  list: async () => {
    if (!demo.demoAtivo()) return api.get<import('@/types').TeamMember[]>('/team')
    const reais = await api.get<import('@/types').TeamMember[]>('/team').then((r) => r.data).catch(() => [])
    return demo.demoTeamList(reais)
  },
  create: (payload: SaveTeamMemberPayload) => api.post('/team', payload),
  update: (id: string, payload: SaveTeamMemberPayload) =>
    demo.ehIdDemo(id) ? demo.demoTeamUpdate(id, payload) : api.put(`/team/${id}`, payload),
  remove: (id: string) =>
    demo.ehIdDemo(id) ? (demo.demoTeamRemove(id), demo.demoResposta(null)) : api.delete(`/team/${id}`),
}

export const equipmentApi = {
  list: async (status?: string) => {
    if (!demo.demoAtivo()) return api.get<Equipment[]>('/equipment', { params: { status } })
    const reais = await api.get<Equipment[]>('/equipment', { params: { status } }).then((r) => r.data).catch(() => [])
    return demo.demoEquipmentList(status, reais)
  },
  create: (payload: SaveEquipmentPayload) => api.post<Equipment>('/equipment', payload),
  update: (id: string, payload: SaveEquipmentPayload) =>
    demo.ehIdDemo(id) ? demo.demoEquipmentUpdate(id, payload) : api.put<Equipment>(`/equipment/${id}`, payload),
  remove: (id: string) =>
    demo.ehIdDemo(id) ? (demo.demoEquipmentRemove(id), demo.demoResposta(null)) : api.delete(`/equipment/${id}`),
}

// Reviews / Favorites / Notifications / Contractor / Contratos / Addons / EPK / Branding / Uploads
export const reviewsApi = {
  create: (payload: { eventId: string; overallRating: number; comment: string; photos: string[] }) =>
    api.post<Review>('/reviews', payload),
  listForArtist: (artistId: string) => api.get<Review[]>(`/reviews/artist/${artistId}`),
  // Shows concluídos que o contratante ainda não avaliou.
  pending: () => api.get<PendingReview[]>('/reviews/pending'),
  // Avaliações recebidas pelo artista logado (somente leitura).
  received: async () => {
    if (!demo.demoAtivo()) return api.get<Review[]>('/reviews/received')
    const reais = await api.get<Review[]>('/reviews/received').then((r) => r.data).catch(() => [])
    return demo.demoReviewsReceived(reais)
  },
}

export const favoritesApi = {
  list: () => api.get<Favorite[]>('/favorites'),
  add: (artistId: string) => api.post(`/favorites/${artistId}`),
  remove: (artistId: string) => api.delete(`/favorites/${artistId}`),
}

export const notificationsApi = {
  list: (unreadOnly?: boolean) => api.get<Notification[]>('/notifications', { params: { unreadOnly } }),
  unreadCount: () => api.get<number>('/notifications/unread-count'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
}

export const pushApi = {
  vapidPublicKey: () => api.get<string>('/push/vapid-public-key', { responseType: 'text' }),
  subscribe: (payload: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
    api.post('/push/subscriptions', payload),
  remove: (endpoint: string) => api.post('/push/subscriptions/remover', { endpoint }),
}

export const contractorsApi = {
  getMy: () => api.get<Contractor>('/contractors/me'),
  updateMy: (payload: Record<string, unknown>) => api.put<Contractor>('/contractors/me', payload),
}

export const contractsApi = {
  get: (bookingId: string) => api.get<import('@/types').ArtistContract>(`/bookings/${bookingId}/contract`),
  sign: (bookingId: string, payload: Record<string, unknown>) =>
    api.post(`/bookings/${bookingId}/contract/sign`, payload),
}

export const publicContractsApi = {
  getByToken: (token: string) => api.get<import('@/types').ArtistContract>(`/public/contracts/${token}`),
  sign: (token: string, payload: Record<string, unknown>) => api.post(`/public/contracts/${token}/sign`, payload),
}

export const addonsApi = {
  list: (artistId: string) => api.get<import('@/types').ArtistAddons>(`/artists/${artistId}/addons`),
}

export const epkApi = {
  get: (artistId: string) => api.get<import('@/types').Epk>(`/epk/${artistId}`),
  save: (payload: Record<string, unknown>) => api.put<import('@/types').Epk>('/epk', payload),
}

export const socialLinksApi = {
  list: (artistId: string) => api.get<import('@/types').SocialLink[]>(`/social-links/${artistId}`),
  save: (payload: { platform: string; handle: string }) =>
    api.put<import('@/types').SocialLink | null>('/social-links', payload),
}

export const brandingApi = {
  get: () => api.get<import('@/types').Branding>('/branding'),
  getTaxaAdministrativa: () => api.get<{ percentual: number }>('/admin/taxa'),
  saveTaxaAdministrativa: (percentual: number) =>
    api.put<{ percentual: number }>('/admin/taxa', { percentual }),
  getTaxaIngressos: () => api.get<{ percentual: number }>('/admin/taxa/ingressos'),
  saveTaxaIngressos: (percentual: number) =>
    api.put<{ percentual: number }>('/admin/taxa/ingressos', { percentual }),
  uploadLogo: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ logoUrl: string }>('/branding/logo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  removeLogo: () => api.delete('/branding/logo'),
}

// Admin User Management
export const adminUsersApi = {
  // Artistas
  listArtists: () =>
    api.get<import('@/types').AdminArtistList[]>(`/admin/users/artists`),
  getArtistStats: (artistId: string) =>
    api.get<import('@/types').AdminArtistStats>(`/admin/users/artists/${artistId}/stats`),
  unpublishArtist: (artistId: string) =>
    api.post(`/admin/users/artists/${artistId}/unpublish`),
  publishArtist: (artistId: string) =>
    api.post(`/admin/users/artists/${artistId}/publish`),
  getArtistUserId: (artistId: string) =>
    api.get<{ userId: string }>(`/admin/users/artists/${artistId}/user-id`),

  // Contratantes
  listContractors: () =>
    api.get<import('@/types').AdminContractorList[]>(`/admin/users/contractors`),
  getContractorStats: (contractorId: string) =>
    api.get<import('@/types').AdminContractorStats>(`/admin/users/contractors/${contractorId}/stats`),
  getContractorUserId: (contractorId: string) =>
    api.get<{ userId: string }>(`/admin/users/contractors/${contractorId}/user-id`),

  // Ações compartilhadas
  deactivateUser: (userId: string, message: string) =>
    api.post(`/admin/users/${userId}/deactivate`, { message }),
  reactivateUser: (userId: string) =>
    api.post(`/admin/users/${userId}/reactivate`),
  deleteUser: (userId: string) =>
    api.delete(`/admin/users/${userId}`),
}

export const uploadsApi = {
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ url: string }>('/uploads', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// ─────────────────────────── Emissor de ingressos ───────────────────────────

/** Datas em yyyy-MM-dd e horários em HH:mm. */
export interface SaveEventTicketPayload {
  title: string
  quantity: number
  /** Valor líquido que o produtor recebe por ingresso. */
  receiveAmount: number
  /** Período de vendas (yyyy-MM-dd). */
  salesStartDate: string
  salesEndDate: string
  description?: string
}

export interface EventTicket extends Required<SaveEventTicketPayload> {
  id: string
  /** Taxa administrativa (%) aplicada no cadastro. */
  feePercent: number
  /** Valor pago pelo comprador (valor a receber + taxa). */
  buyerPrice: number
  /** Ingressos vendidos (pagos). */
  sold: number
  /** Reservados por pedidos aguardando pagamento. */
  reserved: number
  /** Ainda à venda. */
  available: number
}

export interface SaveTicketEventPayload {
  name: string
  imageUrl: string
  category: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  description: string
  venue: string
  cep: string
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  producerName: string
  producerDescription: string
  tickets?: SaveEventTicketPayload[]
}

export interface TicketEvent extends Required<Omit<SaveTicketEventPayload, 'tickets'>> {
  id: string
  createdAt: string
  tickets: EventTicket[]
}

export const ticketEventsApi = {
  list: () => api.get<TicketEvent[]>('/ticket-events'),
  /** Lista todos os eventos da plataforma (público, sem login). */
  listPublic: () => api.get<TicketEvent[]>('/public/ticket-events'),
  get: (id: string) => api.get<TicketEvent>(`/ticket-events/${id}`),
  /** Página pública do evento — não exige login. */
  getPublic: (id: string) => api.get<TicketEvent>(`/public/ticket-events/${id}`),
  /** Taxa administrativa (%) dos ingressos — configurável pelo admin no futuro. */
  fee: () => api.get<{ feePercent: number }>('/ticket-events/fee'),
  create: (payload: SaveTicketEventPayload) => api.post<TicketEvent>('/ticket-events', payload),
  update: (id: string, payload: SaveTicketEventPayload) => api.put<TicketEvent>("/ticket-events/" + id, payload),
  remove: (id: string) => api.delete(`/ticket-events/${id}`),
}

export interface CreateTicketOrderPayload {
  eventTicketId: string
  fullName: string
  phone: string
  email: string
  cpf: string
  quantity: number
}

export interface TicketOrder {
  id: string
  ticketEventId: string
  eventTicketId: string
  ticketTitle: string
  buyerName: string
  buyerEmail: string
  quantity: number
  unitPrice: number
  totalAmount: number
  status: string
}

export interface TicketCheckout {
  checkoutUrl: string | null
  paid: boolean
}

export interface TicketOrderSummary {
  id: string
  ticketEventId: string
  eventName: string
  eventImageUrl: string
  eventStartDate: string
  eventStartTime: string
  venue: string
  city: string
  state: string
  ticketTitle: string
  quantity: number
  totalAmount: number
  /** AwaitingPayment | Paid | Cancelled */
  status: string
  /** Aguardando pagamento com a reserva vencida. */
  expired: boolean
  createdAt: string
  paidAt: string | null
  checkoutUrl: string | null
  eventEndDate: string
  eventEndTime: string
  street: string
  number: string
  complement: string
  neighborhood: string
  cep: string
  producerName: string
  buyerName: string
  buyerEmail: string
  buyerPhone: string
  buyerCpf: string
  /** Ingressos individuais (código do QR code) — só em pedidos pagos. */
  tickets: IssuedTicket[]
}

export interface IssuedTicket {
  sequence: number
  code: string
  checkedInAt: string | null
}

export interface TicketReturn {
  found: boolean
  paid: boolean
  orderSummary?: TicketOrderSummary
}

export const ticketOrdersApi = {
  /** Volta do checkout: confere o pagamento do pedido direto no InfinityPay. */
  verify: (payload: { orderNsu: string; transactionNsu?: string | null; slug?: string | null }) =>
    api.post<TicketReturn>('/public/ticket-orders/verify', payload),
  /** Pedidos do comprador (CPF + telefone). */
  lookup: (payload: { cpf: string; phone: string }) =>
    api.post<TicketOrderSummary[]>('/public/ticket-orders/lookup', payload),
  /** Gera o checkout do InfinityPay (ou confirma direto se o ingresso for gratuito). */
  checkout: (eventId: string, orderId: string) =>
    api.post<TicketCheckout>(`/public/ticket-events/${eventId}/orders/${orderId}/checkout`),
  /** Compra pública (sem login): registra o pedido e reserva os ingressos. */
  create: (eventId: string, payload: CreateTicketOrderPayload) =>
    api.post<TicketOrder>(`/public/ticket-events/${eventId}/orders`, payload),
}

// ── Painel do produtor / check-in ──

export interface TicketTypeStats {
  ticketId: string
  title: string
  quantity: number
  sold: number
  reserved: number
  available: number
  checkedIn: number
  buyerPrice: number
  receiveAmount: number
  grossRevenue: number
  netRevenue: number
}

export interface TicketEventStats {
  eventId: string
  name: string
  totalCapacity: number
  totalSold: number
  totalReserved: number
  totalCheckedIn: number
  pendingOrders: number
  grossRevenue: number
  netRevenue: number
  types: TicketTypeStats[]
}

export interface EventOrder {
  id: string
  buyerName: string
  buyerEmail: string
  buyerPhone: string
  buyerCpf: string
  ticketTitle: string
  quantity: number
  totalAmount: number
  status: string
  expired: boolean
  createdAt: string
  paidAt: string | null
  checkedIn: number
}

export interface CheckInLog {
  ticketId: string
  code: string
  ticketTitle: string
  buyerName: string
  sequence: number
  quantity: number
  checkedInAt: string
  checkedInBy: string
}

export type CheckInStatus = 'Valid' | 'AlreadyUsed' | 'WrongEvent' | 'NotFound' | 'Cancelled'

export interface CheckInResult {
  status: CheckInStatus
  message: string
  ticketTitle: string | null
  buyerName: string | null
  sequence: number | null
  quantity: number | null
  checkedInAt: string | null
  checkedInBy: string | null
  enteredCount: number
  totalSold: number
}

export interface GateAccess {
  id: string
  name: string
  code: string
  createdAt: string
  revokedAt: string | null
  checkIns: number
}

export interface GateSession {
  eventId: string
  eventName: string
  gateName: string
  startDate: string
  startTime: string
  venue: string
  enteredCount: number
  totalSold: number
}

export const ticketManagementApi = {
  stats: (eventId: string) => api.get<TicketEventStats>(`/ticket-events/${eventId}/stats`),
  orders: (eventId: string) => api.get<EventOrder[]>(`/ticket-events/${eventId}/orders`),
  checkIn: (eventId: string, code: string) => api.post<CheckInResult>(`/ticket-events/${eventId}/check-in`, { code }),
  checkIns: (eventId: string) => api.get<CheckInLog[]>(`/ticket-events/${eventId}/check-ins`),
  undoCheckIn: (eventId: string, ticketId: string) => api.post(`/ticket-events/${eventId}/check-ins/${ticketId}/undo`),
  gates: (eventId: string) => api.get<GateAccess[]>(`/ticket-events/${eventId}/gates`),
  createGate: (eventId: string, name: string) => api.post<GateAccess>(`/ticket-events/${eventId}/gates`, { name }),
  revokeGate: (eventId: string, gateId: string) => api.delete(`/ticket-events/${eventId}/gates/${gateId}`),
}

/** Portaria: sem login, identificada pelo código do acesso. */
export const gateApi = {
  open: (code: string) => api.post<GateSession>('/public/gate/session', { code }),
  checkIn: (gateCode: string, ticketCode: string) =>
    api.post<CheckInResult>('/public/gate/check-in', { gateCode, ticketCode }),
}

// ── Admin: ingressos ──

export interface AdminTicketEvent {
  id: string
  name: string
  imageUrl: string
  category: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  venue: string
  city: string
  state: string
  producerName: string
  createdAt: string
  ownerUserName: string
  ownerUserEmail: string
  totalTickets: number
  totalSold: number
  grossRevenue: number
}

export interface AdminTestTicket {
  orderId: string
  issuedTicketId: string
  code: string
  ticketTitle: string
  buyerName: string
}

export interface AdminOrderDetail {
  id: string
  buyerName: string
  buyerEmail: string
  buyerPhone: string
  buyerCpf: string
  ticketTitle: string
  quantity: number
  unitPrice: number
  totalAmount: number
  status: string
  expired: boolean
  createdAt: string
  paidAt: string | null
  eventName: string
  eventImageUrl: string
  eventStartDate: string
  eventStartTime: string
  eventEndDate: string
  eventEndTime: string
  venue: string
  city: string
  state: string
  street: string
  number: string
  complement: string
  neighborhood: string
  cep: string
  producerName: string
  tickets: AdminIssuedTicket[]
}

export interface AdminIssuedTicket {
  id: string
  sequence: number
  code: string
  checkedInAt: string | null
  checkedInBy: string | null
}

export const adminTicketEventsApi = {
  list: () => api.get<AdminTicketEvent[]>('/admin/ticket-events'),
  get: (id: string) => api.get<TicketEvent>(`/admin/ticket-events/${id}`),
  stats: (id: string) => api.get<TicketEventStats>(`/admin/ticket-events/${id}/stats`),
  orders: (id: string) => api.get<EventOrder[]>(`/admin/ticket-events/${id}/orders`),
  checkIns: (id: string) => api.get<CheckInLog[]>(`/admin/ticket-events/${id}/check-ins`),
  gates: (id: string) => api.get<GateAccess[]>(`/admin/ticket-events/${id}/gates`),
  createTestTicket: (eventId: string, eventTicketId: string) =>
    api.post<AdminTestTicket>(`/admin/ticket-events/${eventId}/test-ticket`, { eventTicketId }),
  orderDetail: (eventId: string, orderId: string) =>
    api.get<AdminOrderDetail>(`/admin/ticket-events/${eventId}/orders/${orderId}/detail`),
  forcePay: (eventId: string, orderId: string) =>
    api.post<{ message: string; ticketsIssued: number }>(`/admin/ticket-events/${eventId}/orders/${orderId}/force-pay`),
  undoPay: (eventId: string, orderId: string) =>
    api.post<{ message: string; ticketsRemoved: number }>(`/admin/ticket-events/${eventId}/orders/${orderId}/undo-pay`),
  deleteOrder: (eventId: string, orderId: string) =>
    api.delete<{ message: string }>(`/admin/ticket-events/${eventId}/orders/${orderId}`),
}
