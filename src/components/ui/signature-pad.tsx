import { useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Assinatura desenhada em canvas (mouse/toque) — devolve PNG em data URL.
 * Vazio = sem traços ainda (isValid expõe isso para validação).
 */
export function SignaturePad({
  onChange,
}: {
  onChange: (dataUrl: string | null) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const hasInk = useRef(false)
  const [empty, setEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Resolve o blur do devicePixelRatio sem esticar o desenho
    const ratio = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(ratio, ratio)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)
    ctx.strokeStyle = '#1f2937'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    drawing.current = true
    hasInk.current = true
    const { x, y } = pos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = pos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const finish = () => {
    if (!drawing.current) return
    drawing.current = false
    const dataUrl = canvasRef.current?.toDataURL('image/png') ?? null
    setEmpty(false)
    onChange(dataUrl)
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    hasInk.current = false
    setEmpty(true)
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="h-36 w-full touch-none rounded-lg border border-dashed bg-white"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerLeave={finish}
        />
        {empty && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            Desenhe sua assinatura aqui
          </p>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-xs ${empty ? 'text-destructive' : 'text-emerald-600'}`}>
          {empty ? 'Assinatura obrigatória' : 'Assinatura capturada'}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={clear}>
          <Eraser /> Limpar
        </Button>
      </div>
    </div>
  )
}
