import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CalendarDays, CheckCircle2, Clock, LogIn, MapPin, PartyPopper } from 'lucide-react'
import { toast } from 'sonner'
import { publicCompletionApi } from '@/services'
import { useAuth } from '@/hooks/useAuth'
import { extractApiError } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/badges'
import { eventTypeLabel } from '@/components/badges'
import { formatDate, formatTime } from '@/lib/utils'

/**
 * Página pública de confirmação de conclusão do show — acessada pelo link
 * gerado no evento (/confirmar-conclusao/:token), sem cadastro. O show só é
 * concluído quando artista e contratante confirmam.
 */
export function CompletionConfirmPage() {
  const { token } = useParams()
  const location = useLocation()
  const { isAuthenticated, user } = useAuth()
  const [confirmado, setConfirmado] = useState(false)

  const { data: resumo, isLoading, isError } = useQuery({
    queryKey: ['completion', token],
    queryFn: async () => (await publicCompletionApi.get(token!)).data,
    enabled: !!token && isAuthenticated && user?.role === 'Contractor',
  })

  // O link leva direto ao show, mas a confirmação exige login do contratante.
  if (!isAuthenticated || (user && user.role !== 'Contractor')) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <LogIn className="h-10 w-10 text-primary" />
            <h1 className="text-xl font-bold">Entre para confirmar a conclusão</h1>
            <p className="text-sm text-muted-foreground">
              {user && user.role !== 'Contractor'
                ? 'A confirmação é feita pela conta do contratante deste show.'
                : 'Este link de confirmação é exclusivo do contratante — entre na sua conta para continuar.'}
            </p>
            {!isAuthenticated && (
              <Button asChild size="lg" className="w-full">
                <Link to="/login" state={{ from: { pathname: location.pathname } }}>
                  <LogIn /> Entrar na plataforma
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const confirmar = useMutation({
    mutationFn: async () => (await publicCompletionApi.confirm(token!)).data,
    onSuccess: (data) => {
      setConfirmado(true)
      toast.success(
        data.status === 'Completed'
          ? 'Show concluído! Obrigado por confirmar.'
          : 'Confirmação registrada — falta o artista confirmar.'
      )
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isError || !resumo) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <EmptyState
          title="Link inválido"
          description="Este link de confirmação não existe ou já foi utilizado de outra forma. Peça um novo link ao artista."
        />
      </div>
    )
  }

  const jaConcluido = resumo.status === 'Completed'
  const contratanteJaConfirmou = resumo.contractorConfirmed || confirmado

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      {jaConcluido || (contratanteJaConfirmou && resumo.artistConfirmed) ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <PartyPopper className="h-12 w-12 text-emerald-500" />
            <h1 className="text-xl font-bold">Show concluído!</h1>
            <p className="text-sm text-muted-foreground">
              {resumo.artistName} e você confirmaram a conclusão do show de{' '}
              {formatDate(resumo.eventDate)}. Obrigado por usar a reprissa!
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-5 py-8">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Confirmação de conclusão
              </p>
              <h1 className="mt-1 text-2xl font-bold">O show aconteceu?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {resumo.artistName} indicou que o show abaixo foi realizado. Confirme para concluir a
                contratação.
              </p>
            </div>

            <div className="space-y-2 rounded-lg border p-4 text-sm">
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                {formatDate(resumo.eventDate)} • {eventTypeLabel[resumo.eventType as keyof typeof eventTypeLabel] ?? resumo.eventType}
              </p>
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {formatTime(resumo.startTime)} – {formatTime(resumo.endTime)}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {resumo.location}
              </p>
            </div>

            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <CheckCircle2 className={`h-3.5 w-3.5 ${resumo.artistConfirmed ? 'text-emerald-500' : 'text-muted-foreground/50'}`} />
                Artista confirmou {resumo.artistConfirmed ? '✓' : '(pendente)'}
              </p>
              <p className="flex items-center gap-1.5">
                <CheckCircle2 className={`h-3.5 w-3.5 ${contratanteJaConfirmou ? 'text-emerald-500' : 'text-muted-foreground/50'}`} />
                Você (contratante) {contratanteJaConfirmou ? 'confirmou ✓' : '(pendente)'}
              </p>
            </div>

            {contratanteJaConfirmou ? (
              <div className="rounded-md bg-muted px-3 py-2 text-center text-sm text-muted-foreground">
                Sua confirmação já foi registrada. Falta o artista confirmar para concluir.
              </div>
            ) : (
              <Button
                size="lg"
                className="w-full"
                onClick={() => confirmar.mutate()}
                disabled={confirmar.isPending}
              >
                <CheckCircle2 />
                {confirmar.isPending ? 'Confirmando...' : 'Confirmar conclusão do show'}
              </Button>
            )}

          </CardContent>
        </Card>
      )}
    </div>
  )
}
