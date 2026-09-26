import { api } from './api'
import type {
  Artist,
  ArtistCard,
  ArtistDetailPublic,
  Availability,
  Category,
  Contractor,
  CreateBookingPayload,
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
  SaveEquipmentPayload,
  SaveTeamMemberPayload,
  SaveArtistPayload,
  SaveAvailabilityPayload,
  SaveContractorPayload,
  SaveFeePayload,
  SearchArtistsParams,
  Transaction,
} from '@/types'

// Auth
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  registerArtist: (payload: Record<string, unknown>) => api.post('/auth/register/artist', payload),
  registerContractor: (payload: Record<string, unknown>) => api.post('/auth/register/contractor', payload),
  me: () => api.get('/auth/me'),
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

export const availabilityApi = {
  listByArtist: (artistId: string, from?: string, to?: string) =>
    api.get<Availability[]>(`/artists/${artistId}/availability`, { params: { from, to } }),
  create: (payload: SaveAvailabilityPayload) => api.post<Availability[]>('/artists/me/availability', payload),
  update: (id: string, payload: SaveAvailabilityPayload) =>
    api.put<Availability>(`/artists/me/availability/${id}`, payload),
  remove: (id: string) => api.delete(`/artists/me/availability/${id}`),
}

// Bookings & Proposals
export const bookingsApi = {
  create: (payload: CreateBookingPayload) => api.post('/bookings', payload),
  list: (status?: string, page = 1, pageSize = 50) =>
    api.get<PagedResult<import('@/types').Booking>>('/bookings', { params: { status, page, pageSize } }),
  get: (id: string) => api.get<import('@/types').Booking>(`/bookings/${id}`),
  negotiate: (id: string) => api.post(`/bookings/${id}/negotiate`),
  accept: (id: string) => api.post<import('@/types').Booking>(`/bookings/${id}/accept`),
  reject: (id: string) => api.post(`/bookings/${id}/reject`),
  cancel: (id: string) => api.post(`/bookings/${id}/cancel`),
}

export const proposalsApi = {
  create: (payload: CreateProposalPayload) => api.post<Proposal>('/proposals', payload),
  get: (id: string) => api.get<Proposal>(`/proposals/${id}`),
  listForBooking: (bookingId: string) => api.get<Proposal[]>(`/proposals/booking/${bookingId}`),
  accept: (id: string) => api.post<Proposal>(`/proposals/${id}/accept`),
  reject: (id: string) => api.post<Proposal>(`/proposals/${id}/reject`),
}

// Chat
export const conversationsApi = {
  list: () => api.get<Conversation[]>('/conversations'),
  get: (id: string) => api.get<{ conversation: Conversation; messages: Message[] }>(`/conversations/${id}`),
  send: (id: string, content: string) => api.post<Message>(`/conversations/${id}/messages`, { content }),
  markRead: (id: string) => api.put(`/conversations/${id}/read`),
}

// Events / Agenda
export const eventsApi = {
  list: (params: { from?: string; to?: string; type?: string; status?: string }) =>
    api.get<EventItem[]>('/events', { params }),
  get: (id: string) => api.get<EventDetail>(`/events/${id}`),
  create: (payload: Partial<EventItem>) => api.post<EventItem>('/events', payload),
  update: (id: string, payload: Partial<EventItem>) => api.put<EventItem>(`/events/${id}`, payload),
  remove: (id: string) => api.delete(`/events/${id}`),
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
  list: (params: { type?: string; status?: string; from?: string; to?: string; page?: number; pageSize?: number }) =>
    api.get<PagedResult<Transaction>>('/financial/transactions', { params }),
  create: (payload: { type: string; category: string; amount: number; dueDate?: string | null; eventId?: string | null; notes?: string }) =>
    api.post<Transaction>('/financial/transactions', payload),
  update: (id: string, payload: Record<string, unknown>) => api.put<Transaction>(`/financial/transactions/${id}`, payload),
  remove: (id: string) => api.delete(`/financial/transactions/${id}`),
  settle: (id: string) => api.post<Transaction>(`/financial/transactions/${id}/settle`),
  summary: (from?: string, to?: string) => api.get<FinancialSummary>('/financial/summary', { params: { from, to } }),
}

// Team & Equipment
export const teamApi = {
  list: () => api.get<import('@/types').TeamMember[]>('/team'),
  create: (payload: SaveTeamMemberPayload) => api.post('/team', payload),
  update: (id: string, payload: SaveTeamMemberPayload) => api.put(`/team/${id}`, payload),
  remove: (id: string) => api.delete(`/team/${id}`),
}

export const equipmentApi = {
  list: (status?: string) => api.get<Equipment[]>('/equipment', { params: { status } }),
  create: (payload: SaveEquipmentPayload) => api.post<Equipment>('/equipment', payload),
  update: (id: string, payload: SaveEquipmentPayload) => api.put<Equipment>(`/equipment/${id}`, payload),
  remove: (id: string) => api.delete(`/equipment/${id}`),
}

// Reviews / Favorites / Notifications / Contractor
export const reviewsApi = {
  create: (payload: { eventId: string; overallRating: number; punctuality: number; quality: number; professionalism: number; communication: number; comment: string }) =>
    api.post<Review>('/reviews', payload),
  listForArtist: (artistId: string) => api.get<Review[]>(`/reviews/artist/${artistId}`),
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

export const contractorsApi = {
  getMy: () => api.get<Contractor>('/contractors/me'),
  updateMy: (payload: SaveContractorPayload) => api.put<Contractor>('/contractors/me', payload),
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
