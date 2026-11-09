import { useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { enablePush, isPushSupported, needsInstallForPush, syncPushSubscription } from '@/lib/push'

/** Estado e ações das notificações push do PWA (usado no sininho). */
export function usePushNotifications() {
  const queryClient = useQueryClient()
  const supported = isPushSupported()
  const needsInstall = needsInstallForPush()
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    supported ? Notification.permission : 'default',
  )
  const [busy, setBusy] = useState(false)

  // Usuário já autorizou: mantém a inscrição do aparelho vinculada à conta atual.
  useEffect(() => {
    if (supported && Notification.permission === 'granted') {
      syncPushSubscription().catch(() => {})
    }
  }, [supported])

  // O service worker avisa quando chega um push com o app aberto → atualiza o sininho na hora.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'push-received') {
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
      }
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [queryClient])

  const enable = useCallback(async () => {
    setBusy(true)
    try {
      const result = await enablePush()
      setPermission(result)
      if (result === 'granted') toast.success('Notificações ativadas neste aparelho.')
      else if (result === 'denied') toast.error('Notificações bloqueadas. Libere nas configurações do navegador.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível ativar as notificações.')
    } finally {
      setBusy(false)
    }
  }, [])

  return { supported, needsInstall, permission, busy, enable }
}
