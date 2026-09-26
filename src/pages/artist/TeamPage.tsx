import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { teamApi } from '@/services'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/badges'
import { formatMoney } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import type { ShareType } from '@/types'

export function TeamPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: async () => (await teamApi.list()).data,
  })

  const remove = useMutation({
    mutationFn: (id: string) => teamApi.remove(id),
    onSuccess: () => {
      toast.success('Membro removido.')
      queryClient.invalidateQueries({ queryKey: ['team'] })
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipe</h1>
          <p className="text-sm text-muted-foreground">
            Integrantes da banda/grupo e divisão de cachê (percentual ou fixa)
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setOpen(true)
          }}
        >
          <Plus /> Novo membro
        </Button>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : members.length === 0 ? (
        <EmptyState
          title="Nenhum membro cadastrado"
          description="Integrantes não precisam de conta — cadastre e defina a divisão."
          icon={<Users />}
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus /> Cadastrar membro
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.role || 'Integrante'}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(member.id)
                        setOpen(true)
                      }}
                    >
                      Editar
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove.mutate(member.id)}>
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-md bg-accent px-3 py-2 text-sm">
                  <span>Divisão padrão</span>
                  <span className="font-semibold">
                    {member.defaultShareType === 'Percentage'
                      ? `${member.defaultShareValue}%`
                      : formatMoney(member.defaultShareValue)}
                  </span>
                </div>
                {(member.phone || member.email) && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {[member.phone, member.email].filter(Boolean).join(' • ')}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TeamMemberDialog
        open={open}
        onClose={() => setOpen(false)}
        editing={members.find((m) => m.id === editing) ?? null}
      />
    </div>
  )
}

function TeamMemberDialog({
  open,
  onClose,
  editing,
}: {
  open: boolean
  onClose: () => void
  editing: import('@/types').TeamMember | null
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [shareType, setShareType] = useState<ShareType>('Percentage')
  const [shareValue, setShareValue] = useState('')
  const [notes, setNotes] = useState('')
  const [loadedId, setLoadedId] = useState<string | null>(null)

  // carrega dados do membro ao abrir em modo edição
  if (open && editing && loadedId !== editing.id) {
    setName(editing.name)
    setRole(editing.role)
    setPhone(editing.phone)
    setEmail(editing.email)
    setShareType(editing.defaultShareType)
    setShareValue(String(editing.defaultShareValue))
    setNotes(editing.notes)
    setLoadedId(editing.id)
  }
  if (open && !editing && loadedId !== 'new') {
    setName('')
    setRole('')
    setPhone('')
    setEmail('')
    setShareType('Percentage')
    setShareValue('')
    setNotes('')
    setLoadedId('new')
  }

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        role,
        phone,
        email,
        photoUrl: '',
        defaultShareType: shareType,
        defaultShareValue: Number(shareValue.replace(',', '.')) || 0,
        notes,
      }
      return editing ? teamApi.update(editing.id, payload) : teamApi.create(payload)
    },
    onSuccess: () => {
      toast.success(editing ? 'Membro atualizado!' : 'Membro cadastrado!')
      queryClient.invalidateQueries({ queryKey: ['team'] })
      onClose()
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar membro' : 'Novo membro'}</DialogTitle>
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
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Função</Label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Ex.: Guitarrista" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de divisão</Label>
              <Select value={shareType} onValueChange={(v) => setShareType(v as ShareType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Percentage">Percentual (%)</SelectItem>
                  <SelectItem value="Fixed">Valor fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{shareType === 'Percentage' ? 'Percentual' : 'Valor'}</Label>
              <Input value={shareValue} onChange={(e) => setShareValue(e.target.value)} placeholder="0" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
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
