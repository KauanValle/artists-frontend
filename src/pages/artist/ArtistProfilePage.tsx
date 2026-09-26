import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { artistsApi, availabilityApi, feesApi, uploadsApi } from '@/services'
import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { availabilityStatusLabel } from '@/components/badges'
import { formatDate, formatMoney, minutesToLabel } from '@/lib/utils'
import { extractApiError } from '@/services/api'
import type { AvailabilityStatus } from '@/types'

export function ArtistProfilePage() {
  const { refreshUser } = useAuth()
  const queryClient = useQueryClient()

  const { data: artist, isLoading } = useQuery({
    queryKey: ['my-artist'],
    queryFn: async () => (await artistsApi.getMy()).data,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await artistsApi.categories()).data,
  })

  const [form, setForm] = useState<Record<string, string> | null>(null)
  const [styles, setStyles] = useState<string[]>([])
  const [specialties, setSpecialties] = useState<string[]>([])

  if (artist && form === null) {
    setForm({
      artistType: artist.artistType,
      name: artist.name,
      artisticName: artist.artisticName,
      categoryId: artist.categoryId,
      city: artist.city,
      state: artist.state,
      phone: artist.phone,
      description: artist.description,
      profilePhotoUrl: artist.profilePhotoUrl ?? '',
    })
    setStyles(artist.styles)
    setSpecialties(artist.specialties)
  }

  const save = useMutation({
    mutationFn: async () => {
      const f = form!
      const payload = {
        artistType: f.artistType,
        name: f.name,
        artisticName: f.artisticName,
        categoryId: f.categoryId,
        city: f.city,
        state: f.state,
        phone: f.phone,
        profilePhotoUrl: f.profilePhotoUrl || null,
        description: f.description,
        styles,
        specialties,
        galleryUrls: artist?.galleryUrls ?? [],
        videoUrls: artist?.videoUrls ?? [],
      }
      await artistsApi.saveOnboarding(payload as never)
    },
    onSuccess: async () => {
      toast.success('Perfil salvo!')
      queryClient.invalidateQueries({ queryKey: ['my-artist'] })
      await refreshUser()
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const publish = useMutation({
    mutationFn: (value: boolean) => artistsApi.publish(value),
    onSuccess: async () => {
      toast.success('Status do perfil atualizado!')
      queryClient.invalidateQueries({ queryKey: ['my-artist'] })
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const uploadPhoto = useMutation({
    mutationFn: async (file: File) => (await uploadsApi.upload(file)).data.url,
    onSuccess: (url) => {
      setForm({ ...form!, profilePhotoUrl: url })
      toast.success('Foto enviada! Salve o perfil para aplicar.')
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  if (isLoading || !artist || !form) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Carregando perfil...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground">Dados do perfil público em /artistas/{artist.slug || '<slug>'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={artist.isPublished ? 'success' : 'secondary'}>
            {artist.isPublished ? 'Publicado' : 'Rascunho'}
          </Badge>
          <Button
            variant={artist.isPublished ? 'outline' : 'default'}
            onClick={() => publish.mutate(!artist.isPublished)}
            disabled={publish.isPending}
          >
            {artist.isPublished ? 'Despublicar' : 'Publicar perfil'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do artista</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {form.profilePhotoUrl && (
              <img src={form.profilePhotoUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
            )}
            <div>
              <Label>Foto de perfil</Label>
              <Input
                type="file"
                accept="image/*"
                className="mt-1 w-64"
                onChange={(e) => e.target.files?.[0] && uploadPhoto.mutate(e.target.files[0])}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.artistType} onValueChange={(v) => setForm({ ...form, artistType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Solo">Solo</SelectItem>
                  <SelectItem value="Band">Banda/Grupo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Nome artístico</Label>
              <Input value={form.artisticName} onChange={(e) => setForm({ ...form, artisticName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>UF</Label>
              <Input maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <TagListEditor label="Estilos" values={styles} onChange={setStyles} />
          <TagListEditor label="Especialidades" values={specialties} onChange={setSpecialties} />
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Salvando...' : 'Salvar perfil'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <FeesCard artistId={artist.id} />
        <AvailabilityCard />
      </div>
    </div>
  )
}

function TagListEditor({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('')
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {values.map((value) => (
          <Badge key={value} variant="secondary" className="gap-1">
            {value}
            <button className="text-muted-foreground hover:text-destructive" onClick={() => onChange(values.filter((v) => v !== value))}>
              <Trash2 className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          className="h-8 w-40"
          placeholder="Adicionar..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim()) {
              e.preventDefault()
              onChange([...values, input.trim()])
              setInput('')
            }
          }}
        />
      </div>
    </div>
  )
}

function FeesCard({ artistId }: { artistId: string }) {
  const queryClient = useQueryClient()
  const { data: fees = [] } = useQuery({
    queryKey: ['fees', artistId],
    queryFn: async () => (await feesApi.listByArtist(artistId)).data,
  })

  const [duration, setDuration] = useState('60')
  const [price, setPrice] = useState('')

  const create = useMutation({
    mutationFn: () => feesApi.create({ durationMinutes: Number(duration), price: Number(price.replace(',', '.')) }),
    onSuccess: () => {
      toast.success('Faixa de cachê criada!')
      setPrice('')
      queryClient.invalidateQueries({ queryKey: ['fees', artistId] })
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const remove = useMutation({
    mutationFn: (id: string) => feesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fees', artistId] }),
    onError: (e) => toast.error(extractApiError(e)),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cachês (faixas públicas)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {fees.map((fee) => (
          <div key={fee.id} className="flex items-center justify-between rounded-md border p-2.5 text-sm">
            <span>
              {minutesToLabel(fee.durationMinutes)} — <strong>{formatMoney(fee.price)}</strong>
            </span>
            <Button variant="ghost" size="icon" onClick={() => remove.mutate(fee.id)}>
              <Trash2 className="text-destructive" />
            </Button>
          </div>
        ))}
        {fees.length === 0 && <p className="text-sm text-muted-foreground">Ex.: 1h = R$100, 2h = R$180...</p>}
        <div className="flex gap-2">
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="60">1h</SelectItem>
              <SelectItem value="90">1h30</SelectItem>
              <SelectItem value="120">2h</SelectItem>
              <SelectItem value="180">3h</SelectItem>
              <SelectItem value="240">4h</SelectItem>
            </SelectContent>
          </Select>
          <Input className="flex-1" placeholder="Preço (R$)" value={price} onChange={(e) => setPrice(e.target.value)} />
          <Button type="button" size="icon" onClick={() => price && create.mutate()}>
            <Plus />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Valor público de referência — o final é definido pela proposta.</p>
      </CardContent>
    </Card>
  )
}

function AvailabilityCard() {
  const queryClient = useQueryClient()

  // lista simples: recarrega por artistId via endpoint público
  const { data: availabilities = [] } = useQuery({
    queryKey: ['availabilities'],
    queryFn: async () => {
      const artist = (await artistsApi.getMy()).data
      return (await availabilityApi.listByArtist(artist.id)).data
    },
  })

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [start, setStart] = useState('18:00')
  const [end, setEnd] = useState('23:00')
  const [status, setStatus] = useState<AvailabilityStatus>('Available')

  const create = useMutation({
    mutationFn: () =>
      availabilityApi.create({
        date,
        startTime: `${start}:00`,
        endTime: `${end}:00`,
        isAllDay: false,
        status,
      }),
    onSuccess: () => {
      toast.success('Disponibilidade criada!')
      queryClient.invalidateQueries({ queryKey: ['availabilities'] })
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  const remove = useMutation({
    mutationFn: (id: string) => availabilityApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['availabilities'] }),
    onError: (e) => toast.error(extractApiError(e)),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disponibilidade</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {availabilities.slice(0, 12).map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs">
              <span>{formatDate(a.date)}</span>
              <span className="text-muted-foreground">{a.isAllDay ? 'Dia todo' : `${a.startTime.slice(0, 5)}–${a.endTime.slice(0, 5)}`}</span>
              <Badge variant={a.status === 'Available' ? 'success' : a.status === 'PreReserved' ? 'warning' : 'muted'}>
                {availabilityStatusLabel[a.status]}
              </Badge>
              <button className="text-muted-foreground hover:text-destructive" onClick={() => remove.mutate(a.id)}>
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {availabilities.length === 0 && (
            <p className="text-sm text-muted-foreground">Cadastre intervalos disponíveis ou bloqueios por dia.</p>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label className="text-xs">Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-36" />
          </div>
          <div>
            <Label className="text-xs">Início</Label>
            <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-28" />
          </div>
          <div>
            <Label className="text-xs">Fim</Label>
            <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="w-28" />
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AvailabilityStatus)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(availabilityStatusLabel).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={() => create.mutate()} disabled={create.isPending}>
            <Plus /> Adicionar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
