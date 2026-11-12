import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Percent } from 'lucide-react'
import { toast } from 'sonner'
import { brandingApi } from '@/services'
import { extractApiError } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Taxa administrativa descontada do artista no saque do cachê
 * (configuração global da plataforma, em % — aplica-se aos próximos checkouts).
 */
export function TaxaAdministrativaCard() {
  const queryClient = useQueryClient()
  const [percentual, setPercentual] = useState('')

  const { data: taxa } = useQuery({
    queryKey: ['admin-taxa'],
    queryFn: async () => (await brandingApi.getTaxaAdministrativa()).data,
  })

  useEffect(() => {
    if (taxa) setPercentual(String(taxa.percentual))
  }, [taxa])

  const save = useMutation({
    mutationFn: async () => (await brandingApi.saveTaxaAdministrativa(Number(percentual.replace(',', '.')))).data,
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-taxa'], data)
      queryClient.invalidateQueries({ queryKey: ['branding'] })
      toast.success(`Taxa administrativa definida em ${data.percentual}%. Será descontada do artista nos próximos saques.`)
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-4 w-4" /> Taxa administrativa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="taxa-admin">Percentual descontado do artista no saque</Label>
            <div className="relative">
              <Input
                id="taxa-admin"
                value={percentual}
                onChange={(e) => setPercentual(e.target.value)}
                placeholder="5"
                className="w-28 pr-7"
                inputMode="decimal"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="mb-0.5">
            {save.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Cobrada do contratante a crido do valor do show no checkout do InfinityPay (ex.: show de R$ 100
          com 5% = R$ 105). Aplica-se aos próximos pagamentos — os já gerados mantêm o valor do momento do
          checkout.
        </p>
      </CardContent>
    </Card>
  )
}
