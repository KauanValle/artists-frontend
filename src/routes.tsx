import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom'
import { ProtectedRoute, RoleRedirect } from '@/components/ProtectedRoute'
import { PublicLayout } from '@/layouts/PublicLayout'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { homePathFor } from '@/lib/utils'

import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { CompleteProfilePage } from '@/pages/auth/CompleteProfilePage'
import { ArtistPublicPage } from '@/pages/public/ArtistPublicPage'
import { EpkPublicPage } from '@/pages/public/EpkPublicPage'
import { ArtistsDirectoryPage } from '@/pages/public/ArtistsDirectoryPage'
import { SubscriptionCallbackPage } from '@/pages/public/SubscriptionCallbackPages'
import { ContractorSigningPage } from '@/pages/public/ContractorSigningPage'
import { CompletionConfirmPage } from '@/pages/public/CompletionConfirmPage'
import { PaymentCallbackPage } from '@/pages/public/PaymentCallbackPage'

import { ArtistDashboardPage } from '@/pages/artist/ArtistDashboardPage'
import { AgendaPage } from '@/pages/artist/AgendaPage'
import { ShowsPage } from '@/pages/artist/ShowsPage'
import { FinancialPage } from '@/pages/artist/FinancialPage'
import { TeamPage } from '@/pages/artist/TeamPage'
import { EquipmentPage } from '@/pages/artist/EquipmentPage'
import { ArtistProfilePage } from '@/pages/artist/ArtistProfilePage'
import { EpkPage } from '@/pages/artist/EpkPage'
import { SettingsPage } from '@/pages/artist/SettingsPage'
import { SubscriptionPage } from '@/pages/artist/SubscriptionPage'
import { SaquePage } from '@/pages/artist/SaquePage'
import { IndicacoesPage } from '@/pages/artist/IndicacoesPage'
import { ArtistConversationsPage } from '@/pages/artist/ConversationsPage'

import { ContractorDashboardPage, ContractorEventsPage } from '@/pages/contractor/ContractorDashboardPage'
import { MarketplacePage } from '@/pages/contractor/MarketplacePage'
import { ContractorBookingsPage } from '@/pages/contractor/ContractorBookingsPage'
import { FavoritesPage } from '@/pages/contractor/FavoritesPage'
import { ConversationsPage } from '@/pages/contractor/ConversationsPage'
import { ContractorProfilePage } from '@/pages/contractor/ContractorProfilePage'
import { ReviewsPage } from '@/pages/shared/ReviewsPage'
import { SobrePage } from '@/pages/public/SobrePage'
import { FaqPage } from '@/pages/public/FaqPage'
import { LandingPage } from '@/pages/public/LandingPage'
import { TicketsPage } from '@/pages/public/TicketsPage'
import { TicketsPanelPage } from '@/pages/public/TicketsPanelPage'
import { TicketEventPage } from '@/pages/public/tickets/TicketEventPage'
import { TrackOrdersPage } from '@/pages/public/tickets/TrackOrdersPage'
import { TicketEventManagePage } from '@/pages/public/tickets/TicketEventManagePage'
import { GatePage } from '@/pages/public/GatePage'
import { TermosPage } from '@/pages/public/TermosPage'

import { BookingDetailPage } from '@/pages/shared/BookingDetailPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import {GuestSolicitationPage} from "@/pages/admin/GuestSolicitationPage.tsx";
import {BookingsAnalysisPage} from "@/pages/admin/BookingsAnalysisPage.tsx";
import {FinancialAdminPage} from "@/pages/admin/FinancialPage.tsx";
import {UsersPage} from "@/pages/admin/UsersPage.tsx";
import {AdminWithdrawalsPage} from '@/pages/admin/AdminWithdrawalsPage'
import {CampaignsPage} from '@/pages/admin/CampaignsPage'
import {AdminTicketEventsPage} from '@/pages/admin/AdminTicketEventsPage'
import {PaymentLinksPage} from '@/pages/admin/PaymentLinksPage'
import {PayLinkPage} from '@/pages/public/PayLinkPage'
import {CampaignPage} from '@/pages/public/CampaignPage'
import {CampaignsListPage} from '@/pages/public/CampaignsListPage'

/** Landing para visitantes; redireciona usuários logados ao painel. */
function HomeOrRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const { hash } = useLocation()
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }
  // com âncora (ex.: /#produtos, vindo do menu) mostra a landing mesmo logado
  if (isAuthenticated && user && !hash) {
    if (!user.perfilCompleto && user.role !== 'Admin') return <Navigate to="/completar-perfil" replace />
    return <Navigate to={homePathFor(user.role)} replace />
  }
  return <LandingPage />
}

export const router = createBrowserRouter([
  // Portaria: tela própria (sem header do site), pensada para o celular de quem lê os ingressos.
  { path: '/portaria', element: <GatePage /> },
  {
    element: <PublicLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/completar-perfil', element: <CompleteProfilePage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/eventos', element: <TicketsPage /> },
      { path: '/eventos/painel', element: <TicketsPanelPage /> },
      { path: '/ingressos', element: <Navigate to="/eventos" replace /> },
      { path: '/evento/:id', element: <TicketEventPage /> },
      { path: '/acompanhar-pedidos', element: <TrackOrdersPage /> },
      { path: '/eventos/:id/gerenciar', element: <TicketEventManagePage /> },
      { path: '/artistas', element: <ArtistsDirectoryPage /> },
      { path: '/campanhas', element: <CampaignsListPage /> },
      { path: '/sobre', element: <SobrePage /> },
      { path: '/faq', element: <FaqPage /> },
      { path: '/termos-de-uso', element: <TermosPage /> },
      { path: '/artistas/:slug', element: <ArtistPublicPage /> },
      { path: '/assinatura/sucesso', element: <SubscriptionCallbackPage outcome="success" /> },
      { path: '/assinatura/cancelado', element: <SubscriptionCallbackPage outcome="cancel" /> },
      { path: '/assinatura/expirado', element: <SubscriptionCallbackPage outcome="expired" /> },
      { path: '/contrato/:token', element: <ContractorSigningPage /> },
      { path: '/confirmar-conclusao/:token', element: <CompletionConfirmPage /> },
      { path: '/pagamento-concluido', element: <PaymentCallbackPage /> },
      { path: '/pagar/:id', element: <PayLinkPage /> },
      { path: '/', element: <HomeOrRedirect /> },
    ],
  },
  {
    // EPK público do artista — landing própria, fora do layout do site (e do login)
    path: '/epk/:slug',
    element: <EpkPublicPage />,
  },
  {
    element: <ProtectedRoute role="Artist" />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: '/artist/dashboard', element: <ArtistDashboardPage /> },
          { path: '/artist/agenda', element: <AgendaPage /> },
          { path: '/artist/shows', element: <ShowsPage /> },
          { path: '/artist/shows/:id', element: <BookingDetailPage /> },
          { path: '/artist/financeiro', element: <FinancialPage /> },
          { path: '/artist/saque', element: <SaquePage /> },
          { path: '/artist/indicacoes', element: <IndicacoesPage /> },
          { path: '/artist/equipe', element: <TeamPage /> },
          { path: '/artist/equipamentos', element: <EquipmentPage /> },
          { path: '/artist/perfil', element: <ArtistProfilePage /> },
          { path: '/artist/epk', element: <EpkPage /> },
          { path: '/artist/conversas', element: <ArtistConversationsPage /> },
          { path: '/artist/conversas/:id', element: <ArtistConversationsPage /> },
          { path: '/artist/configuracoes', element: <SettingsPage /> },
          { path: '/artist/assinatura', element: <SubscriptionPage /> },
        ],
      },
    ],
  },
  {
    // Avaliações: contratante avalia shows concluídos; artista só visualiza as recebidas.
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [{ path: '/avaliacoes', element: <ReviewsPage /> }],
      },
    ],
  },
  {
    element: <ProtectedRoute role="Contractor" />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: '/contractor/dashboard', element: <ContractorDashboardPage /> },
          { path: '/contractor/buscar', element: <MarketplacePage /> },
          { path: '/contractor/solicitacoes', element: <ContractorBookingsPage /> },
          { path: '/contractor/solicitacoes/:id', element: <BookingDetailPage /> },
          { path: '/contractor/eventos', element: <ContractorEventsPage /> },
          { path: '/contractor/favoritos', element: <FavoritesPage /> },
          { path: '/contractor/conversas', element: <ConversationsPage /> },
          { path: '/contractor/conversas/:id', element: <ConversationsPage /> },
          { path: '/contractor/perfil', element: <ContractorProfilePage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute role="Admin" />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: '/admin', element: <AdminDashboardPage /> },
          { path: '/solicitacoes-anonimas', element: <GuestSolicitationPage /> },
          { path: '/admin/eventos', element: <BookingsAnalysisPage /> },
          { path: '/financeiro', element: <FinancialAdminPage /> },
          { path: '/usuarios', element: <UsersPage /> },
          { path: '/admin/saques', element: <AdminWithdrawalsPage /> },
          { path: '/admin/ingressos', element: <AdminTicketEventsPage /> },
          { path: '/admin/campanhas', element: <CampaignsPage /> },
          { path: '/admin/links-pagamento', element: <PaymentLinksPage /> },
        ],
      },
    ],
  },
  { path: '/c/:slug', element: <CampaignPage /> },
  { path: '*', element: <RoleRedirect /> },
])
