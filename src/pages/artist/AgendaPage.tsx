import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, addMonths, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { eventsApi } from '@/services'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EventStatusBadge, EmptyState, eventTypeLabel } from '@/components/badges'
import { cn } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import type { EventItem, EventType } from '@/types'

type View = 'month' | 'week' | 'day'

export function AgendaPage() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<View>('month')
  const [cursor, setCursor] = useState(new Date())
  const [createOpen, setCreateOpen] = useState(false)

  const range = useMemo(() => {
    if (view === 'month') return { from: startOfMonth(cursor), to: endOfMonth(cursor) }
    if (view === 'week') return { from: startOfWeek(cursor, { weekStartsOn: 0 }), to: endOfWeek(cursor, { weekStartsOn: 0 }) }
    return { from: cursor, to: cursor }
  }, [view, cursor])

  const fromStr = format(range.from, 'yyyy-MM-dd')
  const toStr = format(range.to, 'yyyy-MM-dd')

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', fromStr, toStr],
    queryFn: async () => (await eventsApi.list({ from: fromStr, to: toStr })).data,
  })

  const days = useMemo(() => {
    const list: Date[] = []
    let current = range.from
    while (current <= range.to) {
      list.push(current)
      current = addDays(current, 1)
    }
    return list
  }, [range])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventItem[]>()
    for (const event of events) {
      const key = format(new Date(event.startDateTime), 'yyyy-MM-dd')
      map.set(key, [...(map.get(key) ?? []), event])
    }
    return map
  }, [events])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-sm text-muted-foreground">Shows, ensaios, reuniões, viagens e gravações — com detecção de conflitos</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={view} onValueChange={(v) => setView(v as View)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="day">Dia</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setCursor(view === 'month' ? addMonths(cursor, -1) : addDays(cursor, view === 'week' ? -7 : -1))}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCursor(view === 'month' ? addMonths(cursor, 1) : addDays(cursor, view === 'week' ? 7 : 1))}>
            <ChevronRight />
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus /> Novo evento
          </Button>
        </div>
      </div>

      <p className="text-sm font-medium capitalize">
        {view === 'month'
          ? format(cursor, 'MMMM yyyy', { locale: ptBR })
          : view === 'week'
            ? `${format(range.from, 'dd MMM', { locale: ptBR })} – ${format(range.to, 'dd MMM yyyy', { locale: ptBR })}`
            : format(cursor, "EEEE, dd 'de' MMMM", { locale: ptBR })}
      </p>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando agenda...</p>
      ) : view === 'month' ? (
        <Card>
          <CardContent className="p-2">
            <div className="grid grid-cols-7 gap-px text-center text-xs font-medium text-muted-foreground">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                <div key={d} className="py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px">
              {days.map((day) => {
                const key = format(day, 'yyyy-MM-dd')
                const dayEvents = eventsByDay.get(key) ?? []
                const isToday = key === format(new Date(), 'yyyy-MM-dd')
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setCursor(day)
                      setView('day')
                    }}
                    className={cn(
                      'min-h-24 rounded-md border p-1.5 text-left align-top hover:bg-accent',
                      isToday && 'border-primary'
                    )}
                  >
                    <span className={cn('text-xs', isToday && 'font-bold text-primary')}>{format(day, 'd')}</span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 2).map((event) => (
                        <p
                          key={event.id}
                          className={cn(
                            'truncate rounded px-1 py-0.5 text-[10px]',
                            event.status === 'Cancelled'
                              ? 'bg-muted text-muted-foreground line-through'
                              : event.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-primary/10 text-primary'
                          )}
                        >
                          {format(new Date(event.startDateTime), 'HH:mm')} {event.title}
                        </p>
                      ))}
                      {dayEvents.length > 2 && <p className="px-1 text-[10px] text-muted-foreground">+{dayEvents.length - 2} mais</p>}
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayEvents = eventsByDay.get(key) ?? []
            return (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm capitalize">{format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dayEvents.length === 0 && <p className="text-sm text-muted-foreground">Sem eventos.</p>}
                  {dayEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {eventTypeLabel[event.type]} • {format(new Date(event.startDateTime), 'HH:mm')} – {format(new Date(event.endDateTime), 'HH:mm')}
                          {event.location ? ` • ${event.location}` : ''}
                        </p>
                      </div>
                      <EventStatusBadge status={event.status} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
          {events.length === 0 && <EmptyState title="Nenhum evento no período" icon={<CalendarDays />} />}
        </div>
      )}

      <CreateEventDialog open={createOpen} onClose={() => setCreateOpen(false)} defaultDate={cursor} />
    </div>
  )
}

export function CreateEventDialog({
  open,
  onClose,
  defaultDate,
}: {
  open: boolean
  onClose: () => void
  defaultDate: Date
}) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<EventType>('Show')
  const [date, setDate] = useState(format(defaultDate, 'yyyy-MM-dd'))
  const [start, setStart] = useState('20:00')
  const [end, setEnd] = useState('23:00')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')

  const create = useMutation({
    mutationFn: () =>
      eventsApi.create({
        title,
        type,
        startDateTime: new Date(`${date}T${start}:00`).toISOString(),
        endDateTime: new Date(`${date}T${end}:00`).toISOString(),
        location,
        description,
      }),
    onSuccess: () => {
      toast.success('Evento criado!')
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['events-upcoming'] })
      onClose()
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo evento</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate()
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as EventType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(eventTypeLabel).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Início</Label>
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Fim</Label>
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Local</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Salvando...' : 'Criar evento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
