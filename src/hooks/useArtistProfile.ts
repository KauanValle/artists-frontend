import { useQuery } from '@tanstack/react-query'
import { artistsApi } from '@/services'
import type { Artist } from '@/types'

/** Campos do perfil de artista exigidos pelo back-end (salvar/publicar e NOT NULL no banco). */
export const requiredProfileFields = [
  { key: 'name', label: 'Nome' },
  { key: 'artisticName', label: 'Nome artístico' },
  { key: 'categoryId', label: 'Categoria' },
  { key: 'city', label: 'Cidade' },
  { key: 'state', label: 'UF' },
  { key: 'phone', label: 'Telefone' },
  { key: 'description', label: 'Descrição' },
] as const

export type ProfileFieldKey = (typeof requiredProfileFields)[number]['key']

/** Campos obrigatórios ainda em branco no perfil do artista. */
export function getMissingProfileFields(artist: Artist | undefined | null) {
  if (!artist) return []
  return requiredProfileFields.filter((f) => !(artist[f.key] ?? '').trim())
}

/** Perfil do artista logado — mesma chave de cache usada pela página Meu Perfil. */
export function useMyArtist(enabled = true) {
  return useQuery({
    queryKey: ['my-artist'],
    queryFn: async () => (await artistsApi.getMy()).data,
    enabled,
  })
}
