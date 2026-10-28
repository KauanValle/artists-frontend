import { useMemo, useState } from 'react'
import { addDays, addMonths, endOfMonth, endOfWeek, format, isBefore, isSameDay, startOfMonth, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type CalendarMode = 'weekly' | 'monthly'

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

interface CalendarBaseProps {
  mode?: CalendarMode
  minDate?: string
  /** Datas que não podem ser selecionadas (bloqueio do dia inteiro) — aparecem riscadas. */
  disabledDates?: string[]
  /** Datas com bloqueio parcial de horário — continuam selecionáveis, mas marcadas com texto âmbar. */
  partialDates?: string[]
  /** Dias da semana (0=Dom..6=Sáb) que o artista atende — quando informado, os demais ficam bloqueados. */
  workingWeekdays?: number[]
}

/**
 * Seletor visual de data reutilizável (dia único).
 *
 * @param mode 'weekly' exibe uma faixa de 7 dias com navegação semana a semana;
 *             'monthly' exibe a grade do mês completo. Padrão: 'weekly'.
 * @param value/onChange usam o formato 'yyyy-MM-dd' (compatível com a API).
 * @param minDate data mínima selecionável (ex.: hoje em fluxos de contratação).
 *
 * Uso: <DatePickerCalendar value={eventDate} onChange={setEventDate} mode="weekly" minDate={today} />
 */
export function DatePickerCalendar({
  value,
  onChange,
  mode = 'weekly',
  minDate,
  disabledDates,
  partialDates,
  workingWeekdays,
}: {
  value?: string
  onChange: (date: string) => void
} & CalendarBaseProps) {
  const [cursor, setCursor] = useState<Date>(value ? new Date(`${value}T00:00:00`) : new Date())

  return (
    <CalendarView
      cursor={cursor}
      setCursor={setCursor}
      mode={mode}
      minDate={minDate}
      disabledDates={disabledDates}
      partialDates={partialDates}
      workingWeekdays={workingWeekdays}
      selectedKeys={value ? [value] : []}
      onPick={onChange}
    />
  )
}

/**
 * Seleção múltipla de datas na grade do mês (ex.: disponibilidade do artista).
 * Clicar em um dia selecionado o desmarca; onChange devolve a lista ordenada.
 */
export function MultiDatePickerCalendar({
  selected,
  onChange,
  mode = 'monthly',
  minDate,
  disabledDates,
  partialDates,
}: {
  selected: string[]
  onChange: (dates: string[]) => void
} & CalendarBaseProps) {
  const [cursor, setCursor] = useState<Date>(() =>
    selected.length > 0 ? new Date(`${selected[0]}T00:00:00`) : new Date()
  )

  const onPick = (key: string) =>
    onChange(selected.includes(key) ? selected.filter((d) => d !== key) : [...selected, key].sort())

  return (
    <CalendarView
      cursor={cursor}
      setCursor={setCursor}
      mode={mode}
      minDate={minDate}
      disabledDates={disabledDates}
      partialDates={partialDates}
      selectedKeys={selected}
      onPick={onPick}
    />
  )
}

/// Grade compartilhada pelos dois modos — a navegação e a lógica de datas vêm do chamador.
function CalendarView({
  cursor,
  setCursor,
  mode,
  minDate,
  disabledDates,
  partialDates,
  workingWeekdays,
  selectedKeys,
  onPick,
}: {
  cursor: Date
  setCursor: (date: Date) => void
  mode: CalendarMode
  minDate?: string
  disabledDates?: string[]
  partialDates?: string[]
  workingWeekdays?: number[]
  selectedKeys: string[]
  onPick: (key: string) => void
}) {
  const range = useMemo(() => {
    if (mode === 'monthly') return { from: startOfMonth(cursor), to: endOfMonth(cursor) }
    return { from: startOfWeek(cursor, { weekStartsOn: 0 }), to: endOfWeek(cursor, { weekStartsOn: 0 }) }
  }, [mode, cursor])

  const days = useMemo(() => {
    const list: Date[] = []
    let current = range.from
    while (current <= range.to) {
      list.push(current)
      current = addDays(current, 1)
    }
    return list
  }, [range])

  const navigate = (direction: 1 | -1) =>
    setCursor(mode === 'monthly' ? addMonths(cursor, direction) : addDays(cursor, direction * 7))

  const blocked = useMemo(() => new Set(disabledDates ?? []), [disabledDates])
  const partial = useMemo(() => new Set(partialDates ?? []), [partialDates])

  const isDisabled = (day: Date) => {
    if (minDate && isBefore(day, new Date(`${minDate}T00:00:00`))) return true
    if (blocked.has(format(day, 'yyyy-MM-dd'))) return true
    // Dias de trabalho declarados: dias da semana fora deles ficam bloqueados.
    if (workingWeekdays && workingWeekdays.length > 0 && !workingWeekdays.includes(day.getDay())) return true
    return false
  }

  return (
    <div className="rounded-lg border p-3">
      {/* Cabeçalho: período navegado + voltar para hoje */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-medium capitalize">
          {mode === 'monthly'
            ? format(cursor, 'MMMM yyyy', { locale: ptBR })
            : `${format(range.from, 'dd MMM', { locale: ptBR })} – ${format(range.to, 'dd MMM yyyy', { locale: ptBR })}`}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setCursor(new Date())}
          >
            Hoje
          </button>
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Dias da semana (cabeçalho da grade mensal) */}
      {mode === 'monthly' && (
        <div className="grid grid-cols-7 gap-1">
          {WEEK_DAYS.map((day) => (
            <span key={day} className="py-1 text-center text-xs font-medium text-muted-foreground">
              {day}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-7 gap-1">
        {/* Preenchimento inicial da grade mensal */}
        {mode === 'monthly' &&
          Array.from({ length: range.from.getDay() }).map((_, index) => (
            <span key={`blank-${index}`} aria-hidden />
          ))}

        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const isSelected = selectedKeys.includes(key)
          const isPast = minDate ? isBefore(day, new Date(`${minDate}T00:00:00`)) : false
          const isBlocked = !isPast && blocked.has(key)
          const disabled = isDisabled(day)
          const isToday = isSameDay(day, new Date())

          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!disabled) onPick(key)
              }}
              className={cn(
                'relative rounded-md py-1.5 text-sm font-medium transition-colors',
                isSelected
                  ? 'bg-primary font-semibold text-primary-foreground'
                  : 'hover:bg-accent',
                !isSelected && isToday && 'ring-1 ring-inset ring-primary/50',
                !isSelected && partial.has(key) && 'text-amber-600 dark:text-amber-400',
                disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent',
                isBlocked && !isSelected && 'line-through decoration-destructive/70'
              )}
            >
              {mode === 'weekly' && (
                <span
                  className={cn(
                    'block text-[10px] font-normal',
                    isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  )}
                >
                  {format(day, 'EEE', { locale: ptBR })}
                </span>
              )}
              {format(day, 'dd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
