// ─────────────────────────── Enums (serializados como string) ───────────────────────────

export type UserRole = 'Artist' | 'Contractor' | 'Admin'
export type ArtistType = 'Solo' | 'Band'
export type AvailabilityStatus = 'Available' | 'PreReserved' | 'Unavailable'
export type EventType = 'Show' | 'Rehearsal' | 'Meeting' | 'Travel' | 'Recording' | 'Other'
export type EventStatus = 'Scheduled' | 'Confirmed' | 'Completed' | 'Cancelled'
export type BookingStatus =
  | 'Requested'
  | 'Negotiating'
  | 'Proposed'
  | 'Accepted'
  | 'Confirmed'
  | 'Completed'
  | 'Cancelled'
  | 'Rejected'
  | 'Expired'
export type ProposalStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Expired' | 'Cancelled'
export type TransactionType = 'Income' | 'Expense'
export type TransactionStatus = 'Pending' | 'Received' | 'Paid' | 'Overdue' | 'Cancelled'
export type EquipmentStatus = 'Available' | 'InUse' | 'Maintenance' | 'Unavailable'
export type ShareType = 'Percentage' | 'Fixed'
export type ContractorType = 'Person' | 'Company'
export type NotificationType =
  | 'NewBookingRequest'
  | 'NewMessage'
  | 'NewProposal'
  | 'ProposalAccepted'
  | 'ProposalRejected'
  | 'ShowConfirmed'
  | 'UpcomingShow'
  | 'PaymentOverdue'
  | 'NewReview'

// ─────────────────────────── Auth ───────────────────────────

export interface User {
  id: string
  email: string
  displayName: string
  role: UserRole
  artistId: string | null
  contractorId: string | null
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresAtUtc: string
  user: User
}

// ─────────────────────────── Artists ───────────────────────────

export interface Category {
  id: string
  name: string
  slug: string
}

export interface Artist {
  id: string
  artistType: ArtistType
  name: string
  artisticName: string
  categoryId: string
  categoryName: string
  city: string
  state: string
  phone: string
  profilePhotoUrl: string | null
  description: string
  styles: string[]
  specialties: string[]
  galleryUrls: string[]
  videoUrls: string[]
  slug: string
  isPublished: boolean
  averageRating: number | null
  reviewCount: number
  startingPrice: number | null
}

export interface ArtistCard {
  id: string
  slug: string
  artisticName: string
  profilePhotoUrl: string | null
  categoryId: string
  categoryName: string
  city: string
  state: string
  averageRating: number | null
  reviewCount: number
  startingPrice: number | null
  isAvailableForRequestedSlot: boolean
}

export interface Fee {
  id: string
  artistId: string
  durationMinutes: number
  price: number
  description: string | null
}

export interface Availability {
  id: string
  artistId: string
  date: string
  startTime: string
  endTime: string
  isAllDay: boolean
  status: AvailabilityStatus
  note: string | null
}

export interface Review {
  id: string
  artistId: string
  contractorId: string
  contractorName: string
  eventId: string
  overallRating: number
  punctuality: number
  quality: number
  professionalism: number
  communication: number
  comment: string
  createdAt: string
}

export interface ArtistDetailPublic {
  id: string
  slug: string
  artisticName: string
  artistType: ArtistType
  profilePhotoUrl: string | null
  categoryId: string
  categoryName: string
  city: string
  state: string
  description: string
  styles: string[]
  specialties: string[]
  galleryUrls: string[]
  videoUrls: string[]
  averageRating: number | null
  reviewCount: number
  startingPrice: number | null
  fees: Fee[]
  reviews: Review[]
}

export interface SearchArtistsParams {
  categoryId?: string
  city?: string
  date?: string
  startTime?: string
  durationMinutes?: number
  minPrice?: number
  maxPrice?: number
  minRating?: number
  search?: string
  page?: number
  pageSize?: number
}

// ─────────────────────────── Bookings & Proposals ───────────────────────────

export interface Booking {
  id: string
  artistId: string
  artistName: string
  artistPhotoUrl: string | null
  contractorId: string
  contractorName: string
  eventDate: string
  startTime: string
  endTime: string
  location: string
  eventType: EventType
  estimatedAudience: number | null
  budget: number | null
  message: string
  status: BookingStatus
  eventId: string | null
  acceptedProposalId: string | null
  conversationId: string
  createdAt: string
}

export interface CreateBookingPayload {
  artistId: string
  eventDate: string
  startTime: string
  endTime: string
  location: string
  eventType: EventType
  estimatedAudience?: number | null
  budget?: number | null
  message: string
}

export interface ProposalItem {
  id: string
  description: string
  amount: number
}

export interface Proposal {
  id: string
  bookingRequestId: string
  artistId: string
  contractorId: string
  status: ProposalStatus
  items: ProposalItem[]
  travelCost: number
  equipmentCost: number
  discount: number
  finalAmount: number
  validUntil: string
  notes: string
  respondedAt: string | null
  createdAt: string
}

export interface CreateProposalPayload {
  bookingRequestId: string
  items: { description: string; amount: number }[]
  travelCost: number
  equipmentCost: number
  discount: number
  validityDays: number
  notes: string
}

// ─────────────────────────── Chat ───────────────────────────

export interface Conversation {
  id: string
  bookingRequestId: string
  otherUserId: string
  otherUserName: string
  otherUserPhotoUrl: string | null
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
}

export interface Message {
  id: string
  senderUserId: string
  senderName: string
  content: string
  sentAt: string
  isRead: boolean
}

// ─────────────────────────── Events / Agenda ───────────────────────────

export interface EventItem {
  id: string
  artistId: string
  contractorId: string | null
  bookingRequestId: string | null
  title: string
  type: EventType
  startDateTime: string
  endDateTime: string
  location: string
  description: string
  status: EventStatus
}

export interface EventEquipment {
  id: string
  eventId: string
  equipmentId: string
  equipmentName: string
  isChecked: boolean
  notes: string
}

export interface EventTeamShare {
  id: string
  teamMemberId: string
  memberName: string
  shareType: ShareType
  shareValue: number
}

export interface TeamDivisionLine {
  teamMemberId: string
  memberName: string
  shareType: ShareType
  shareValue: number
  amount: number
}

export interface TeamDivision {
  eventFee: number
  expenses: number
  distributable: number
  lines: TeamDivisionLine[]
}

export interface EventDetail {
  event: EventItem
  equipment: EventEquipment[]
  teamShares: EventTeamShare[]
  division: TeamDivision
}

// ─────────────────────────── Financial ───────────────────────────

export interface Transaction {
  id: string
  type: TransactionType
  category: string
  amount: number
  dueDate: string | null
  settlementDate: string | null
  status: TransactionStatus
  eventId: string | null
  eventTitle: string | null
  notes: string
  createdAt: string
}

export interface FinancialSummary {
  from: string | null
  to: string | null
  incomeExpected: number
  incomeReceived: number
  incomePending: number
  expenseTotal: number
  expensePaid: number
  expensePending: number
  result: number
  accountsReceivable: number
  upcomingShowsCount: number
}

// ─────────────────────────── Team & Equipment ───────────────────────────

export interface TeamMember {
  id: string
  name: string
  photoUrl: string
  role: string
  phone: string
  email: string
  defaultShareType: ShareType
  defaultShareValue: number
  notes: string
}

export interface Equipment {
  id: string
  name: string
  category: string
  brand: string
  model: string
  identifier: string
  weightKg: number | null
  value: number | null
  status: EquipmentStatus
  notes: string
}

// ─────────────────────────── Favorites & Notifications & Contractor ───────────────────────────

export interface Favorite {
  id: string
  artistId: string
  artistName: string
  artistPhotoUrl: string | null
  slug: string
  categoryName: string
  city: string
}

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: string
}

export interface Contractor {
  id: string
  type: ContractorType
  name: string
  companyName: string | null
  phone: string
  city: string
  state: string
}

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
}

export interface UploadResult {
  url: string
}

// ─────────────────────────── Payloads ───────────────────────────

export interface SaveArtistPayload {
  artistType: ArtistType
  name: string
  artisticName: string
  categoryId: string
  city: string
  state: string
  phone: string
  profilePhotoUrl?: string | null
  description: string
  styles: string[]
  specialties: string[]
  galleryUrls: string[]
  videoUrls: string[]
}

export interface SaveFeePayload {
  durationMinutes: number
  price: number
  description?: string | null
}

export interface SaveAvailabilityPayload {
  date: string
  startTime: string
  endTime: string
  isAllDay: boolean
  status: AvailabilityStatus
  note?: string | null
}

export interface SaveTeamMemberPayload {
  name: string
  photoUrl: string
  role: string
  phone: string
  email: string
  defaultShareType: ShareType
  defaultShareValue: number
  notes: string
}

export interface SaveEquipmentPayload {
  name: string
  category: string
  brand: string
  model: string
  identifier: string
  weightKg?: number | null
  value?: number | null
  status: EquipmentStatus
  notes: string
}

export interface SaveContractorPayload {
  type: ContractorType
  name: string
  companyName?: string | null
  phone: string
  city: string
  state: string
}
