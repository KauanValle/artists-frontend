import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon?: ReactNode
  hint?: string
  /** Cor de fundo do ícone. Default: bg-primary/10 */
  iconBg?: string
  /** Cor do ícone. Default: text-primary */
  iconColor?: string
  /** Tendência: 'up' | 'down' | undefined */
  trend?: 'up' | 'down'
  trendLabel?: string
}

export function StatCard({ title, value, icon, hint, iconBg, iconColor }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon && (
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              iconBg ?? 'bg-primary/10'
            )}
          >
            <span className={cn('[&>svg]:h-5 [&>svg]:w-5', iconColor ?? 'text-primary')}>{icon}</span>
          </div>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
