import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Bell, BellRing, CheckCheck } from 'lucide-react'
import { notificationsApi } from '@/services'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export function NotificationsMenu() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const push = usePushNotifications()

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await notificationsApi.list()).data,
    refetchInterval: 30_000,
  })

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => (await notificationsApi.unreadCount()).data,
    refetchInterval: 30_000,
  })

  const markAll = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: () => toast.error('Não foi possível marcar como lidas.'),
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notificações</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={(e) => {
              e.preventDefault()
              markAll.mutate()
            }}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas
          </Button>
        </div>
        {push.supported && push.permission === 'default' && (
          <div className="border-b bg-accent/40 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">
              Receba propostas, mensagens e avisos de shows direto no celular, mesmo com o app fechado.
            </p>
            <Button
              size="sm"
              className="mt-2 h-8 w-full text-xs"
              disabled={push.busy}
              onClick={(e) => {
                e.preventDefault()
                void push.enable()
              }}
            >
              <BellRing className="h-3.5 w-3.5" />
              {push.busy ? 'Ativando...' : 'Ativar notificações neste aparelho'}
            </Button>
          </div>
        )}
        {push.supported && push.permission === 'denied' && (
          <p className="border-b px-3 py-2 text-xs text-muted-foreground">
            As notificações estão bloqueadas neste navegador. Libere nas configurações do site para receber avisos.
          </p>
        )}
        {!push.supported && push.needsInstall && (
          <p className="border-b px-3 py-2 text-xs text-muted-foreground">
            No iPhone, instale o app (Compartilhar → Adicionar à Tela de Início) para ativar as notificações.
          </p>
        )}
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nenhuma notificação</p>
          )}
          {notifications.map((n) => (
            <button
              key={n.id}
              className={cn(
                'block w-full border-b px-3 py-2.5 text-left last:border-0 hover:bg-accent',
                !n.isRead && 'bg-accent/50'
              )}
              onClick={() => {
                if (!n.isRead) notificationsApi.markRead(n.id).then(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }))
                if (n.link) navigate(n.link)
              }}
            >
              <p className="text-sm font-medium">{n.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
              <p className="mt-1 text-[11px] text-muted-foreground/70">{formatDate(n.createdAt)}</p>
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
