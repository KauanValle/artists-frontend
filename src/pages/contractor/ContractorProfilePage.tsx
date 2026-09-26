import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { contractorsApi } from '@/services'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { extractApiError } from '@/services/api'
import type { ContractorType } from '@/types'

export function ContractorProfilePage() {
  const queryClient = useQueryClient()

  const { data: contractor, isLoading } = useQuery({
    queryKey: ['my-contractor'],
    queryFn: async () => (await contractorsApi.getMy()).data,
  })

  const [form, setForm] = useState<Record<string, string> | null>(null)

  if (contractor && form === null) {
    setForm({
      type: contractor.type,
      name: contractor.name,
      companyName: contractor.companyName ?? '',
      phone: contractor.phone,
      city: contractor.city,
      state: contractor.state,
    })
  }

  const save = useMutation({
    mutationFn: () =>
      contractorsApi.updateMy({
        type: (form!.type as ContractorType) ?? 'Person',
        name: form!.name,
        companyName: form!.companyName || null,
        phone: form!.phone,
        city: form!.city,
        state: form!.state,
      }),
    onSuccess: () => {
      toast.success('Perfil salvo!')
      queryClient.invalidateQueries({ queryKey: ['my-contractor'] })
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  if (isLoading || !contractor || !form) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meu perfil</h1>
        <p className="text-sm text-muted-foreground">Dados do contratante</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Person">Pessoa física</SelectItem>
                  <SelectItem value="Company">Empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            {form.type === 'Company' && (
              <div className="space-y-1.5">
                <Label>Razão social</Label>
                <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>UF</Label>
              <Input maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
