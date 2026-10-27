import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Seleção múltipla em chips: opções predefinidas que ligam/desligam ao clicar
 * + campo livre para adicionar valores próprios (ex.: estilos e tipos de evento do artista).
 */
export function ChipMultiSelect({
  options,
  selected,
  onChange,
  addLabel = 'Adicionar outro',
}: {
  options: string[]
  selected: string[]
  onChange: (values: string[]) => void
  addLabel?: string
}) {
  const [custom, setCustom] = useState('')

  const addCustom = () => {
    const value = custom.trim()
    if (value && !selected.some((s) => s.toLowerCase() === value.toLowerCase())) {
      onChange([...selected, value])
    }
    setCustom('')
  }

  const toggle = (option: string) =>
    onChange(selected.includes(option) ? selected.filter((s) => s !== option) : [...selected, option])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option)
          return (
            <button
              key={option}
              type="button"
              onClick={(e) => {
                // Blindagem: o componente pode ser usado dentro de formulários —
                // selecionar um chip jamais deve submeter nada.
                e.preventDefault()
                e.stopPropagation()
                toggle(option)
              }}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-background text-foreground hover:bg-accent'
              )}
            >
              {active && <Check className="mr-1 inline h-3.5 w-3.5" />}
              {option}
            </button>
          )
        })}
      </div>
      <div className="flex gap-2">
        <Input
          className="h-9 w-60"
          placeholder={addLabel}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addCustom()
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" className="h-9" onClick={addCustom}>
          <Plus /> Adicionar
        </Button>
      </div>
    </div>
  )
}
