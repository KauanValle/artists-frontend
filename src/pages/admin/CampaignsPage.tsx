import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Target,
  ExternalLink,
  Copy,
  X,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'

type CampaignType = 0 | 1 // 0 = Date, 1 = Goal

interface Campaign {
  id: string
  slug: string
  name: string
  description: string
  rules: string
  type: CampaignType
  startDate: string | null
  endDate: string | null
  goalDescription: string | null
  goalTarget: number | null
  goalCurrent: number | null
  isActive: boolean
  createdAt: string
}

interface CampaignForm {
  slug: string
  name: string
  description: string
  rules: string
  type: CampaignType
  startDate: string
  endDate: string
  goalDescription: string
  goalTarget: string
}

const emptyForm: CampaignForm = {
  slug: '',
  name: '',
  description: '',
  rules: '',
  type: 0,
  startDate: '',
  endDate: '',
  goalDescription: '',
  goalTarget: '',
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function CampaignsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CampaignForm>(emptyForm)

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ['admin-campaigns'],
    queryFn: () => api.get('/admin/campaigns').then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: (data: object) => api.post('/admin/campaigns', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-campaigns'] })
      toast.success('Campanha criada!')
      resetForm()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao criar campanha')
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) =>
      api.put(`/admin/campaigns/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-campaigns'] })
      toast.success('Campanha atualizada!')
      resetForm()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao atualizar')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/campaigns/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-campaigns'] })
      toast.success('Campanha excluída')
    },
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put(`/admin/campaigns/${id}`, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-campaigns'] })
    },
  })

  function resetForm() {
    setForm(emptyForm)
    setShowForm(false)
    setEditingId(null)
  }

  function startEdit(c: Campaign) {
    setForm({
      slug: c.slug,
      name: c.name,
      description: c.description,
      rules: c.rules,
      type: c.type,
      startDate: c.startDate ? c.startDate.slice(0, 10) : '',
      endDate: c.endDate ? c.endDate.slice(0, 10) : '',
      goalDescription: c.goalDescription ?? '',
      goalTarget: c.goalTarget?.toString() ?? '',
    })
    setEditingId(c.id)
    setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const payload: any = {
      slug: form.slug,
      name: form.name,
      description: form.description,
      rules: form.rules,
      type: form.type,
    }

    if (form.type === 0) {
      payload.startDate = form.startDate ? new Date(form.startDate).toISOString() : null
      payload.endDate = form.endDate ? new Date(form.endDate).toISOString() : null
    } else {
      payload.goalDescription = form.goalDescription || null
      payload.goalTarget = form.goalTarget ? parseInt(form.goalTarget) : null
    }

    if (editingId) {
      updateMut.mutate({ id: editingId, data: payload })
    } else {
      createMut.mutate(payload)
    }
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/c/${slug}`
    navigator.clipboard.writeText(url)
    toast.success('Link copiado!')
  }

  const isSaving = createMut.isPending || updateMut.isPending

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campanhas</h1>
          <p className="text-sm text-muted-foreground">
            Crie landing pages para campanhas, sorteios e promoções.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => { resetForm(); setShowForm(true) }} className="gap-2">
            <Plus className="h-4 w-4" /> Nova campanha
          </Button>
        )}
      </div>

      {/* ── FORM ── */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border bg-card p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {editingId ? 'Editar campanha' : 'Nova campanha'}
            </h2>
            <Button type="button" variant="ghost" size="icon" onClick={resetForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome da campanha</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Sorteio de Ingressos"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (rota)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/</span>
                <Input
                  required
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, slug: slugify(e.target.value) }))
                  }
                  placeholder="sorteio-ingressos"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <textarea
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Descreva a campanha..."
            />
          </div>

          <div className="space-y-2">
            <Label>Regras</Label>
            <textarea
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
              value={form.rules}
              onChange={(e) => setForm((f) => ({ ...f, rules: e.target.value }))}
              placeholder="Regras de participação..."
            />
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo da campanha</Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, type: 0 }))}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                  form.type === 0
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                <Calendar className="h-4 w-4" /> Por data
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, type: 1 }))}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                  form.type === 1
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                <Target className="h-4 w-4" /> Por meta
              </button>
            </div>
          </div>

          {/* Campos por tipo */}
          {form.type === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Data de início</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Data de fim</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Descrição da meta</Label>
                <Input
                  value={form.goalDescription}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, goalDescription: e.target.value }))
                  }
                  placeholder="Ex: 500 seguidores no Instagram"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor da meta</Label>
                <Input
                  type="number"
                  value={form.goalTarget}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, goalTarget: e.target.value }))
                  }
                  placeholder="500"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? 'Salvando...'
                : editingId
                  ? 'Salvar alterações'
                  : 'Criar campanha'}
            </Button>
          </div>
        </form>
      )}

      {/* ── LIST ── */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">Nenhuma campanha criada ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{c.name}</h3>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      c.isActive
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {c.isActive ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {c.description}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {c.type === 0 ? (
                      <>
                        <Calendar className="h-3 w-3" />
                        {c.startDate
                          ? `${new Date(c.startDate).toLocaleDateString('pt-BR')} — ${c.endDate ? new Date(c.endDate).toLocaleDateString('pt-BR') : '...'}`
                          : 'Sem data definida'}
                      </>
                    ) : (
                      <>
                        <Target className="h-3 w-3" />
                        {c.goalDescription ?? 'Meta'}
                        {c.goalTarget ? ` (${c.goalCurrent ?? 0}/${c.goalTarget})` : ''}
                      </>
                    )}
                  </span>
                  <span className="font-mono text-primary">/c/{c.slug}</span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Copiar link"
                  onClick={() => copyLink(c.slug)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Abrir página"
                  onClick={() => window.open(`/c/${c.slug}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title={c.isActive ? 'Desativar' : 'Ativar'}
                  onClick={() =>
                    toggleMut.mutate({ id: c.id, isActive: !c.isActive })
                  }
                >
                  <Check
                    className={`h-4 w-4 ${c.isActive ? 'text-emerald-500' : 'text-muted-foreground'}`}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Editar"
                  onClick={() => startEdit(c)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Excluir"
                  onClick={() => {
                    if (confirm('Tem certeza que deseja excluir esta campanha?'))
                      deleteMut.mutate(c.id)
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
