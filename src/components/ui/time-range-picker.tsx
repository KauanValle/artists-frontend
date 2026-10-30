import { useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface TimeInterval {
  start: string // 'HH:mm'
  end: string // 'HH:mm' — fim exclusivo na checagem de conflito
}

const SLOT_MINUTES = 30
const DAY_START_MINUTES = 0 * 60 // 06:00
const DAY_END_MINUTES = 24 * 60 // 24:00 (último slot inicia 23:30)

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m ?? 0)
}

function toTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function durationLabel(start: string, end: string): string {
  const total = toMinutes(end) - toMinutes(start)
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return minutes === 0 ? `${hours}h` : `${hours}h${String(minutes).padStart(2, '0')}`
}

/**
 * Seleção visual de horário em um único painel: o cliente clica no horário de INÍCIO
 * e depois no de FIM — a faixa entre eles fica destacada, com duração calculada.
 *
 * @param blocked janelas hard (riscadas/desabilitadas — ex.: show confirmado).
 * @param soft janelas soft (ex.: show pré-reservado) — selecionáveis com destaque âmbar e aviso.
 * @param allowed janelas de atendimento do artista no dia — quando informadas, apenas os
 * horários dentro delas aparecem (fora do expediente não é oferecido). Sem o prop (ou vazio),
 * mantém o grid padrão 06:00–24:00.
 */
export function TimeRangePicker({
  start,
  end,
  onChange,
  blocked = [],
    previousBlocked = [],
  soft = [],
  allowed = [],
  disabled = false,
}: {
  start: string | null
  end: string | null
  onChange: (start: string | null, end: string | null) => void
  blocked?: TimeInterval[]
  soft?: TimeInterval[]
  previousBlocked?: TimeInterval[]
  allowed?: TimeInterval[]
  disabled?: boolean
}) {
  const windows = useMemo(
    () =>
      allowed
        .filter((w) => toMinutes(w.end) > toMinutes(w.start))
        .sort((a, b) => toMinutes(a.start) - toMinutes(b.start)),
    [allowed]
  )

  const slots = useMemo(() => {
    if (windows.length === 0) {
      const list: string[] = []
        if(start && end) {
            for (let t = DAY_START_MINUTES; t < DAY_END_MINUTES; t += SLOT_MINUTES) list.push(toTime(t))
        }
      return list
    }
    // Grade de 30 min dentro de cada janela; início alinhado para cima e fim para baixo.
    // O limite superior fica em 23:30 — "24:00" não é um valor enviável ao backend.
    const list: string[] = []
    const last = DAY_END_MINUTES - SLOT_MINUTES
    let previous = -1
    for (const w of windows) {
      const from = Math.max(Math.ceil(toMinutes(w.start) / SLOT_MINUTES) * SLOT_MINUTES, 0)
      const to = Math.min(Math.floor(toMinutes(w.end) / SLOT_MINUTES) * SLOT_MINUTES, last)
      for (let t = from; t <= to; t += SLOT_MINUTES) {
        if (t > previous) {
          list.push(toTime(t))
          previous = t
        }
      }
    }
    return list
  }, [windows])
  // Uma faixa não pode atravessar um intervalo fora das janelas de atendimento.
  const canSpan = (from: number, to: number) => {
    if (windows.length === 0) return true
    for (let m = from; m <= to; m += SLOT_MINUTES) {
      if (!windows.some((w) => m >= toMinutes(w.start) && m <= toMinutes(w.end))) return false
    }
    return true
  }

  const pick = (slot: string) => {
    // Sem início, com a faixa já completa, ou clicando antes do início: começa uma nova seleção.
    if (!start || end || toMinutes(slot) <= toMinutes(start)) {
      onChange(slot, null)
      return
    }
    // Fim fora da mesma janela de atendimento: reinicia a seleção nesse horário.
    if (!canSpan(toMinutes(start), toMinutes(slot))) {
      onChange(slot, null)
      return
    }
    onChange(start, slot)
  }

  const state = (slot: string): 'start' | 'end' | 'range' | 'free' | 'blocked' | 'soft' | 'previousBlocked' => {
    const m = toMinutes(slot)
    if (blocked.some((b) => m >= toMinutes(b.start) && m < toMinutes(b.end))) return 'blocked'
    if (previousBlocked.some((pb) => m >= toMinutes(pb.start) && m < toMinutes(pb.end))) return 'previousBlocked'
    if (start === slot) return 'start'
    if (end === slot) return 'end'
    if (start && end && m > toMinutes(start) && m < toMinutes(end)) return 'range'
    if (start && !end && m > toMinutes(start)) {
      // Cruzou alguma janela soft: pode prosseguir, mas o slot avisa
      return soft.some((s) => toMinutes(start) < toMinutes(s.end) && m > toMinutes(s.start)) ? 'soft' : 'free'
    }
    return 'free'
  }

  return (
    <div className={cn('space-y-2', disabled && 'pointer-events-none opacity-50')}>
      <div className="flex items-center justify-between">
        <Label>Horário do evento</Label>
        {start && end && (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {start} – {end} · {durationLabel(start, end)}
          </span>
        )}
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {slots.map((slot) => {
          const s = state(slot)
          const softState = s === 'soft'
          const blockedState = s === 'blocked'
          const previousBlockedState = s === 'previousBlocked'
          return (
            <button
              key={slot}
              type="button"
              disabled={disabled || blockedState}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!blockedState) pick(slot)
              }}
              className={cn(
                'rounded-md border py-1.5 text-xs font-medium transition-colors',
                (s === 'start' || s === 'end') && 'border-primary bg-primary text-primary-foreground',
                s === 'range' && 'border-primary/40 bg-primary/10 text-primary',
                s === 'soft' && 'border-amber-500/60 bg-amber-500/10 text-amber-500',
                s === 'free' && 'hover:bg-accent',
                blockedState && 'cursor-not-allowed line-through opacity-40 hover:bg-transparent',
                  previousBlockedState
                      ? start === slot || end === slot
                          ? 'border-primary bg-primary text-primary-foreground'
                          : start && end && toMinutes(slot) > toMinutes(start) && toMinutes(slot) < toMinutes(end)
                              ? 'border-primary/40 bg-primary/10 text-primary'
                              : 'border-amber-100/60 text-amber-100'
                      : ''


              )}
            >
              {slot}
            </button>
          )
        })}
      </div>
        <div>
            {slots.length != 0 ? (
                <p className="text-xs text-muted-foreground">
                    {start && !end
                        ? 'Agora clique no horário de término.'
                        : !start
                            ? 'Clique no horário de início e depois no de término.'
                            : 'Clique em outro horário para refazer a seleção.'}
                </p>
            ) : (
                <div className="bg-red-200 border-l-4 border-red-500 text-orange-700 p-4" role="alert">
                <p className="text-xs text-black">
                    O artista não tem horários de atendimento disponíveis neste dia.
                </p>
                </div>
            )}
        </div>
      
    </div>
  )
}
