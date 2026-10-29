import { Info } from 'lucide-react'

/** Ícone de informação com texto explicativo no hover/foco. */
export function InfoTooltip({ text }: { text: string }) {
  return (
    <span
      tabIndex={0}
      title={text}
      aria-label={text}
      className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-accent"
    >
      <Info className="h-3 w-3" />
    </span>
  )
}
