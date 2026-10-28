import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'

/** Alterna entre tema claro e escuro (preferência salva no navegador). */
export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  )
}
