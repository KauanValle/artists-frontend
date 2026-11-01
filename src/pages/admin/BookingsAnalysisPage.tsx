import { useState } from 'react'
import { Copy, Link2, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { bookingsApi } from '@/services'
import { Link } from 'react-router-dom'
import { BookingStatusBadge, EmptyState, eventTypeLabel } from '@/components/badges'
import { formatDate, formatMoney, formatTime } from '@/lib/utils'
import type { Booking } from '@/types'
import {StatCard} from "@/pages/artist/ArtistDashboardPage.tsx";

/**
 * Painel do administrador.
 * Seção principal: Solicitações Anônimas — shows confirmados contratados por
 * visitantes (sem cadastro), com contato direto pelo WhatsApp informado.
 */
export function BookingsAnalysisPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-2xl font-bold">Painel para visualização dos eventos</h1>
            <p className="text-sm text-muted-foreground">Visualização de numeros importantes para administração dos eventos</p>
        </div>
        <TotalBookingsSection />
    </div>
  )
}

function TotalBookingsSection() {
    const { data, isLoading } = useQuery({
        queryKey: ['admin-total-bookings'],
        queryFn: async () => (await bookingsApi.list('', 1, 50, true)).data,
        placeholderData: keepPreviousData,
    })

    const bookings = data?.items ?? []
    const bookingsConfirmed = bookings.filter((b) => b.status === 'Confirmed')
    const bookingsCanceled = bookings.filter((b) => b.status === 'Cancelled')
    const bookingsRequested = bookings.filter((b) => b.status === 'Requested')
    const bookingsNegotiating = bookings.filter((b) => b.status === 'Negotiating')
    const bookingsProposed = bookings.filter((b) => b.status === 'Proposed')
    const bookingsCompleted = bookings.filter((b) => b.status === 'Completed')
    const bookingsRejected = bookings.filter((b) => b.status === 'Rejected')
    const bookingsExpired = bookings.filter((b) => b.status === 'Expired')
    const bookingsAwaitingAccount = bookings.filter((b) => b.status === 'AwaitingAccount')

    // @ts-ignore
    // @ts-ignore
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Dashboard de eventos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {isLoading ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
                ) : bookings.length === 0 ? (
                    <EmptyState
                        title="Nenhum evento cadastrado no sistema."
                        description="Eventos confirmados no sistema aparecem aqui."
                    />
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <StatCard title="Total de eventos cadastrados" value={bookings.length} />
                        <StatCard title="Total de eventos confirmados" value={bookingsConfirmed.length} />
                        <StatCard title="Total de eventos cancelados" value={bookingsCanceled.length} />
                        <StatCard title="Total de eventos com proposta enviada" value={bookingsRequested.length} />
                        <StatCard title="Total de eventos em negociação" value={bookingsNegotiating.length} />
                        <StatCard title="Total de eventos com proposta enviada" value={bookingsProposed.length} />
                        <StatCard title="Total de eventos completados" value={bookingsCompleted.length} />
                        <StatCard title="Total de eventos rejeitados" value={bookingsCompleted.length} />
                        <StatCard title="Total de eventos expirados" value={bookingsExpired.length} />
                        <StatCard title="Total de eventos aguardando conta" value={bookingsAwaitingAccount.length} />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}