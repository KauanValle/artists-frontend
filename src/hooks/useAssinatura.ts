import { useQuery } from '@tanstack/react-query'
import { brandingApi } from '@/services'

/**
 * Feature flag (AppSettings → /api/branding): assinatura obrigatória ligada?
 * Enquanto desligada (padrão), contas gratuitas têm acesso livre — os gates
 * de assinante do app ficam inativos.
 */
export function useAssinaturaObrigatoria() {
  const { data } = useQuery({
    queryKey: ['branding'],
    queryFn: async () => (await brandingApi.get()).data,
    staleTime: 60_000,
  })
  return data?.assinaturaObrigatoria ?? false
}
