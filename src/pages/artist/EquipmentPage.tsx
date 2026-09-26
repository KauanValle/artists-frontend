import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Package, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { equipmentApi } from '@/services'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState, equipmentStatusLabel } from '@/components/badges'
import { formatMoney } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import type { Equipment, EquipmentStatus } from '@/types'

export function EquipmentPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Equipment | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['equipment', statusFilter],
    queryFn: async () => (await equipmentApi.list(statusFilter || undefined)).data,
  })

  const remove = useMutation({
    mutationFn: (id: string) => equipmentApi.remove(id),
    onSuccess: () => {
      toast.success('Equipamento removido.')
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const statusVariant: Record<EquipmentStatus, 'success' | 'info' | 'warning' | 'muted'> = {
    Available: 'success',
    InUse: 'info',
    Maintenance: 'warning',
    Unavailable: 'muted',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Equipamentos</h1>
          <p className="text-sm text-muted-foreground">Inventário com checklist por evento</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os status</SelectItem>
              {Object.entries(equipmentStatusLabel).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            <Plus /> Novo equipamento
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhum equipamento"
          description="Cadastre o inventário para usar nos checklists de evento."
          icon={<Package />}
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus /> Cadastrar equipamento
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[item.brand, item.model].filter(Boolean).join(' ') || item.category || '—'}
                    </p>
                  </div>
                  <Badge variant={statusVariant[item.status]}>{equipmentStatusLabel[item.status]}</Badge>
                </div>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {item.identifier && <p>Identificador: {item.identifier}</p>}
                  {item.weightKg !== null && <p>Peso: {item.weightKg} kg</p>}
                  {item.value !== null && <p>Valor: {formatMoney(item.value)}</p>}
                </div>
                <div className="mt-3 flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(item)
                      setOpen(true)
                    }}
                  >
                    Editar
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(item.id)}>
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EquipmentDialog open={open} onClose={() => setOpen(false)} editing={editing} />
    </div>
  )
}

function EquipmentDialog({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Equipment | null }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    name: '',
    category: '',
    brand: '',
    model: '',
    identifier: '',
    weightKg: '',
    value: '',
    status: 'Available' as EquipmentStatus,
    notes: '',
  })
  const [loadedId, setLoadedId] = useState<string | null>(null)

  if (open) {
    const target = editing?.id ?? 'new'
    if (loadedId !== target) {
      setForm({
        name: editing?.name ?? '',
        category: editing?.category ?? '',
        brand: editing?.brand ?? '',
        model: editing?.model ?? '',
        identifier: editing?.identifier ?? '',
        weightKg: editing?.weightKg != null ? String(editing.weightKg) : '',
        value: editing?.value != null ? String(editing.value) : '',
        status: editing?.status ?? 'Available',
        notes: editing?.notes ?? '',
      })
      setLoadedId(target)
    }
  }

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        category: form.category,
        brand: form.brand,
        model: form.model,
        identifier: form.identifier,
        weightKg: form.weightKg ? Number(form.weightKg) : null,
        value: form.value ? Number(form.value) : null,
        status: form.status,
        notes: form.notes,
      }
      return editing ? equipmentApi.update(editing.id, payload) : equipmentApi.create(payload)
    },
    onSuccess: () => {
      toast.success(editing ? 'Equipamento atualizado!' : 'Equipamento cadastrado!')
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
      onClose()
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const set = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar equipamento' : 'Novo equipamento'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(equipmentStatusLabel).map(([value, label]) => (
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
              <Label>Categoria</Label>
              <Input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Ex.: Áudio" />
            </div>
            <div className="space-y-1.5">
              <Label>Marca</Label>
              <Input value={form.brand} onChange={(e) => set('brand', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Modelo</Label>
              <Input value={form.model} onChange={(e) => set('model', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Identificador</Label>
              <Input value={form.identifier} onChange={(e) => set('identifier', e.target.value)} placeholder="Nº de série" />
            </div>
            <div className="space-y-1.5">
              <Label>Peso (kg)</Label>
              <Input value={form.weightKg} onChange={(e) => set('weightKg', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input value={form.value} onChange={(e) => set('value', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Input value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
