import io

path = 'services/index.ts'
with io.open(path, encoding='utf-8') as f: c = f.read()

# ── bookingsApi ──
old = """export const bookingsApi = {
  create: (payload: CreateBookingPayload) =>
    demo.demoAtivo() ? demo.demoResposta({ id: '' }) : api.post('/bookings', payload),
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
      ? demo.demoBookingAcaoRet(id, 'Negotiating')
      : api.post(`/bookings/${id}/negotiate`),
  accept: (id: string) =>
    demo.demoAtivo()
      ? demo.demoBookingAcaoRet(id, 'Accepted')
      : api.post<import('@/types').Booking>(`/bookings/${id}/accept`),
  reject: (id: string) =>
    demo.demoAtivo()
      ? demo.demoBookingAcaoRet(id, 'Rejected')
      : api.post(`/bookings/${id}/reject`),
  cancel: (id: string) =>
    demo.demoAtivo()
      ? demo.demoBookingAcaoRet(id, 'Cancelled')
      : api.post(`/bookings/${id}/cancel`),
  startPayment: (id: string) =>
    demo.demoAtivo() ? demo.demoBookingStartPayment(id) : api.post<{ checkoutUrl: string }>(`/payments/booking/${id}/checkout`),
  complete: (id: string) =>
    demo.demoAtivo()
      ? demo.demoBookingCompleteRet(id)
      : api.post<import('@/types').CompleteShow>(`/bookings/${id}/complete`),
}"""
new = """export const bookingsApi = {
  create: (payload: CreateBookingPayload) => api.post('/bookings', payload),
  // Em modo tutorial: mescla os shows de exemplo com os reais e pagina no client.
  list: async (status?: string, page = 1, pageSize = 50, isGuest?: boolean, busca?: string, ordenarPor?: string, direcao?: string) => {
    const params = { status, isGuest, page: 1, pageSize: 500, busca: busca || undefined, ordenarPor, direcao }
    const real = await api
      .get<PagedResult<import('@/types').Booking>>('/bookings', { params })
      .then((r) => r.data)
      .catch(() => ({ items: [] as import('@/types').Booking[], page: 1, pageSize: 0, totalCount: 0 }))
    if (!demo.demoAtivo()) return demo.demoResposta(real)
    return demo.demoBookingsList({ status, page, pageSize, busca, ordenarPor, direcao }, real.items)
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
}"""
assert c.count(old) == 1, 'bookingsApi'
c = c.replace(old, new)

# ── proposalsApi ──
old = """export const proposalsApi = {
  create: (payload: CreateProposalPayload) =>
    demo.demoAtivo()
      ? demo
          .demoProposalCreate(
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
}"""
new = """export const proposalsApi = {
  create: (payload: CreateProposalPayload) =>
    demo.ehIdDemo(payload.bookingRequestId)
      ? demo
          .demoProposalCreate(
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
}"""
assert c.count(old) == 1, 'proposalsApi'
c = c.replace(old, new)

# ── conversationsApi ──
old = """  get: (id: string) =>
    demo.demoAtivo()
      ? demo.demoConversationGet(id) ?? api.get<{ conversation: Conversation; messages: Message[] }>(`/conversations/${id}`)
      : api.get<{ conversation: Conversation; messages: Message[] }>(`/conversations/${id}`),
  send: (id: string, content: string) =>
    demo.demoAtivo()
      ? demo.demoMessageSend(id, content)
      : api.post<Message>(`/conversations/${id}/messages`, { content }),"""
new = """  get: (id: string) =>
    demo.ehIdDemo(id)
      ? demo.demoConversationGet(id)
      : api.get<{ conversation: Conversation; messages: Message[] }>(`/conversations/${id}`),
  send: (id: string, content: string) =>
    demo.ehIdDemo(id)
      ? demo.demoMessageSend(id, content)
      : api.post<Message>(`/conversations/${id}/messages`, { content }),"""
assert c.count(old) == 1, 'conversationsApi'
c = c.replace(old, new)

# ── eventsApi: escritas reais (create sempre salva; update/remove por id) ──
old = """  create: (payload: Partial<EventItem>) =>
    demo.demoAtivo() ? demo.demoEventCreate(payload) : api.post<EventItem>('/events', payload),
  update: (id: string, payload: Partial<EventItem>) =>
    demo.demoAtivo() ? (demo.demoEventUpdate(id, payload), demo.demoResposta(null)) : api.put<EventItem>(`/events/${id}`, payload),
  remove: (id: string) =>
    demo.demoAtivo() ? (demo.demoEventRemove(id), demo.demoResposta(null)) : api.delete(`/events/${id}`),"""
new = """  create: (payload: Partial<EventItem>) => api.post<EventItem>('/events', payload),
  update: (id: string, payload: Partial<EventItem>) =>
    demo.ehIdDemo(id) ? (demo.demoEventUpdate(id, payload), demo.demoResposta(null)) : api.put<EventItem>(`/events/${id}`, payload),
  remove: (id: string) =>
    demo.ehIdDemo(id) ? (demo.demoEventRemove(id), demo.demoResposta(null)) : api.delete(`/events/${id}`),"""
assert c.count(old) == 1, 'eventsApi'
c = c.replace(old, new)

# ── financialApi: leituras mescladas; escritas reais (demo ids em memória) ──
old = """export const financialApi = {
  list: (params: { type?: string; status?: string; from?: string; to?: string; page?: number; pageSize?: number; ordenarPor?: string; direcao?: string }) =>
    demo.demoAtivo()
      ? demo.demoTransactionsList(params)
      : api.get<PagedResult<Transaction>>('/financial/transactions', { params }),
  create: (payload: { type: string; category: string; amount: number; dueDate?: string | null; eventId?: string | null; notes?: string }) =>
    demo.demoAtivo() ? demo.demoTransactionCreate(payload).then((t) => demo.demoResposta(t)) : api.post<Transaction>('/financial/transactions', payload),
  update: (id: string, payload: Record<string, unknown>) =>
    demo.demoAtivo() ? demo.demoTransactionUpdate(id, payload).then((t) => demo.demoResposta(t)) : api.put<Transaction>(`/financial/transactions/${id}`, payload),
  remove: (id: string) =>
    demo.demoAtivo() ? (demo.demoTransactionRemove(id), demo.demoResposta(null)) : api.delete(`/financial/transactions/${id}`),
  settle: (id: string) =>
    demo.demoAtivo() ? demo.demoTransactionSettle(id) : api.post<Transaction>(`/financial/transactions/${id}/settle`),
  summary: (from?: string, to?: string) =>
    demo.demoAtivo() ? demo.demoFinancialSummary(from, to) : api.get<FinancialSummary>('/financial/summary', { params: { from, to } }),
}"""
new = """export const financialApi = {
  // Em modo tutorial: traz os lançamentos reais e mescla com os de exemplo.
  list: async (params: { type?: string; status?: string; from?: string; to?: string; page?: number; pageSize?: number; ordenarPor?: string; direcao?: string }) => {
    const real = await api
      .get<PagedResult<Transaction>>('/financial/transactions', { params: { ...params, page: 1, pageSize: 500 } })
      .then((r) => r.data)
      .catch(() => ({ items: [] as Transaction[], page: 1, pageSize: 0, totalCount: 0 }))
    if (!demo.demoAtivo()) return demo.demoResposta(real)
    return demo.demoTransactionsList(params, real.items)
  },
  create: (payload: { type: string; category: string; amount: number; dueDate?: string | null; eventId?: string | null; notes?: string }) =>
    api.post<Transaction>('/financial/transactions', payload),
  update: (id: string, payload: Record<string, unknown>) =>
    demo.ehIdDemo(id) ? demo.demoTransactionUpdate(id, payload) : api.put<Transaction>(`/financial/transactions/${id}`, payload),
  remove: (id: string) =>
    demo.ehIdDemo(id) ? (demo.demoTransactionRemove(id), demo.demoResposta(null)) : api.delete(`/financial/transactions/${id}`),
  settle: (id: string) =>
    demo.ehIdDemo(id) ? demo.demoTransactionSettle(id) : api.post<Transaction>(`/financial/transactions/${id}/settle`),
  // Resumo real somado aos lançamentos de exemplo.
  summary: async (from?: string, to?: string) => {
    const real = await api
      .get<FinancialSummary>('/financial/summary', { params: { from, to } })
      .then((r) => r.data)
      .catch(() => null)
    if (!demo.demoAtivo() || !real) return demo.demoResposta(real as FinancialSummary)
    return demo.demoSummarySomado(real, from, to)
  },
}"""
assert c.count(old) == 1, 'financialApi'
c = c.replace(old, new)

# ── teamApi: escritas reais; leitura mesclada ──
old = """export const teamApi = {
  list: () => (demo.demoAtivo() ? demo.demoTeamList() : api.get<import('@/types').TeamMember[]>('/team')),
  create: (payload: SaveTeamMemberPayload) =>
    demo.demoAtivo() ? demo.demoTeamCreate(payload) : api.post('/team', payload),
  update: (id: string, payload: SaveTeamMemberPayload) =>
    demo.demoAtivo() ? demo.demoTeamUpdate(id, payload).then((m) => demo.demoResposta(m)) : api.put(`/team/${id}`, payload),
  remove: (id: string) =>
    demo.demoAtivo() ? (demo.demoTeamRemove(id), demo.demoResposta(null)) : api.delete(`/team/${id}`),
}"""
new = """export const teamApi = {
  // Em modo tutorial: lista mescla a equipe de exemplo com a real (salva no banco).
  list: async () => {
    const real = await api
      .get<import('@/types').TeamMember[]>('/team')
      .then((r) => r.data)
      .catch(() => [] as import('@/types').TeamMember[])
    if (!demo.demoAtivo()) return demo.demoResposta(real)
    return demo.demoTeamList(real)
  },
  create: (payload: SaveTeamMemberPayload) => api.post('/team', payload),
  update: (id: string, payload: SaveTeamMemberPayload) =>
    demo.ehIdDemo(id) ? demo.demoTeamUpdate(id, payload) : api.put(`/team/${id}`, payload),
  remove: (id: string) =>
    demo.ehIdDemo(id) ? (demo.demoTeamRemove(id), demo.demoResposta(null)) : api.delete(`/team/${id}`),
}"""
assert c.count(old) == 1, 'teamApi'
c = c.replace(old, new)

# ── equipmentApi ──
old = """export const equipmentApi = {
  list: (status?: string) =>
    demo.demoAtivo() ? demo.demoEquipmentList(status) : api.get<Equipment[]>('/equipment', { params: { status } }),
  create: (payload: SaveEquipmentPayload) =>
    demo.demoAtivo() ? demo.demoEquipmentCreate(payload).then((e) => demo.demoResposta(e)) : api.post<Equipment>('/equipment', payload),
  update: (id: string, payload: SaveEquipmentPayload) =>
    demo.demoAtivo() ? demo.demoEquipmentUpdate(id, payload).then((e) => demo.demoResposta(e)) : api.put<Equipment>(`/equipment/${id}`, payload),
  remove: (id: string) =>
    demo.demoAtivo() ? (demo.demoEquipmentRemove(id), demo.demoResposta(null)) : api.delete(`/equipment/${id}`),
}"""
new = """export const equipmentApi = {
  // Em modo tutorial: lista mescla os equipamentos de exemplo com os reais.
  list: async (status?: string) => {
    const real = await api
      .get<Equipment[]>('/equipment', { params: { status } })
      .then((r) => r.data)
      .catch(() => [] as Equipment[])
    if (!demo.demoAtivo()) return demo.demoResposta(real)
    return demo.demoEquipmentList(status, real)
  },
  create: (payload: SaveEquipmentPayload) => api.post<Equipment>('/equipment', payload),
  update: (id: string, payload: SaveEquipmentPayload) =>
    demo.ehIdDemo(id) ? demo.demoEquipmentUpdate(id, payload) : api.put<Equipment>(`/equipment/${id}`, payload),
  remove: (id: string) =>
    demo.ehIdDemo(id) ? (demo.demoEquipmentRemove(id), demo.demoResposta(null)) : api.delete(`/equipment/${id}`),
}"""
assert c.count(old) == 1, 'equipmentApi'
c = c.replace(old, new)

# ── reviewsApi.received mesclada ──
old = """  // Avaliações recebidas pelo artista logado (somente leitura).
  received: () => api.get<Review[]>('/reviews/received'),"""
new = """  // Avaliações recebidas pelo artista logado — em tutorial, mescla com as de exemplo.
  received: async () => {
    const real = await api
      .get<Review[]>('/reviews/received')
      .then((r) => r.data)
      .catch(() => [] as Review[])
    if (!demo.demoAtivo()) return demo.demoResposta(real)
    return demo.demoReviewsReceived(real)
  },"""
assert c.count(old) == 1, 'reviews received'
c = c.replace(old, new)

with io.open(path, 'w', encoding='utf-8', newline='') as f: f.write(c)
print('services híbrido ok')
