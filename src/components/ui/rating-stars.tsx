import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function RatingStars({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn('h-4 w-4', i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40')}
        />
      ))}
    </div>
  )
}

/// <summary>Input de estrelas 0–5: clique define a nota; zero = sem nota.</summary>
export function StarRatingInput({
  value,
  onChange,
  size = 'md',
}: {
  value: number
  onChange: (v: number) => void
  size?: 'sm' | 'md' | 'lg'
}) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  const sizeClass = size === 'lg' ? 'h-8 w-8' : size === 'sm' ? 'h-5 w-5' : 'h-7 w-7'
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Nota em estrelas">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} estrela${i > 1 ? 's' : ''}`}
          className="rounded-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
        >
          <Star
            className={cn(sizeClass, i <= shown ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40')}
          />
        </button>
      ))}
      {value > 0 && <span className="ml-1 text-sm font-medium text-muted-foreground">{value}/5</span>}
    </div>
  )
}
