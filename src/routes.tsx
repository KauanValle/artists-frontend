import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute, RoleRedirect } from '@/components/ProtectedRoute'
import { PublicLayout } from '@/layouts/PublicLayout'
import { DashboardLayout } from '@/layouts/DashboardLayout'

import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { ArtistPublicPage } from '@/pages/public/ArtistPublicPage'

import { ArtistDashboardPage } from '@/pages/artist/ArtistDashboardPage'
import { AgendaPage } from '@/pages/artist/AgendaPage'
import { ShowsPage } from '@/pages/artist/ShowsPage'
import { FinancialPage } from '@/pages/artist/FinancialPage'
import { TeamPage } from '@/pages/artist/TeamPage'
import { EquipmentPage } from '@/pages/artist/EquipmentPage'
import { ArtistProfilePage } from '@/pages/artist/ArtistProfilePage'
import { SettingsPage } from '@/pages/artist/SettingsPage'

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
      { path: '/artistas/:slug', element: <ArtistPublicPage /> },
      { path: '/', element: <RoleRedirect /> },
    ],
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
          { path: '/artist/configuracoes', element: <SettingsPage /> },
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
