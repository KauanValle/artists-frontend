import { useId, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { brandingApi, uploadsApi } from '@/services'
import { extractApiError } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

/**
 * Símbolo da reprissa: "R" angular com gradiente violeta (fundo transparente).
 * Acompanha a identidade: faixa superior, triângulo play e cauda diagonal.
 */
export function BrandLogo({ className }: { className?: string }) {
  const gradientId = useId()

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="55%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#5B21B6" />
        </linearGradient>
      </defs>
      {/* faixa superior (bowl do R) */}
      <path d="M2 10 L56 3 L70 20 L42 44 L2 32 Z" fill={`url(#${gradientId})`} />
      {/* triângulo play (perna) */}
      <path d="M2 38 L40 60 L2 82 Z" fill={`url(#${gradientId})`} />
      {/* cauda diagonal */}
      <path d="M36 40 L66 26 L94 94 L62 86 Z" fill={`url(#${gradientId})`} />
    </svg>
  )
}

/** Ícone/app: símbolo sobre quadrado escuro arredondado (como o favicon). */
export function BrandAppIcon({ className }: { className?: string }) {
  const gradientId = useId()

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="55%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#5B21B6" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="24" fill="#0D0D12" />
      <path d="M8 16 L52 10 L64 24 L40 44 L8 34 Z" fill={`url(#${gradientId})`} />
      <path d="M8 40 L36 58 L8 78 Z" fill={`url(#${gradientId})`} />
      <path d="M32 42 L60 30 L88 88 L60 82 Z" fill={`url(#${gradientId})`} />
    </svg>
  )
}

/**
 * Logotipo completo: símbolo + nome reprissa.
 * Se houver logo personalizada (enviada pelo admin), exibe a imagem no lugar do símbolo.
 * Admin: passa o mouse sobre a logo para trocar (upload direto).
 */
export function BrandMark({ className }: { className?: string }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'

  return (
    <span className={cn('flex items-center gap-2', className)}>
      <BrandLogoWithUpload />
      <span className="text-2xl font-extrabold tracking-tight">Reprissa</span>
    </span>
  )
}

function BrandLogoWithUpload() {
  const fileRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'
  const queryClient = useQueryClient()

  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: async () => (await brandingApi.get()).data,
    staleTime: 60_000,
  })

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const uploaded = (await uploadsApi.upload(file)).data
      return (await brandingApi.uploadLogo(file)).data
    },
    onSuccess: (dto) => {
      queryClient.setQueryData(['branding'], dto)
      toast.success('Logo atualizada!')
    },
    onError: (e) => toast.error(extractApiError(e)),
  })

  return (
    <span className="relative inline-flex">
      {branding?.logoUrl ? (
        <img src={branding.logoUrl} alt="reprissa" className="h-9 w-auto max-w-44 object-contain" />
      ) : (
        <BrandLogo className="h-9 w-9" />
      )}

      {isAdmin && (
        <>
          <button
            type="button"
            title="Trocar logo"
            onClick={() => fileRef.current?.click()}
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:text-foreground"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) upload.mutate(file)
              e.target.value = ''
            }}
          />
        </>
      )}
    </span>
  )
}


