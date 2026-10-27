import { useMemo, useState } from 'react'
import { addDays, addMonths, endOfMonth, endOfWeek, format, isBefore, isSameDay, startOfMonth, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type CalendarMode = 'weekly' | 'monthly'

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/**
 * Seletor visual de data reutilizável.
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
}: {
  value?: string
  onChange: (date: string) => void
  mode?: CalendarMode
  minDate?: string
}) {
  const [cursor, setCursor] = useState<Date>(value ? new Date(`${value}T00:00:00`) : new Date())

  const selected = value ? new Date(`${value}T00:00:00`) : undefined
  const min = minDate ? new Date(`${minDate}T00:00:00`) : undefined

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
    setCursor((c) => (mode === 'monthly' ? addMonths(c, direction) : addDays(c, direction * 7)))

  const isDisabled = (day: Date) => (min ? isBefore(day, min) : false)

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
          const isSelected = selected ? isSameDay(day, selected) : false
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
                if (!disabled) onChange(key)
              }}
              className={cn(
                'rounded-md border py-1.5 text-sm font-medium transition-colors',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'hover:bg-accent',
                !isSelected && isToday && 'border-primary/50',
                disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent'
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
