import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, CheckCircle2, Keyboard, Loader2, ShieldAlert, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDateTime } from '@/lib/utils'
import type { CheckInResult } from '@/services'
import { extractApiError } from '@/services/api'
import { QrScanner } from './QrScanner'

interface CheckInConsoleProps {
  /** Valida e registra a entrada do código lido (do produtor ou da portaria). */
  check: (code: string) => Promise<CheckInResult>
  /** Chamado depois de cada leitura (ex.: atualizar contadores/lista). */
  onResult?: (result: CheckInResult) => void
}

const TONE = {
  Valid: { bg: 'bg-emerald-600', title: 'ENTRADA LIBERADA', Icon: CheckCircle2 },
  AlreadyUsed: { bg: 'bg-amber-600', title: 'JÁ UTILIZADO', Icon: ShieldAlert },
  WrongEvent: { bg: 'bg-red-600', title: 'OUTRO EVENTO', Icon: XCircle },
  NotFound: { bg: 'bg-red-600', title: 'INGRESSO INVÁLIDO', Icon: XCircle },
  Cancelled: { bg: 'bg-red-600', title: 'PEDIDO NÃO PAGO', Icon: XCircle },
} as const

/** Leitura de ingressos: câmera + digitação manual do código, com resultado em cores (verde/amarelo/vermelho). */
export function CheckInConsole({ check, onResult }: CheckInConsoleProps) {
  const [camera, setCamera] = useState(true)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [error, setError] = useState('')
  const [manual, setManual] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    setResult(null)
    setError('')
  }, [])

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  const submit = useCallback(
    async (code: string) => {
      if (busy) return
      setBusy(true)
      setError('')
      try {
        const r = await check(code)
        setResult(r)
        onResult?.(r)
        if ('vibrate' in navigator) navigator.vibrate(r.status === 'Valid' ? 120 : [200, 80, 200])
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setResult(null), r.status === 'Valid' ? 2500 : 5000)
      } catch (e) {
        setError(extractApiError(e))
      } finally {
        setBusy(false)
      }
    },
    [busy, check, onResult]
  )

  const showing = result !== null || error !== ''

  return (
    <div className="space-y-4">
      <div className="relative mx-auto w-full max-w-md">
        {camera ? (
          <QrScanner paused={busy || showing} onScan={(t) => void submit(t)} />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-dashed border-border/60 text-sm text-muted-foreground">
            Câmera desligada
          </div>
        )}

        {busy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}

        {result && (
          <button
            type="button"
            onClick={dismiss}
            className={`absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl p-6 text-center text-white ${TONE[result.status].bg}`}
          >
            {(() => {
              const { Icon } = TONE[result.status]
              return <Icon className="h-14 w-14" />
            })()}
            <p className="text-2xl font-extrabold tracking-tight">{TONE[result.status].title}</p>
            {result.buyerName && <p className="text-lg font-semibold">{result.buyerName}</p>}
            {result.ticketTitle && (
              <p className="text-sm opacity-90">
                {result.ticketTitle}
                {result.sequence && result.quantity ? ` · ingresso ${result.sequence} de ${result.quantity}` : ''}
              </p>
            )}
            {result.status === 'AlreadyUsed' && result.checkedInAt && (
              <p className="text-sm opacity-90">
                Lido em {formatDateTime(result.checkedInAt)}
                {result.checkedInBy ? ` · ${result.checkedInBy}` : ''}
              </p>
            )}
            {result.status !== 'Valid' && result.status !== 'AlreadyUsed' && <p className="text-sm opacity-90">{result.message}</p>}
            <p className="mt-2 text-xs opacity-75">Toque para continuar</p>
          </button>
        )}

        {error && (
          <button
            type="button"
            onClick={dismiss}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-red-600 p-6 text-center text-white"
          >
            <XCircle className="h-12 w-12" />
            <p className="text-sm font-semibold">{error}</p>
            <p className="mt-2 text-xs opacity-75">Toque para continuar</p>
          </button>
        )}
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col gap-3">
        <Button variant="outline" className="gap-2" onClick={() => setCamera((v) => !v)}>
          {camera ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          {camera ? 'Desligar câmera' : 'Ligar câmera'}
        </Button>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (manual.trim() && !busy) {
              void submit(manual)
              setManual('')
            }
          }}
        >
          <div className="relative flex-1">
            <Keyboard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value.toUpperCase())}
              placeholder="Digitar código do ingresso"
              className="pl-9 font-mono uppercase"
              autoCapitalize="characters"
              autoCorrect="off"
            />
          </div>
          <Button type="submit" disabled={!manual.trim() || busy}>
            Validar
          </Button>
        </form>
      </div>
    </div>
  )
}
