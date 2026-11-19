import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ticket } from 'lucide-react'
import { toast } from 'sonner'
import { brandingApi } from '@/services'
import { extractApiError } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Taxa administrativa aplicada sobre o valor do ingresso (embutida no preço pago pelo comprador).
 * Configuração global da plataforma — aplica-se aos próximos cadastros de ingressos.
 */
export function TaxaIngressosCard() {
  const queryClient = useQueryClient()
  const [percentual, setPercentual] = useState('')

  const { data: taxa } = useQuery({
    queryKey: ['admin-taxa-ingressos'],
    queryFn: async () => (await brandingApi.getTaxaIngressos()).data,
  })

  useEffect(() => {
    if (taxa) setPercentual(String(taxa.percentual))
  }, [taxa])

  const save = useMutation({
    mutationFn: async () => (await brandingApi.saveTaxaIngressos(Number(percentual.replace(',', '.')))).data,
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-taxa-ingressos'], data)
      toast.success(`Taxa de ingressos definida em ${data.percentual}%. Será aplicada nos próximos ingressos cadastrados.`)
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-4 w-4" /> Taxa administrativa — Ingressos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="taxa-ingressos">Percentual aplicado sobre o valor do ingresso</Label>
            <div className="relative">
              <Input
                id="taxa-ingressos"
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
          Acrescida ao valor que o produtor quer receber, formando o preço final pago pelo comprador
          (ex.: ingresso de R$ 50 com taxa de 10% = R$ 55 para o comprador). Aplica-se somente aos
          novos ingressos — os já cadastrados mantêm a taxa do momento do cadastro.
        </p>
      </CardContent>
    </Card>
  )
}
