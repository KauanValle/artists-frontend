import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute, RoleRedirect } from '@/components/ProtectedRoute'
import { PublicLayout } from '@/layouts/PublicLayout'
import { DashboardLayout } from '@/layouts/DashboardLayout'

import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { ArtistPublicPage } from '@/pages/public/ArtistPublicPage'
import { EpkPublicPage } from '@/pages/public/EpkPublicPage'
import { ArtistsDirectoryPage } from '@/pages/public/ArtistsDirectoryPage'
import { SubscriptionCallbackPage } from '@/pages/public/SubscriptionCallbackPages'
import { ContractorSigningPage } from '@/pages/public/ContractorSigningPage'

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

import { ContractorDashboardPage, ContractorEventsPage } from '@/pages/contractor/ContractorDashboardPage'
import { MarketplacePage } from '@/pages/contractor/MarketplacePage'
import { ContractorBookingsPage } from '@/pages/contractor/ContractorBookingsPage'
import { FavoritesPage } from '@/pages/contractor/FavoritesPage'
import { ConversationsPage } from '@/pages/contractor/ConversationsPage'
import { ContractorProfilePage } from '@/pages/contractor/ContractorProfilePage'

import { BookingDetailPage } from '@/pages/shared/BookingDetailPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/artistas', element: <ArtistsDirectoryPage /> },
      { path: '/artistas/:slug', element: <ArtistPublicPage /> },
      { path: '/assinatura/sucesso', element: <SubscriptionCallbackPage outcome="success" /> },
      { path: '/assinatura/cancelado', element: <SubscriptionCallbackPage outcome="cancel" /> },
      { path: '/assinatura/expirado', element: <SubscriptionCallbackPage outcome="expired" /> },
      { path: '/contrato/:token', element: <ContractorSigningPage /> },
      { path: '/', element: <RoleRedirect /> },
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
          { path: '/artist/equipe', element: <TeamPage /> },
          { path: '/artist/equipamentos', element: <EquipmentPage /> },
          { path: '/artist/perfil', element: <ArtistProfilePage /> },
          { path: '/artist/epk', element: <EpkPage /> },
          { path: '/artist/configuracoes', element: <SettingsPage /> },
          { path: '/artist/assinatura', element: <SubscriptionPage /> },
        ],
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
        ],
      },
    ],
  },
  { path: '*', element: <RoleRedirect /> },
])
