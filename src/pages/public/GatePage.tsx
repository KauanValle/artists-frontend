import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, LogOut, ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BrandLogo } from '@/components/ui/brand-logo'
import { formatDate, formatTime } from '@/lib/utils'
import { gateApi, type CheckInResult, type GateSession } from '@/services'
import { extractApiError } from '@/services/api'
import { CheckInConsole } from './tickets/CheckInConsole'

const STORAGE_KEY = 'reprissa:gate-code'

const fmtGate = (code: string) => code.replace(/(.{4})(?=.)/g, '$1-')

/**
 * Portaria: sem login. Quem recebeu o link/código do produtor entra aqui e lê os QR codes dos ingressos
 * do evento — nada além disso fica acessível.
 */
export function GatePage() {
  const [params, setParams] = useSearchParams()
  const [code, setCode] = useState('')
  const [gateCode, setGateCode] = useState<string | null>(null)
  const [session, setSession] = useState<GateSession | null>(null)
  const [counts, setCounts] = useState<{ entered: number; sold: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const open = useCallback(async (raw: string) => {
    setLoading(true)
    setError('')
    try {
      const normalized = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
      const s = (await gateApi.open(normalized)).data
      setSession(s)
      setGateCode(normalized)
      setCounts({ entered: s.enteredCount, sold: s.totalSold })
      try {
        sessionStorage.setItem(STORAGE_KEY, normalized)
      } catch {
        /* sem storage: só não lembra o código */
      }
    } catch (e) {
      setError(extractApiError(e))
      setSession(null)
      setGateCode(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Código no link (?c=...) ou lembrado na sessão do navegador.
  useEffect(() => {
    const fromUrl = params.get('c')
    let saved: string | null = null
    try {
      saved = sessionStorage.getItem(STORAGE_KEY)
    } catch {
      /* ignora */
    }
    const initial = fromUrl ?? saved
    if (initial) {
      if (fromUrl) setParams({}, { replace: true }) // tira o código da barra de endereço
      void open(initial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const leave = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignora */
    }
    setSession(null)
    setGateCode(null)
    setCode('')
  }

  const check = useCallback((ticketCode: string) => gateApi.checkIn(gateCode!, ticketCode).then((r) => r.data), [gateCode])
  const onResult = useCallback((r: CheckInResult) => setCounts({ entered: r.enteredCount, sold: r.totalSold }), [])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <BrandLogo className="h-7 w-7" />
            <span className="font-bold">Portaria</span>
          </div>
          {session && (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={leave}>
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {!session ? (
          <div className="mx-auto max-w-sm space-y-4 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <ScanLine className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-extrabold">Acesso de portaria</h1>
            <p className="text-sm text-muted-foreground">Digite o código que o produtor do evento te enviou.</p>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                if (code.trim() && !loading) void open(code)
              }}
            >
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX"
                className="text-center font-mono text-lg uppercase tracking-widest"
                autoCapitalize="characters"
                autoCorrect="off"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full gap-2" disabled={!code.trim() || loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Entrar
              </Button>
            </form>
          </div>
        ) : (
          <>
            <div className="space-y-1 rounded-2xl border border-border/50 bg-card/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">{session.gateName}</p>
              <h1 className="text-xl font-extrabold leading-tight">{session.eventName}</h1>
              <p className="text-sm text-muted-foreground">
                {formatDate(session.startDate)} às {formatTime(session.startTime)} · {session.venue}
              </p>
              {counts && (
                <div className="pt-2">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">Entradas</span>
                    <span className="text-lg font-extrabold">
                      {counts.entered} <span className="text-sm font-medium text-muted-foreground">/ {counts.sold}</span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${counts.sold > 0 ? Math.min(100, (counts.entered / counts.sold) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <CheckInConsole check={check} onResult={onResult} />
            <p className="text-center text-xs text-muted-foreground">Acesso {fmtGate(gateCode ?? '')}</p>
          </>
        )}
      </main>
    </div>
  )
}
