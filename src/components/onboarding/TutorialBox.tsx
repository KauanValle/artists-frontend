import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Bot, Check, CheckCircle2, Minus, Sparkles, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/services'
import { extractApiError } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface TutorialStep {
  id: string
  title: string
  text: string
  /** Tela do passo: quando o usuário visita esse caminho E o passo está liberado, conclui automaticamente. */
  href?: string
  hrefLabel?: string
}

interface TutorialState {
  done: boolean
  checked: string[]
  minimizado: boolean
}

export interface TutorialProgress {
  state: TutorialState
  salvar: (next: { checked?: string[]; done?: boolean; minimizado?: boolean }) => void
}

/**
 * Progresso do tutorial persistido NA CONTA (AspNetUsers via PUT /auth/tutorial),
 * então o usuário não refaz o tutorial ao trocar de dispositivo/navegador.
 * Só o "minimizado" fica no dispositivo (localStorage), pois é preferência de tela.
 */
export function useTutorialProgress(storageKey: string, steps: TutorialStep[]): TutorialProgress | null {
  const { user, refreshUser } = useAuth()
  const queryClient = useQueryClient()
  const [minimizado, setMinimizado] = useState<boolean>(
    () => localStorage.getItem(`${storageKey}.minimizado`) === '1'
  )

  const salvar = (next: { checked?: string[]; done?: boolean; minimizado?: boolean }) => {
    if (next.minimizado !== undefined) {
      localStorage.setItem(`${storageKey}.minimizado`, next.minimizado ? '1' : '0')
      setMinimizado(next.minimizado)
    }
    if (next.checked !== undefined || next.done !== undefined) {
      const passos = next.checked ?? user?.tutorialPassos ?? []
      const feito = next.done ?? user?.tutorialFeito ?? false
      // Persiste na conta e sincroniza o usuário do contexto (sidebar reage na hora).
      authApi
        .salvarTutorial({ feito, passos })
        .then(async () => {
          await refreshUser()
          // Tutorial concluído → dados fake saem e as queries recarregam com dados reais.
          if (feito) await queryClient.invalidateQueries()
        })
        .catch(() => {})
    }
  }

  if (!user) return null
  return {
    state: { done: user.tutorialFeito === true, checked: user.tutorialPassos ?? [], minimizado },
    salvar,
  }
}

/// <summary>
/// Tutorial inicial em caixa estilo assistente (sem chat), estritamente sequencial:
/// o painel fica direto na tela (translúcido, minimizável em pílula) e o checklist
/// revela um passo por vez — passos futuros só aparecem quando os anteriores concluem.
/// Passos com `href` concluem automaticamente ao visitar a tela, se liberados.
/// Botão: "Próximo passo" até o passo final, que vira "Marcar como concluído";
/// com tudo marcado, aparece "Concluir tutorial".
/// </summary>
export function TutorialBox({
  title,
  subtitle = 'Tutorial inicial',
  steps,
  progress,
}: {
  title: string
  subtitle?: string
  steps: TutorialStep[]
  progress: TutorialProgress | null
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const state = progress?.state ?? null

  const checkedSet = useMemo(() => new Set(state?.checked ?? []), [state?.checked])
  const todosOk = steps.every((s) => checkedSet.has(s.id))
  // Passo atual = sempre o primeiro ainda não concluído (ordem fixa, sem pular).
  const atualIdx = useMemo(() => steps.findIndex((s) => !checkedSet.has(s.id)), [steps, checkedSet])
  const passoAtual = todosOk ? null : steps[atualIdx]
  const ehUltimoPasso = atualIdx === steps.length - 1

  // Overlay "tela nova": fundo escuro translúcido com título/descrição do passo,
  // some sozinho em ~5s (com transição) ou pelo botão de fechar.
  const [overlay, setOverlay] = useState<TutorialStep | null>(null)
  const [overlayVisivel, setOverlayVisivel] = useState(false)
  const overlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const overlayFecharTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fecharOverlay = () => {
    setOverlayVisivel(false)
    if (overlayFecharTimer.current) clearTimeout(overlayFecharTimer.current)
    overlayFecharTimer.current = setTimeout(() => setOverlay(null), 350)
  }

  const mostrarOverlay = (step: TutorialStep) => {
    if (overlayTimer.current) clearTimeout(overlayTimer.current)
    if (overlayFecharTimer.current) clearTimeout(overlayFecharTimer.current)
    setOverlay(step)
    setOverlayVisivel(false)
    requestAnimationFrame(function () {
      setOverlayVisivel(true)
    })
    overlayTimer.current = setTimeout(function () {
      fecharOverlay()
    }, 5000)
  }

  // Avançar de passo: marca o atual e leva o usuário direto para a tela do próximo,
  // exibindo o overlay da tela nova.
  const avancar = () => {
    if (!passoAtual) return
    const proximo = steps[atualIdx + 1]
    progress?.salvar({ checked: [...checkedSet, passoAtual.id] })
    if (proximo?.href) {
      navigate(proximo.href)
      mostrarOverlay(proximo)
    }
  }

  useEffect(function () {
    return function () {
      if (overlayTimer.current) clearTimeout(overlayTimer.current)
      if (overlayFecharTimer.current) clearTimeout(overlayFecharTimer.current)
    }
  }, [])

  // Auto-preenchimento: visita a tela do passo E esse passo é o próximo liberado.
  // Visitas a telas de passos bloqueados não marcam nada (segue o passo a passo).
  useEffect(() => {
    if (!state || state.done) return
    const primeiroPendente = steps.find((s) => !checkedSet.has(s.id))
    if (!primeiroPendente) return
    const passoDaTela = steps.find(
      (s) => s.href && (location.pathname === s.href || location.pathname.startsWith(s.href + '/'))
    )
    if (passoDaTela && passoDaTela.id === primeiroPendente.id) progress?.salvar({ checked: [...checkedSet, passoDaTela.id] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, state?.done, checkedSet, steps])

  // Tutorial concluído → o usuário não vê mais nada (estado vive na conta dele).
  if (!state || state.done) return null

  // Overlay "tela nova" — fundo escuro translúcido com título e descrição do passo atual.
  if (overlay) {
    const passoNum = steps.findIndex((s) => s.id === overlay.id) + 1
    return (
      <div
        className={cn(
          'fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 transition-opacity duration-300',
          overlayVisivel ? 'opacity-100' : 'opacity-0'
        )}
        role="presentation"
      >
        <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-background/90 p-8 text-center shadow-2xl backdrop-blur-md">
          <button
            type="button"
            onClick={fecharOverlay}
            className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Fechar aviso"
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="text-xs font-medium text-primary">
            Passo {passoNum} de {steps.length}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">{overlay.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{overlay.text}</p>
          <Button variant="outline" size="sm" className="mt-5" onClick={fecharOverlay}>
            Entendi, fechar
          </Button>
        </div>
      </div>
    )
  }

  // Minimizado → ícone redondo compacto ao lado do widget de chat no canto da tela.
  if (state.minimizado) {
    const faltam = steps.length - checkedSet.size
    return (
      <button
        type="button"
        onClick={() => progress?.salvar({ minimizado: false })}
        className="fixed bottom-6 right-24 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-background/70 text-primary shadow-lg backdrop-blur-md transition-transform hover:scale-105"
        aria-label="Expandir tutorial"
        title={`Tutorial do Reprissa — ${faltam === 0 ? 'pronto para concluir' : `faltam ${faltam} passo${faltam > 1 ? 's' : ''}`}`}
      >
        <Bot className="h-6 w-6" />
        {faltam > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-bold text-amber-950">
            {faltam > 9 ? '9+' : faltam}
          </span>
        )}
      </button>
    )
  }

  return (
    <div
      role="dialog"
      aria-label="Tutorial do Reprissa"
      className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-border/60 bg-background/85 shadow-2xl backdrop-blur-md"
    >
      {/* Cabeçalho estilo assistente */}
      <div className="flex items-center gap-3 border-b border-border/60 bg-primary/5 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => progress?.salvar({ minimizado: true })}
          aria-label="Minimizar tutorial"
          title="Minimizar"
        >
          <Minus className="h-4 w-4" />
        </Button>
      </div>

      {/* Progresso */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{todosOk ? 'Tudo pronto!' : `Passo ${atualIdx + 1} de ${steps.length}`}</span>
          <span>
            {checkedSet.size}/{steps.length} concluídos
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/70">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.round((checkedSet.size / steps.length) * 100)}%` }}
          />
        </div>
      </div>

      {/* Checklist sequencial — revela um passo por vez: só aparecem os concluídos e o atual */}
      <div className="max-h-40 space-y-0.5 overflow-y-auto p-2">
        {steps.map((s, i) => {
          if (i > atualIdx) return null
          const ok = checkedSet.has(s.id)
          return (
            <div
              key={s.id}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs',
                !ok && 'bg-accent/70',
                ok && 'text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold',
                  ok ? 'border-primary bg-primary text-primary-foreground' : 'border-primary/50 text-primary'
                )}
                aria-hidden
              >
                {ok ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className={cn('truncate', ok && 'line-through opacity-70')}>{s.title}</span>
              {ok && <CheckCircle2 className="ml-auto h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />}
            </div>
          )
        })}
      </div>

      {/* Passo atual (ou estado final) */}
      {passoAtual ? (
        <div className="border-t border-border/60 p-4">
          <p className="text-xs font-medium text-primary">Passo {atualIdx + 1}</p>
          <h3 className="mt-0.5 text-sm font-semibold">{passoAtual.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{passoAtual.text}</p>
          {passoAtual.href && (
            <Link
              to={passoAtual.href}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
            >
              {passoAtual.hrefLabel ?? 'Ir para a tela'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      ) : (
        <div className="border-t border-border/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="h-5 w-5 text-primary" /> Você passou por tudo! 🎉
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Conclua o tutorial para liberar o painel e seguir usando o Reprissa normalmente.
          </p>
        </div>
      )}

      {/* Ação: "Próximo passo" até o último; no último, "Marcar como concluído"; no fim, "Concluir tutorial" */}
      <div className="border-t border-border/60 p-3">
        {todosOk ? (
            <Link to={'/artist/dashboard'}>
                <Button className="w-full" onClick={() => progress?.salvar({ done: true })}>
                    <CheckCircle2 className="h-4 w-4" /> Concluir tutorial 🎉
                </Button>
            </Link>
          
        ) : ehUltimoPasso && passoAtual ? (
          <Button className="w-full" onClick={avancar}>
            <Check className="h-4 w-4" /> Marcar como concluído
          </Button>
        ) : passoAtual ? (
          <Button className="w-full" onClick={avancar}>
            Próximo passo <ArrowRight className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
