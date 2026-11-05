import { useEffect, useMemo, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Seleção múltipla em chips: opções predefinidas que ligam/desligam ao clicar
 * + campo livre inline para adicionar valores próprios (ex.: estilos e tipos de
 * evento do artista). Valores próprios continuam na lista mesmo desmarcados.
 */
export function ChipMultiSelect({
  options,
  selected,
  onChange,
  addLabel = 'Adicionar outro',
  placeholder = 'Digite e pressione Enter',
}: {
  options: string[]
  selected: string[]
  onChange: (values: string[]) => void
  addLabel?: string
  placeholder?: string
}) {
  const [customValues, setCustomValues] = useState<string[]>([])
  const [custom, setCustom] = useState('')

  // Valores próprios ficam na lista mesmo quando desmarcados — e os que vieram
  // do perfil salvo também aparecem como chips.
  const valores = useMemo(() => {
    const custom = [...new Set([
      ...customValues,
      ...selected.filter((s) => !options.some((o) => o.toLowerCase() === s.toLowerCase())),
    ])].filter((s) => s !== 'Outro')
    return [...options.filter((o) => o !== 'Outro'), ...custom]
  }, [options, selected, customValues])

  // Valores próprios que chegaram depois (ex.: carregados do perfil) entram na lista.
  useEffect(() => {
    const novos = selected.filter(
      (s) =>
        s !== 'Outro' &&
        !options.some((o) => o.toLowerCase() === s.toLowerCase()) &&
        !customValues.some((cv) => cv.toLowerCase() === s.toLowerCase())
    )
    if (novos.length > 0) setCustomValues((cv) => [...cv, ...novos])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, options, customValues])

  const addCustom = () => {
    const value = custom.trim()
    if (
      value &&
      !valores.some((v) => v.toLowerCase() === value.toLowerCase())
    ) {
      setCustomValues((cv) => [...cv, value])
      onChange([...selected, value])
    }
    setCustom('')
  }

  const toggle = (option: string) =>
    onChange(selected.includes(option) ? selected.filter((s) => s !== option) : [...selected, option])

  return (
    <div className="flex flex-wrap items-center gap-2">
      {valores.map((option) => {
        const active = selected.includes(option)
        return (
          <span
            key={option}
            className={cn(
              'relative rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-background text-foreground hover:bg-accent',
              !active && customValues.some((cv) => cv.toLowerCase() === option.toLowerCase()) && 'border-dashed'
            )}
          >
            <button
              type="button"
              className="absolute inset-0 opacity-0"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                toggle(option)
              }}
              aria-label={active ? `Desmarcar ${option}` : `Marcar ${option}`}
            />
            {active && <Check className="mr-1 inline h-3.5 w-3.5" />}
            {option}
          </span>
        )
      })}
      <div className="flex items-center gap-1.5">
        <Input
          className="h-8 w-44"
          placeholder={placeholder}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addCustom()
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" className="h-8" onClick={addCustom}>
          <Plus /> {addLabel}
        </Button>
      </div>
    </div>
  )
}
