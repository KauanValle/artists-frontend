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
  register: (payload: { name: string; email: string; password: string }) =>
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
  create: (payload: CreateBookingPayload) =>
    demo.demoAtivo() ? demo.demoResposta(null) : api.post('/bookings', payload),
  list: (status?: string, page = 1, pageSize = 50, isGuest?: boolean, busca?: string, ordenarPor?: string, direcao?: string) =>
    demo.demoAtivo()
      ? demo.demoBookingsList({ status, page, pageSize, busca, ordenarPor, direcao })
      : api.get<PagedResult<import('@/types').Booking>>('/bookings', {
          params: { status, isGuest, page, pageSize, busca: busca || undefined, ordenarPor, direcao },
        }),
  get: (id: string) =>
    demo.demoAtivo() ? demo.demoBookingsGet(id) : api.get<import('@/types').Booking>(`/bookings/${id}`),
  negotiate: (id: string) =>
    demo.demoAtivo()
      ? (demo.demoBookingAcao(id, 'Negotiating') && demo.demoBookingsGet(id))
      : api.post(`/bookings/${id}/negotiate`),
  accept: (id: string) =>
    demo.demoAtivo()
      ? (demo.demoBookingAcao(id, 'Accepted') && demo.demoBookingsGet(id))
      : api.post<import('@/types').Booking>(`/bookings/${id}/accept`),
  reject: (id: string) =>
    demo.demoAtivo()
      ? (demo.demoBookingAcao(id, 'Rejected') && demo.demoBookingsGet(id))
      : api.post(`/bookings/${id}/reject`),
  cancel: (id: string) =>
    demo.demoAtivo()
      ? (demo.demoBookingAcao(id, 'Cancelled') && demo.demoBookingsGet(id))
      : api.post(`/bookings/${id}/cancel`),
  startPayment: (id: string) =>
    demo.demoAtivo() ? demo.demoBookingStartPayment(id) : api.post<{ checkoutUrl: string }>(`/payments/booking/${id}/checkout`),
  complete: (id: string) =>
    demo.demoAtivo()
      ? (demo.demoBookingAcao(id, 'AwaitingCompletionAccept') && demo.demoBookingsGet(id))
      : api.post<import('@/types').CompleteShow>(`/bookings/${id}/complete`),
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
    demo.demoAtivo()
      ? demo.demoProposalCreate(
          payload.bookingRequestId,
          payload.items.reduce((s, i) => s + i.amount, 0) + payload.travelCost + payload.equipmentCost - payload.discount
        )
      : api.post<Proposal>('/proposals', payload),
  get: (id: string) => api.get<Proposal>(`/proposals/${id}`),
  listForBooking: (bookingId: string) =>
    demo.demoAtivo() ? demo.demoProposalsForBooking(bookingId) : api.get<Proposal[]>(`/proposals/booking/${bookingId}`),
  accept: (id: string) =>
    demo.demoAtivo() ? demo.demoProposalAccept(id) : api.post<Proposal>(`/proposals/${id}/accept`),
  reject: (id: string) =>
    demo.demoAtivo() ? demo.demoProposalReject(id) : api.post<Proposal>(`/proposals/${id}/reject`),
}

// Chat
export const conversationsApi = {
  list: (): Promise<Conversation[]> => api.get<Conversation[]>('/conversations').then((res) => res.data), // Fixed TS2322
  get: (id: string): Promise<{ conversation: Conversation; messages: Message[] }> =>
    demo.demoAtivo()
      ? demo.demoConversationGet(id) ?? api.get<{ conversation: Conversation; messages: Message[] }>(`/conversations/${id}`).then((res) => res.data) // Fixed TS2322
      : api.get<{ conversation: Conversation; messages: Message[] }>(`/conversations/${id}`).then((res) => res.data),
  send: (id: string, content: string): Promise<Message> =>
    demo.demoAtivo()
      ? demo.demoMessageSend(id, content).then((m: Message) => demo.demoResposta(m)) // Fixed TS7006
      : api.post<Message>(`/conversations/${id}/messages`, { content }).then((res) => res.data), // Fixed TS2339
  markRead: (id: string): Promise<void> => api.put(`/conversations/${id}/read`).then(() => {}),
};

export const eventsApi = {
  create: (payload: Partial<EventItem>): Promise<EventItem> =>
    demo.demoAtivo()
      ? demo.demoEventCreate(payload).then((e: EventItem) => demo.demoResposta(e)) // Fixed TS7006
      : api.post<EventItem>('/events', payload).then((res) => res.data), // Fixed TS2339
};

export interface SaveTeamMemberPayload extends Record<string, unknown> {
  [key: string]: unknown; // Fixed TS2345
}

export interface SaveEquipmentPayload extends Record<string, unknown> {
  [key: string]: unknown; // Fixed TS2345
}
