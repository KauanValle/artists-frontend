import { cn } from '@/lib/utils'

export function Avatar({
  src,
  alt,
  className,
  fallback,
}: {
  src?: string | null
  alt?: string
  className?: string
  fallback?: string
}) {
  return (
    <div
      className={cn(
        'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-secondary',
        className
      )}
    >
      {src ? (
        <img src={src} alt={alt ?? ''} className="aspect-square h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-medium text-muted-foreground">
          {fallback ?? (alt?.[0]?.toUpperCase() ?? '?')}
        </div>
      )}
    </div>
  )
}
