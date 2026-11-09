import { useEffect, useState } from 'react'
import { BellRing, X } from 'lucide-react'
import { isPushSupported, needsInstallForPush } from '@/lib/push'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'reprissa.push-prompt-dismissed'
/** Não mostra de novo se o usuário dispensou nos últimos 7 dias. */
const DISMISS_DAYS = 7

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    return Date.now() - Number(raw) < DISMISS_DAYS * 86_400_000
  } catch {
    return false
  }
}

function saveDismiss() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
  } catch {
    // quota / private mode
  }
}

/**
 * Modal que aparece automaticamente quando o usuário logado ainda não
 * autorizou notificações push. Atrasa 2 s para não atrapalhar o carregamento.
 *
 * Regras:
 *  - Só aparece se push é suportado e a permissão está em "default".
 *  - Não aparece se o usuário já dispensou nos últimos 7 dias.
 *  - Se o usuário clicar "Agora não", salva o dismiss e fecha.
 *  - Se clicar "Ativar", chama enablePush (que dispara o prompt nativo do navegador).
 *  - Se a permissão for "denied" ou "granted", não mostra.
 */
export function PushPermissionModal() {
  const push = usePushNotifications()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Não mostra se push não é suportado, se já autorizou/bloqueou, ou se dispensou recentemente.
    if (!isPushSupported()) return
    if (needsInstallForPush()) return
    if (Notification.permission !== 'default') return
    if (wasDismissedRecently()) return

    // Pequeno atraso para não competir com o carregamento da página.
    const timer = setTimeout(() => setOpen(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  // Fecha se o estado de permissão mudar (o usuário ativou ou bloqueou via prompt nativo).
  useEffect(() => {
    if (push.permission !== 'default') setOpen(false)
  }, [push.permission])

  function handleDismiss() {
    saveDismiss()
    setOpen(false)
  }

  async function handleEnable() {
    await push.enable()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <BellRing className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Ative as notificações</DialogTitle>
          <DialogDescription className="text-center">
            Receba propostas, mensagens e avisos de shows direto no seu celular — mesmo com o app fechado.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-2">
          <Button onClick={handleEnable} disabled={push.busy} className="w-full">
            <BellRing className="mr-2 h-4 w-4" />
            {push.busy ? 'Ativando…' : 'Ativar notificações'}
          </Button>
          <Button variant="ghost" onClick={handleDismiss} className="w-full text-muted-foreground">
            Agora não
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
