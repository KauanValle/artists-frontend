import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  icon: ReactNode
  title: string
  subtitle?: string
  action?: ReactNode
  /** Cor base do gradiente do banner. Default: primary */
  gradient?: string
}

export function PageHeader({ icon, title, subtitle, action, gradient }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br px-6 py-8 sm:px-8 sm:py-10',
        gradient ?? 'from-primary to-primary/60'
      )}
    >
      {/* Decorative circles */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm shadow-lg sm:h-16 sm:w-16">
            <span className="text-white [&>svg]:h-7 [&>svg]:w-7 sm:[&>svg]:h-8 sm:[&>svg]:w-8">{icon}</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-white/70">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
    </div>
  )
}
