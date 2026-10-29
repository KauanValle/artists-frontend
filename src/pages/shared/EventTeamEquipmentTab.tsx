import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { equipmentApi, eventsApi, teamApi } from '@/services'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatMoney } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import type { Booking, Equipment, TeamMember } from '@/types'

type EventDetailPayload = Awaited<ReturnType<typeof eventsApi.get>>['data']

interface AttachedEquipment {
  id: string
  equipmentId: string
  equipmentName: string
  isChecked: boolean
  notes: string
}

interface AttachedTeamShare {
  teamMemberId: string
  memberName: string
  shareType: 'Percentage' | 'Fixed'
  shareValue: number
}

/**
 * Aba "Equipe/Equip./Docs" do show: anexa ao evento os membros de equipe
 * (com divisão) e os equipamentos do checklist do artista.
 */
export function EventTeamEquipmentTab({ booking }: { booking: Booking }) {
  const { user } = useAuth()
  const isArtist = user?.role === 'Artist'
  const queryClient = useQueryClient()
  const eventId = booking.eventId

  const invalidate = () => {
    if (eventId) queryClient.invalidateQueries({ queryKey: ['event-detail', eventId] })
  }

  const { data: detail } = useQuery({
    queryKey: ['event-detail', eventId],
    queryFn: async () => (await eventsApi.get(eventId!)).data,
    enabled: !!eventId,
  })

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team'],
    queryFn: async () => (await teamApi.list()).data,
    enabled: isArtist,
  })

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment', ''],
    queryFn: async () => (await equipmentApi.list()).data,
    enabled: isArtist,
  })

  if (!eventId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          A agenda do show ainda não foi criada — ela é gerada automaticamente quando a contratação é confirmada.
        </CardContent>
      </Card>
    )
  }

  if (!detail) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Carregando equipe e equipamentos...</p>
  }

  return (
    <div className="space-y-6">
      <EquipmentSection
        eventId={eventId}
        attached={detail.equipment}
        artistEquipment={equipment}
        isArtist={isArtist}
        invalidate={invalidate}
      />
      <TeamSection
        eventId={eventId}
        attached={detail.teamShares}
        artistTeam={teamMembers}
        isArtist={isArtist}
        invalidate={invalidate}
      />
    </div>
  )
}

function EquipmentSection({
  eventId,
  attached,
  artistEquipment,
  isArtist,
  invalidate,
}: {
  eventId: string
  attached: AttachedEquipment[]
  artistEquipment: Equipment[]
  isArtist: boolean
  invalidate: () => void
}) {
  const [selectedId, setSelectedId] = useState('')
  const [notes, setNotes] = useState('')

  const available = artistEquipment.filter((e) => !attached.some((a) => a.equipmentId === e.id))

  const add = useMutation({
    mutationFn: () => eventsApi.addEquipment(eventId, selectedId, notes),
    onSuccess: () => {
      toast.success('Equipamento adicionado ao evento!')
      setSelectedId('')
      setNotes('')
      invalidate()
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const toggle = useMutation({
    mutationFn: (id: string) => eventsApi.toggleEquipment(eventId, id),
    onSuccess: invalidate,
    onError: (e) => toast.error(extractApiError(e)),
  })

  const remove = useMutation({
    mutationFn: (id: string) => eventsApi.removeEquipment(eventId, id),
    onSuccess: () => {
      toast.success('Equipamento removido do evento.')
      invalidate()
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Equipamentos do evento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {attached.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum equipamento no checklist deste evento ainda.</p>
        )}
        <div className="space-y-2">
          {attached.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={item.isChecked}
                  onChange={() => isArtist && toggle.mutate(item.id)}
                  disabled={!isArtist}
                  title={item.isChecked ? 'Conferido' : 'Pendente'}
                />
                <div>
                  <p className="text-sm font-medium">{item.equipmentName}</p>
                  {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                </div>
              </div>
              {isArtist && (
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(item.id)}>
                  <Trash2 className="text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {isArtist && (
          <div className="flex flex-wrap items-end gap-2 border-t pt-4">
            <div className="min-w-48 flex-1 space-y-1">
              <Label className="text-xs">Equipamento do inventário</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um equipamento" />
                </SelectTrigger>
                <SelectContent>
                  {available.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-40 flex-1 space-y-1">
              <Label className="text-xs">Observação</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
            </div>
            <Button type="button" disabled={!selectedId || add.isPending} onClick={() => add.mutate()}>
              <Plus /> Adicionar
            </Button>
          </div>
        )}
        {!isArtist && attached.length > 0 && (
          <p className="text-xs text-muted-foreground">Checklist gerenciado pelo artista.</p>
        )}
      </CardContent>
    </Card>
  )
}

function TeamSection({
  eventId,
  attached,
  artistTeam,
  isArtist,
  invalidate,
}: {
  eventId: string
  attached: AttachedTeamShare[]
  artistTeam: TeamMember[]
  isArtist: boolean
  invalidate: () => void
}) {
  const [selectedId, setSelectedId] = useState('')
  const [shareType, setShareType] = useState<'Percentage' | 'Fixed'>('Percentage')
  const [shareValue, setShareValue] = useState('')

  const available = artistTeam.filter((m) => !attached.some((s) => s.teamMemberId === m.id))

  const add = useMutation({
    mutationFn: () =>
      eventsApi.setTeamShare(eventId, selectedId, shareType, Number(shareValue.replace(',', '.')) || 0),
    onSuccess: () => {
      toast.success('Membro adicionado ao evento!')
      setSelectedId('')
      setShareValue('')
      invalidate()
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const remove = useMutation({
    mutationFn: (teamMemberId: string) => eventsApi.removeTeamShare(eventId, teamMemberId),
    onSuccess: () => {
      toast.success('Membro removido do evento.')
      invalidate()
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Equipe do evento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {attached.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum membro de equipe neste evento ainda.</p>
        )}
        <div className="space-y-2">
          {attached.map((share) => (
            <div key={share.teamMemberId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{share.memberName}</p>
                <p className="text-xs text-muted-foreground">
                  {share.shareType === 'Percentage' ? `${share.shareValue}% do cachê` : formatMoney(share.shareValue)}
                </p>
              </div>
              {isArtist && (
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(share.teamMemberId)}>
                  <Trash2 className="text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {isArtist && (
          <div className="flex flex-wrap items-end gap-2 border-t pt-4">
            <div className="min-w-48 flex-1 space-y-1">
              <Label className="text-xs">Membro da equipe</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um membro" />
                </SelectTrigger>
                <SelectContent>
                  {available.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-32 space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={shareType} onValueChange={(v) => setShareType(v as 'Percentage' | 'Fixed')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Percentage">Percentual</SelectItem>
                  <SelectItem value="Fixed">Fixo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-28 space-y-1">
              <Label className="text-xs">{shareType === 'Percentage' ? '%' : 'R$'}</Label>
              <Input value={shareValue} onChange={(e) => setShareValue(e.target.value)} placeholder="0" />
            </div>
            <Button type="button" disabled={!selectedId || add.isPending} onClick={() => add.mutate()}>
              <Plus /> Adicionar
            </Button>
          </div>
        )}
        {!isArtist && attached.length > 0 && (
          <p className="text-xs text-muted-foreground">Equipe gerenciada pelo artista.</p>
        )}
      </CardContent>
    </Card>
  )
}
